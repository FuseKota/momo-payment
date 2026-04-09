import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  verifyStripeWebhookSignature,
  isCheckoutSessionCompleted,
  isCheckoutSessionExpired,
  extractSessionInfo,
} from '@/lib/stripe/webhook';
import { getStripeEnvironmentName } from '@/lib/stripe/client';
import {
  sendPaymentConfirmationEmail,
  sendOrderConfirmationEmail,
} from '@/lib/email/resend';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

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
    secureLog('error', 'Stripe webhook: invalid signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 3. 冪等性チェック（同じevent_idは二度処理しない）
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existingEvent) {
    secureLog('warn', 'Stripe webhook: duplicate event, skipping', { eventId: event.id });
    return NextResponse.json({ ok: true, message: 'already processed' });
  }

  const { error: insertError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      payload: event,
    });

  if (insertError) {
    // 重複キーエラー（23505）は競合条件による重複処理→正常として扱う
    if (insertError.code === '23505') {
      secureLog('warn', 'Stripe webhook: duplicate event detected via DB constraint, skipping');
      return NextResponse.json({ ok: true, message: 'already processed' });
    }
    secureLog('error', 'Stripe webhook: insert error', safeErrorLog(insertError));
    return new NextResponse('Database error', { status: 500 });
  }

  // 4. checkout.session.expired: orderをCANCELEDに更新
  if (isCheckoutSessionExpired(event)) {
    const sessionInfo = extractSessionInfo(event);
    if (sessionInfo) {
      const { data: expiredPayment } = await supabaseAdmin
        .from('payments')
        .select('id, order_id')
        .eq('stripe_session_id', sessionInfo.sessionId)
        .maybeSingle();

      if (expiredPayment) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'CANCELED' })
          .eq('id', expiredPayment.order_id);

        secureLog('warn', `Stripe webhook: order ${expiredPayment.order_id} cancelled due to session expiry`);
      }
    }
    return NextResponse.json({ ok: true, message: 'session expired handled' });
  }

  // 5. checkout.session.completed 以外は無視
  if (!isCheckoutSessionCompleted(event)) {
    secureLog('info', `Stripe webhook: ignoring event type ${event.type}`);
    return NextResponse.json({ ok: true, message: 'ignored' });
  }

  // 6. セッション情報を抽出
  const sessionInfo = extractSessionInfo(event);
  if (!sessionInfo) {
    secureLog('error', 'Stripe webhook: no session info in event');
    return NextResponse.json({ ok: true, message: 'no session info' });
  }

  const { sessionId, paymentIntentId } = sessionInfo;

  // 7. paymentsテーブルからinternal orderを特定
  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, order_id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    secureLog('error', 'Stripe webhook: payment row not found', paymentError ? safeErrorLog(paymentError) : undefined);
    return new NextResponse('Payment not found', { status: 500 });
  }

  // 8. paymentsを更新
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
    secureLog('error', 'Stripe webhook: failed to update payment', safeErrorLog(updatePaymentError));
  }

  // 9. ordersを更新（PAID） — 楽観的ロック: PENDING_PAYMENTの注文のみ更新
  const { data: orderData, error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'PAID', paid_at: new Date().toISOString() })
    .eq('id', paymentRow.order_id)
    .eq('status', 'PENDING_PAYMENT')
    .select('*, order_items(*)')
    .single();

  if (updateOrderError) {
    secureLog('error', 'Stripe webhook: failed to update order', safeErrorLog(updateOrderError));
  }

  secureLog('info', `Stripe webhook: order ${paymentRow.order_id} marked as PAID`);

  // 10. メール通知を送信
  if (orderData && orderData.customer_email) {
    const orderLocale = orderData.locale || 'ja';
    try {
      // 支払い確認メール
      await sendPaymentConfirmationEmail({
        orderNo: orderData.order_no,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        total: orderData.total_yen,
        locale: orderLocale,
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
            locale: orderLocale,
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
          locale: orderLocale,
        });
      }

      secureLog('info', 'Stripe webhook: sent confirmation emails');
    } catch (emailError) {
      secureLog('error', 'Stripe webhook: failed to send email', safeErrorLog(emailError));
      // メール送信失敗しても200を返す（決済処理自体は成功）
    }
  }

  return NextResponse.json({ ok: true });
}
