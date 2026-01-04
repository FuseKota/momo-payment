import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// TODO: 管理者認証を追加

interface ShipRequest {
  carrier: string;
  trackingNo: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      console.error('Shipment create error:', shipmentError);
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
      console.error('Update error:', updateError);
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
    console.error('Ship error:', err);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
