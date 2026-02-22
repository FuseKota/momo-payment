import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

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
