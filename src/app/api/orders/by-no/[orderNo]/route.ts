import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;

    if (!orderNo) {
      return NextResponse.json(
        { ok: false, error: 'order_no_required' },
        { status: 400 }
      );
    }

    // 注文を取得
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_no,
        order_type,
        status,
        payment_method,
        temp_zone,
        subtotal_yen,
        shipping_fee_yen,
        total_yen,
        customer_name,
        pickup_date,
        pickup_time,
        created_at,
        order_items (
          id,
          product_name,
          qty,
          unit_price_yen,
          line_total_yen
        )
      `)
      .eq('order_no', orderNo)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: 'order_not_found' },
        { status: 404 }
      );
    }

    // 配送注文の場合は住所も取得
    let shippingAddress = null;
    if (order.order_type === 'SHIPPING') {
      const { data: address } = await supabaseAdmin
        .from('shipping_addresses')
        .select('postal_code, pref, city, address1, address2')
        .eq('order_id', order.id)
        .single();

      shippingAddress = address;
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...order,
        shippingAddress,
      },
    });
  } catch (err) {
    console.error('Get order error:', err);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
