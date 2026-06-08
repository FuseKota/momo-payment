import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';
import { uuidSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
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
        customer_phone,
        customer_email,
        pickup_date,
        pickup_time,
        delivery_date,
        delivery_time_slot,
        agreement_accepted,
        user_id,
        locale,
        paid_at,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          product_name,
          product_size,
          qty,
          unit_price_yen,
          line_total_yen
        ),
        shipping_addresses (
          postal_code,
          pref,
          city,
          address1,
          address2,
          recipient_name,
          recipient_phone
        ),
        shipments (
          carrier,
          tracking_no,
          shipped_at
        )
      `)
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
