import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  verifySquareWebhookSignature,
  SquareWebhookPayload,
  isPaymentCompleted,
  extractPaymentInfo,
} from '@/lib/square/webhook';
import { squareClient, getSquareEnvironmentName } from '@/lib/square/client';
import { sendPaymentConfirmationEmail, sendOrderConfirmationEmail } from '@/lib/email/resend';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Raw bodyを取得（署名検証に必要）
  const rawBody = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature');

  // 2. 署名検証
  const isValid = verifySquareWebhookSignature({
    signatureHeader: signature,
    rawBody,
  });

  if (!isValid) {
    console.error('Square webhook: invalid signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 3. イベントをパース
  let event: SquareWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('Square webhook: invalid JSON');
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // 4. 冪等性チェック（同じevent_idは二度処理しない）
  const { error: insertError } = await supabaseAdmin
    .from('square_webhook_events')
    .insert({
      event_id: event.event_id,
      event_type: event.type,
      payload: event,
    });

  if (insertError) {
    // unique違反 = 既に処理済み
    if (insertError.message.includes('duplicate key')) {
      console.log('Square webhook: duplicate event, skipping');
      return NextResponse.json({ ok: true, message: 'already processed' });
    }
    console.error('Square webhook: insert error', insertError);
    // 他のエラーでも200を返す（Squareの無限再送を防ぐ）
  }

  // 5. payment.updated + COMPLETED 以外は無視
  if (!isPaymentCompleted(event)) {
    console.log(`Square webhook: ignoring event type ${event.type}`);
    return NextResponse.json({ ok: true, message: 'ignored' });
  }

  // 6. payment情報を抽出
  const { paymentId, orderId: squareOrderId } = extractPaymentInfo(event);

  if (!paymentId) {
    console.error('Square webhook: no payment_id in event');
    return NextResponse.json({ ok: true, message: 'no payment_id' });
  }

  // Square APIから最新の情報を取得（必要に応じて）
  let finalSquareOrderId = squareOrderId;
  if (!finalSquareOrderId) {
    try {
      const response = await squareClient.payments.get({ paymentId });
      finalSquareOrderId = response.payment?.orderId;
    } catch (err) {
      console.error('Square webhook: failed to get payment', err);
    }
  }

  if (!finalSquareOrderId) {
    console.error('Square webhook: no square_order_id');
    return NextResponse.json({ ok: true, message: 'no order_id' });
  }

  // 7. paymentsテーブルからinternal orderを特定
  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, order_id')
    .eq('square_order_id', finalSquareOrderId)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    console.error('Square webhook: payment row not found', paymentError);
    return NextResponse.json({ ok: true, message: 'payment not found' });
  }

  // 8. paymentsを更新
  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'SUCCEEDED',
      square_payment_id: paymentId,
      square_environment: getSquareEnvironmentName(),
      raw_webhook: event,
    })
    .eq('id', paymentRow.id);

  if (updatePaymentError) {
    console.error('Square webhook: failed to update payment', updatePaymentError);
  }

  // 9. ordersを更新（PAID）
  const { data: orderData, error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'PAID', paid_at: new Date().toISOString() })
    .eq('id', paymentRow.order_id)
    .select('*, order_items(*)')
    .single();

  if (updateOrderError) {
    console.error('Square webhook: failed to update order', updateOrderError);
  }

  console.log(`Square webhook: order ${paymentRow.order_id} marked as PAID`);

  // 10. メール通知を送信
  if (orderData && orderData.customer_email) {
    try {
      // 支払い確認メール
      await sendPaymentConfirmationEmail({
        orderNo: orderData.order_no,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        total: orderData.total_yen,
      });

      // shipping_addresses テーブルから住所を取得
      if (orderData.order_type === 'SHIPPING') {
        const { data: addressData } = await supabaseAdmin
          .from('shipping_addresses')
          .select('*')
          .eq('order_id', orderData.id)
          .single();

        if (addressData) {
          await sendOrderConfirmationEmail({
            orderNo: orderData.order_no,
            customerName: orderData.customer_name,
            customerEmail: orderData.customer_email,
            orderType: orderData.order_type,
            items: orderData.order_items.map((item: { product_name: string; qty: number; unit_price_yen: number; line_total_yen: number }) => ({
              name: item.product_name,
              qty: item.qty,
              unitPrice: item.unit_price_yen,
              subtotal: item.line_total_yen,
            })),
            subtotal: orderData.subtotal_yen,
            shippingFee: orderData.shipping_fee_yen,
            total: orderData.total_yen,
            shippingAddress: {
              postalCode: addressData.postal_code,
              prefecture: addressData.pref,
              city: addressData.city,
              address1: addressData.address1,
              address2: addressData.address2,
            },
          });
        }
      } else {
        await sendOrderConfirmationEmail({
          orderNo: orderData.order_no,
          customerName: orderData.customer_name,
          customerEmail: orderData.customer_email,
          orderType: orderData.order_type,
          items: orderData.order_items.map((item: { product_name: string; qty: number; unit_price_yen: number; line_total_yen: number }) => ({
            name: item.product_name,
            qty: item.qty,
            unitPrice: item.unit_price_yen,
            subtotal: item.line_total_yen,
          })),
          subtotal: orderData.subtotal_yen,
          shippingFee: orderData.shipping_fee_yen,
          total: orderData.total_yen,
          pickupDate: orderData.pickup_date,
          pickupTime: orderData.pickup_time,
        });
      }

      console.log(`Square webhook: sent confirmation emails to ${orderData.customer_email}`);
    } catch (emailError) {
      console.error('Square webhook: failed to send email', emailError);
      // メール送信失敗しても200を返す（決済処理自体は成功）
    }
  }

  return NextResponse.json({ ok: true });
}
