import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendShippingNotificationEmail } from '@/lib/email/resend';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          qty,
          unit_price_yen,
          line_total_yen
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await request.json();

  try {
    // Get current order data for email notification
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.tracking_number !== undefined) {
      updateData.tracking_number = body.tracking_number;
    }

    if (body.status === 'SHIPPED') {
      updateData.shipped_at = new Date().toISOString();
    }

    if (body.status === 'FULFILLED') {
      updateData.fulfilled_at = new Date().toISOString();
    }

    if (body.status === 'CANCELLED') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send shipping notification email when status changes to SHIPPED
    if (body.status === 'SHIPPED' && currentOrder) {
      await sendShippingNotificationEmail({
        orderNo: currentOrder.order_no,
        customerName: currentOrder.customer_name,
        customerEmail: currentOrder.customer_email,
        trackingNumber: body.tracking_number || data.tracking_number,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
