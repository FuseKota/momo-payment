import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

const orderTypeSchema = z.enum(['PICKUP', 'SHIPPING']).optional();
const orderStatusSchema = z.enum([
  'RESERVED', 'PENDING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'FULFILLED', 'CANCELED', 'REFUNDED'
]).optional();

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get('type');
  const statusParam = searchParams.get('status');

  const typeParsed = orderTypeSchema.safeParse(typeParam || undefined);
  const statusParsed = orderStatusSchema.safeParse(statusParam || undefined);
  if (!typeParsed.success || !statusParsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }
  const type = typeParsed.data;
  const status = statusParsed.data;

  const supabase = getSupabaseAdmin();

  try {
    let query = supabase
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
        ),
        shipments (
          id,
          tracking_no,
          shipped_at
        )
      `)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('order_type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
