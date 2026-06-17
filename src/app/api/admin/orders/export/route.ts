import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminOrdersFilterSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import type { AdminOrderExportRow } from '@/types/database';
import { EXPORT_LIMIT, CSV_BOM, escapeOrPattern, buildCsv } from '@/lib/api/orders-csv';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = adminOrdersFilterSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { type, status, q, from, to } = parsed.data;

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
        pickup_date,
        pickup_time,
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
          product_name,
          qty
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
        payments (
          status
        )
      `
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

    query = query.limit(EXPORT_LIMIT);

    const { data, error } = await query;

    if (error) {
      secureLog('error', 'admin orders export query failed', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as AdminOrderExportRow[];
    const csv = buildCsv(rows);

    const dateStr = new Date().toISOString().slice(0, 10);

    // CSV 本文には PII が含まれるため secureLog には渡さない（件数のみ記録）
    secureLog('info', 'admin orders exported', { count: rows.length });

    return new NextResponse(CSV_BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders_${dateStr}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    secureLog('error', 'admin orders export failed', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
