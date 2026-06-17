import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminRefundSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { sendRefundNotificationEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/logging/audit-log';
import { stripe } from '@/lib/stripe/client';

// 返金可能ステータス（入金済みで未返金）
const REFUNDABLE_STATUSES = ['PAID', 'PACKING', 'SHIPPED', 'FULFILLED'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id: orderId } = await params;
    const idParse = uuidSchema.safeParse(orderId);
    if (!idParse.success) {
      return NextResponse.json({ ok: false, error: 'Invalid order ID' }, { status: 400 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const parseResult = adminRefundSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_error', details: formatValidationErrors(parseResult.error) },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    // 注文を取得
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_method, order_no, customer_name, customer_email, total_yen, locale')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });
    }

    // payment を取得
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, status, stripe_payment_intent_id, refunded_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (paymentError) {
      secureLog('error', 'Refund: payment fetch error', safeErrorLog(paymentError));
      return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
    }

    // 冪等性: 既に返金済みなら 409
    if (order.status === 'REFUNDED' || payment?.refunded_at) {
      return NextResponse.json({ ok: false, error: 'already_refunded' }, { status: 409 });
    }

    // 状態チェック: 入金済みで未返金のみ返金可能
    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_status', currentStatus: order.status },
        { status: 400 }
      );
    }

    // 決済種別ごとの分岐
    let refundId: string | null = null;

    if (order.payment_method === 'SQUARE') {
      // レガシー Square は返金未対応
      return NextResponse.json({ ok: false, error: 'unsupported_payment_method' }, { status: 400 });
    }

    if (order.payment_method === 'PAY_AT_PICKUP') {
      // 店頭現金払い: Stripe を呼ばず手動で返金済みマーク（明示的な確認が必要）
      if (body.manualMark !== true) {
        return NextResponse.json({ ok: false, error: 'manual_mark_required' }, { status: 400 });
      }
      refundId = null;
    } else if (order.payment_method === 'STRIPE') {
      // オンライン決済: Stripe で全額返金
      if (!payment?.stripe_payment_intent_id) {
        return NextResponse.json({ ok: false, error: 'no_payment_intent' }, { status: 400 });
      }

      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: payment.stripe_payment_intent_id,
            metadata: {
              order_no: order.order_no,
              ...(body.reason ? { reason: body.reason } : {}),
            },
          },
          { idempotencyKey: `refund_${orderId}` }
        );
        refundId = refund.id;
      } catch (stripeError) {
        // Stripe 側で既に全額返金済みの場合は冪等に 409 へマップ
        const code =
          stripeError && typeof stripeError === 'object' && 'code' in stripeError
            ? (stripeError as { code?: string }).code
            : undefined;
        if (code === 'charge_already_refunded') {
          secureLog('warn', 'Refund: charge already refunded on Stripe', { orderId });
          return NextResponse.json({ ok: false, error: 'already_refunded' }, { status: 409 });
        }
        secureLog('error', 'Refund: Stripe refund failed', safeErrorLog(stripeError));
        return NextResponse.json({ ok: false, error: 'stripe_refund_failed' }, { status: 502 });
      }
    } else {
      return NextResponse.json({ ok: false, error: 'unsupported_payment_method' }, { status: 400 });
    }

    const refundedAt = new Date().toISOString();

    // orders を REFUNDED に更新（楽観的ロック: 現 status のままの行のみ更新）。
    // admin_note は潰さない。返金理由は監査ログ / Stripe metadata に記録済み。
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'REFUNDED', refunded_at: refundedAt })
      .eq('id', orderId)
      .eq('status', order.status)
      .select('id')
      .maybeSingle();

    if (updateError) {
      secureLog('error', 'Refund: order update error', safeErrorLog(updateError));
      return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
    }

    // 楽観的ロックで対象行なし＝並行処理で既に状態遷移済み → 返金済みとして扱う
    if (!updatedOrder) {
      return NextResponse.json({ ok: false, error: 'already_refunded' }, { status: 409 });
    }

    // payments を更新
    if (payment) {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({ status: 'REFUNDED', refunded_at: refundedAt, stripe_refund_id: refundId })
        .eq('id', payment.id);

      if (paymentUpdateError) {
        // 注文ステータスは確定済みのためログのみ（payments は補助情報）
        secureLog('error', 'Refund: payment update error', safeErrorLog(paymentUpdateError));
      }
    }

    // 返金通知メール — ステータス確定済みのため失敗してもログのみ
    if (order.customer_email) {
      try {
        await sendRefundNotificationEmail({
          orderNo: order.order_no,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          total: order.total_yen,
          locale: order.locale || 'ja',
        });
      } catch (emailError) {
        secureLog('error', 'Refund: failed to send refund notification email', safeErrorLog(emailError));
      }
    }

    // 監査ログ（best-effort）
    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'order.refund',
      targetType: 'order',
      targetId: order.order_no ?? orderId,
      metadata: { method: order.payment_method, refundId },
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId,
        status: 'REFUNDED',
        refundId,
      },
    });
  } catch (err) {
    secureLog('error', 'Refund error', safeErrorLog(err));
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
