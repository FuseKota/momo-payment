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
  sendAdminNewOrderEmail,
  sendOrderCancellationEmail,
} from '@/lib/email/resend';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { checkWebhookRateLimit, getClientIP } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 0. IP レート制限（署名検証より前に不正リクエストを安価に弾く）
  const ip = getClientIP(request);
  const rateLimit = await checkWebhookRateLimit(ip);
  if (!rateLimit.allowed) {
    secureLog('warn', 'Webhook rate limit exceeded', { ip });
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.resetIn) },
    });
  }

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

  // 冪等レコードは「受信時」に挿入しているため、後続処理がリトライ可能な失敗をした場合は
  // この行を取り消す。そうしないと Stripe が再送しても重複チェックに弾かれ、
  // 「決済成立済みなのに注文が PENDING_PAYMENT のまま詰まる」状態が回復できなくなる。
  const releaseEventForRetry = async () => {
    await supabaseAdmin
      .from('stripe_webhook_events')
      .delete()
      .eq('event_id', event.id);
  };

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
        // 楽観的ロック: PENDING_PAYMENT の注文のみキャンセル。
        // 到着順序の乱れた expired イベントが PAID/FULFILLED の注文を
        // 誤って CANCELED に上書きするのを防ぐ。
        // .select() の結果が空＝既に PAID 等へ遷移済みなので、その場合は通知も送らない。
        const { data: canceledOrder } = await supabaseAdmin
          .from('orders')
          .update({ status: 'CANCELED' })
          .eq('id', expiredPayment.order_id)
          .eq('status', 'PENDING_PAYMENT')
          .select('order_no, customer_name, customer_email, locale')
          .maybeSingle();

        if (canceledOrder) {
          secureLog('warn', `Stripe webhook: order ${expiredPayment.order_id} cancelled due to session expiry`);

          // キャンセル通知メール（顧客）
          if (canceledOrder.customer_email) {
            try {
              await sendOrderCancellationEmail({
                orderNo: canceledOrder.order_no,
                customerName: canceledOrder.customer_name,
                customerEmail: canceledOrder.customer_email,
                locale: canceledOrder.locale || 'ja',
              });
            } catch (emailError) {
              secureLog('error', 'Stripe webhook: failed to send cancellation email', safeErrorLog(emailError));
            }
          }
        }
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

  const { sessionId, paymentIntentId, amountTotal, paymentStatus, currency } = sessionInfo;

  // 7. paymentsテーブルからinternal orderを特定
  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, order_id, amount_yen')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    secureLog('error', 'Stripe webhook: payment row not found', paymentError ? safeErrorLog(paymentError) : undefined);
    // 注文作成直後の競合等で payment 行がまだ無い可能性 → Stripe の再送で回復させる
    await releaseEventForRetry();
    return new NextResponse('Payment not found', { status: 500 });
  }

  // 7.5 金額・支払いステータス検証（多層防御の最後の砦）
  //   - Stripeが報告した実支払額(amount_total)とDBの請求額(amount_yen)を突合し、
  //     改ざん・部分支払い・通貨不一致でPAIDに遷移しないようにする。
  //   - JPYはzero-decimal通貨のためamount_totalは円単位そのまま。
  if (paymentStatus !== 'paid') {
    secureLog('warn', 'Stripe webhook: payment_status is not paid, skipping PAID transition', {
      orderId: paymentRow.order_id,
      paymentStatus: paymentStatus ?? 'null',
    });
    return NextResponse.json({ ok: true, message: 'payment not completed' });
  }

  const currencyValid = currency?.toLowerCase() === 'jpy';
  if (amountTotal === null || amountTotal !== paymentRow.amount_yen || !currencyValid) {
    secureLog('error', 'Stripe webhook: amount/currency mismatch — manual review required', {
      orderId: paymentRow.order_id,
      expectedYen: paymentRow.amount_yen,
      actualAmount: amountTotal ?? 'null',
      currency: currency ?? 'null',
    });
    // 注文はPENDING_PAYMENTのまま残し、管理者の手動確認に委ねる（自動でPAIDにしない）
    return NextResponse.json({ ok: true, message: 'amount mismatch, manual review required' });
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
    // 一時的なDBエラーの可能性 → 冪等レコードを取り消して Stripe に再送させる
    secureLog('error', 'Stripe webhook: failed to update payment', safeErrorLog(updatePaymentError));
    await releaseEventForRetry();
    return new NextResponse('Database error', { status: 500 });
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
    // PGRST116 = 対象行なし。既に PAID 等へ遷移済み（並行処理 or 再送）→ 正常終了
    if (updateOrderError.code === 'PGRST116') {
      secureLog('warn', 'Stripe webhook: order not in PENDING_PAYMENT, already processed', {
        orderId: paymentRow.order_id,
      });
      return NextResponse.json({ ok: true, message: 'order already processed' });
    }
    // それ以外は一時的なDBエラーの可能性 → 冪等レコードを取り消して再送させる
    secureLog('error', 'Stripe webhook: failed to update order', safeErrorLog(updateOrderError));
    await releaseEventForRetry();
    return new NextResponse('Database error', { status: 500 });
  }

  secureLog('info', `Stripe webhook: order ${paymentRow.order_id} marked as PAID`);

  // 9.5 在庫減算 — PENDING_PAYMENT→PAID に実際に遷移したこの1回だけ実行されるため冪等。
  //   variant_id を持つ（在庫管理対象の）明細のみ対象。失敗しても決済は成立済みなので
  //   ログのみで継続し、200を返す（在庫整合は管理者の手動確認に委ねる）。
  if (orderData?.order_items) {
    for (const item of orderData.order_items as Array<{ variant_id: string | null; qty: number }>) {
      if (item.variant_id) {
        const { error: stockError } = await supabaseAdmin.rpc('decrement_variant_stock', {
          p_variant_id: item.variant_id,
          p_qty: item.qty,
        });
        if (stockError) {
          secureLog('error', 'Stripe webhook: failed to decrement stock', safeErrorLog(stockError));
        }
      }
    }
  }

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
            deliveryDate: orderData.delivery_date ?? undefined,
            deliveryTimeSlot: orderData.delivery_time_slot ?? undefined,
            locale: orderLocale,
          });
        }

        // 管理者向け新規注文通知（配送・決済確定）
        await sendAdminNewOrderEmail({
          orderId: orderData.id,
          orderNo: orderData.order_no,
          orderType: 'SHIPPING',
          paymentMethod: 'STRIPE',
          customerName: orderData.customer_name,
          customerPhone: orderData.customer_phone,
          customerEmail: orderData.customer_email,
          items: orderData.order_items.map(
            (item: {
              product_name: string;
              qty: number;
              unit_price_yen: number;
              line_total_yen: number;
            }) => ({
              name: item.product_name,
              qty: item.qty,
              subtotal: item.line_total_yen,
            })
          ),
          total: orderData.total_yen,
          shippingAddress: addressData
            ? {
                postalCode: addressData.postal_code,
                prefecture: addressData.pref,
                city: addressData.city,
                address1: addressData.address1,
                address2: addressData.address2,
              }
            : undefined,
          deliveryDate: orderData.delivery_date ?? undefined,
          deliveryTimeSlot: orderData.delivery_time_slot ?? undefined,
        });
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

        // 管理者向け新規注文通知（店頭受取・決済確定）
        await sendAdminNewOrderEmail({
          orderId: orderData.id,
          orderNo: orderData.order_no,
          orderType: 'PICKUP',
          paymentMethod: 'STRIPE',
          customerName: orderData.customer_name,
          customerPhone: orderData.customer_phone,
          customerEmail: orderData.customer_email,
          items: orderData.order_items.map(
            (item: {
              product_name: string;
              qty: number;
              unit_price_yen: number;
              line_total_yen: number;
            }) => ({
              name: item.product_name,
              qty: item.qty,
              subtotal: item.line_total_yen,
            })
          ),
          total: orderData.total_yen,
          pickupDate: orderData.pickup_date,
          pickupTime: orderData.pickup_time,
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
