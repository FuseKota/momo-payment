import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  verifyStripeWebhookSignature,
  isCheckoutSessionCompleted,
  extractSessionInfo,
} from '@/lib/stripe/webhook';
import { getStripeEnvironmentName } from '@/lib/stripe/client';
import {
  sendPaymentConfirmationEmail,
  sendOrderConfirmationEmail,
} from '@/lib/email/resend';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Raw bodyを取得（署名検証に必要）
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  // 2. 署名検証
  const event = verifyStripeWebhookSignature({
    signatureHeader: signature,
    rawBody,
  });

  if (!event) {
    console.error('Stripe webhook: invalid signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 3. 冪等性チェック（同じevent_idは二度処理しない）
  const { error: insertError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      payload: event,
    });

  if (insertError) {
    // unique違反 = 既に処理済み
    if (insertError.message.includes('duplicate key')) {
      console.log('Stripe webhook: duplicate event, skipping');
      return NextResponse.json({ ok: true, message: 'already processed' });
    }
    console.error('Stripe webhook: insert error', insertError);
    // 他のエラーでも200を返す（Stripeの無限再送を防ぐ）
  }

  // 4. checkout.session.completed 以外は無視
  if (!isCheckoutSessionCompleted(event)) {
    console.log(`Stripe webhook: ignoring event type ${event.type}`);
    return NextResponse.json({ ok: true, message: 'ignored' });
  }

  // 5. セッション情報を抽出
  const sessionInfo = extractSessionInfo(event);
  if (!sessionInfo) {
    console.error('Stripe webhook: no session info in event');
    return NextResponse.json({ ok: true, message: 'no session info' });
  }

  const { sessionId, paymentIntentId } = sessionInfo;

  // 6. paymentsテーブルからinternal orderを特定
  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, order_id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    console.error('Stripe webhook: payment row not found', paymentError);
    return NextResponse.json({ ok: true, message: 'payment not found' });
  }

  // 7. paymentsを更新
  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'SUCCEEDED',
      stripe_payment_intent_id: paymentIntentId,
      stripe_environment: getStripeEnvironmentName(),
      raw_webhook: event,
    })
    .eq('id', paymentRow.id);

  if (updatePaymentError) {
    console.error('Stripe webhook: failed to update payment', updatePaymentError);
  }

  // 8. ordersを更新（PAID）
  const { data: orderData, error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'PAID', paid_at: new Date().toISOString() })
    .eq('id', paymentRow.order_id)
    .select('*, order_items(*)')
    .single();

  if (updateOrderError) {
    console.error('Stripe webhook: failed to update order', updateOrderError);
  }

  console.log(`Stripe webhook: order ${paymentRow.order_id} marked as PAID`);

  // 9. メール通知を送信
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
            items: orderData.order_items.map(
              (item: {
                product_name: string;
                qty: number;
                unit_price_yen: number;
                line_total_yen: number;
              }) => ({
                name: item.product_name,
                qty: item.qty,
                unitPrice: item.unit_price_yen,
                subtotal: item.line_total_yen,
              })
            ),
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
          items: orderData.order_items.map(
            (item: {
              product_name: string;
              qty: number;
              unit_price_yen: number;
              line_total_yen: number;
            }) => ({
              name: item.product_name,
              qty: item.qty,
              unitPrice: item.unit_price_yen,
              subtotal: item.line_total_yen,
            })
          ),
          subtotal: orderData.subtotal_yen,
          shippingFee: orderData.shipping_fee_yen,
          total: orderData.total_yen,
          pickupDate: orderData.pickup_date,
          pickupTime: orderData.pickup_time,
        });
      }

      console.log(
        `Stripe webhook: sent confirmation emails to ${orderData.customer_email}`
      );
    } catch (emailError) {
      console.error('Stripe webhook: failed to send email', emailError);
      // メール送信失敗しても200を返す（決済処理自体は成功）
    }
  }

  return NextResponse.json({ ok: true });
}
