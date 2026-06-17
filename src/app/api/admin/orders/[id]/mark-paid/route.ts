import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminMarkPaidSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { sendPickupPaymentReceivedEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/logging/audit-log';

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

    const parseResult = adminMarkPaidSchema.safeParse(rawBody);
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
      return NextResponse.json(
        { ok: false, error: 'order_not_found' },
        { status: 404 }
      );
    }

    // 店頭払いでRESERVEDの注文のみ入金確認可能
    if (order.payment_method !== 'PAY_AT_PICKUP') {
      return NextResponse.json(
        { ok: false, error: 'not_pay_at_pickup' },
        { status: 400 }
      );
    }

    if (order.status !== 'RESERVED') {
      return NextResponse.json(
        { ok: false, error: 'invalid_status', currentStatus: order.status },
        { status: 400 }
      );
    }

    // 注文ステータスを更新
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'PAID',
        paid_at: new Date().toISOString(),
        admin_note: body.note ?? null,
      })
      .eq('id', orderId);

    if (updateError) {
      secureLog('error', 'Mark paid update error', safeErrorLog(updateError));
      return NextResponse.json(
        { ok: false, error: 'update_failed' },
        { status: 500 }
      );
    }

    // paymentsも更新
    await supabaseAdmin
      .from('payments')
      .update({ status: 'SUCCEEDED' })
      .eq('order_id', orderId);

    // 入金確認メール（店頭払い）— 失敗してもステータス更新は確定済みなのでログのみ
    if (order.customer_email) {
      try {
        await sendPickupPaymentReceivedEmail({
          orderNo: order.order_no,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          total: order.total_yen,
          locale: order.locale || 'ja',
        });
      } catch (emailError) {
        secureLog('error', 'Failed to send pickup payment received email', safeErrorLog(emailError));
      }
    }

    // 監査ログ（best-effort）
    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'order.mark_paid',
      targetType: 'order',
      targetId: order.order_no ?? orderId,
      metadata: {},
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId,
        status: 'PAID',
      },
    });
  } catch (err) {
    secureLog('error', 'Mark paid error', safeErrorLog(err));
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
