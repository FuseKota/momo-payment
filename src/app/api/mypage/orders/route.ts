import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';

export async function GET() {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

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
        )
      `)
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
