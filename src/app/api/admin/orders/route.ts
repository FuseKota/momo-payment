import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminOrdersQuerySchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

/**
 * Supabase の .or() に渡す ilike パターン用エスケープ。
 * カンマ衝突や % _ \ によるパターン暴発を防ぐため、[%_,] を \\ でエスケープする。
 */
function escapeOrPattern(value: string): string {
  return value.replace(/[\\%_,]/g, (ch) => `\\${ch}`);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = adminOrdersQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { type, status, q, from, to, limit, offset } = parsed.data;

  const supabase = getSupabaseAdmin();

  try {
    let query = supabase
      .from('orders')
      .select(
        `
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
        delivery_date,
        delivery_time_slot,
        agreement_accepted,
        admin_note,
        user_id,
        locale,
        paid_at,
        created_at,
        updated_at,
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
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('order_type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (from) {
      query = query.gte('created_at', `${from}T00:00:00+09:00`);
    }

    if (to) {
      query = query.lte('created_at', `${to}T23:59:59.999+09:00`);
    }

    if (q) {
      const pattern = `%${escapeOrPattern(q)}%`;
      query = query.or(
        `order_no.ilike.${pattern},customer_name.ilike.${pattern},customer_email.ilike.${pattern}`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      secureLog('error', 'admin orders list query failed', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      orders: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    secureLog('error', 'admin orders list failed', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
