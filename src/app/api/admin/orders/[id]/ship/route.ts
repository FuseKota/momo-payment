import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { requireAdmin } from '@/lib/auth/require-admin';
import { checkAdminRateLimit, getClientIP } from '@/lib/security/rate-limit';

interface ShipRequest {
  carrier: string;
  trackingNo: string;
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
    const body: ShipRequest = await request.json();

    if (!body.carrier || !body.trackingNo) {
      return NextResponse.json(
        { ok: false, error: 'carrier_and_tracking_required' },
        { status: 400 }
      );
    }

    // 注文を取得
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, order_type')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: 'order_not_found' },
        { status: 404 }
      );
    }

    // 配送注文のみ発送可能
    if (order.order_type !== 'SHIPPING') {
      return NextResponse.json(
        { ok: false, error: 'not_shipping_order' },
        { status: 400 }
      );
    }

    // PAIDまたはPACKINGの注文のみ発送可能
    if (order.status !== 'PAID' && order.status !== 'PACKING') {
      return NextResponse.json(
        { ok: false, error: 'invalid_status', currentStatus: order.status },
        { status: 400 }
      );
    }

    // shipmentsに登録
    const { error: shipmentError } = await supabaseAdmin.from('shipments').insert({
      order_id: orderId,
      carrier: body.carrier,
      tracking_no: body.trackingNo,
      shipped_at: new Date().toISOString(),
    });

    if (shipmentError) {
      secureLog('error', 'Shipment create error', safeErrorLog(shipmentError));
      return NextResponse.json(
        { ok: false, error: 'shipment_create_failed' },
        { status: 500 }
      );
    }

    // 注文ステータスを更新
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'SHIPPED' })
      .eq('id', orderId);

    if (updateError) {
      secureLog('error', 'Ship update error', safeErrorLog(updateError));
      return NextResponse.json(
        { ok: false, error: 'update_failed' },
        { status: 500 }
      );
    }

    // TODO: 購入者へメール通知（発送完了 + 追跡番号）

    return NextResponse.json({
      ok: true,
      data: {
        orderId,
        status: 'SHIPPED',
        carrier: body.carrier,
        trackingNo: body.trackingNo,
      },
    });
  } catch (err) {
    secureLog('error', 'Ship error', safeErrorLog(err));
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
