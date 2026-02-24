import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { requireAdmin } from '@/lib/auth/require-admin';
import { checkAdminRateLimit, getClientIP } from '@/lib/security/rate-limit';

interface MarkPaidRequest {
  note?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = checkAdminRateLimit(getClientIP(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
    );
  }

  try {
    const { id: orderId } = await params;
    const body: MarkPaidRequest = await request.json();

    // 注文を取得
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_method')
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

    // TODO: 購入者へメール通知（入金完了）

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
