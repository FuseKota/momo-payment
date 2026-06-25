import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminCustomersQuerySchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

/**
 * 管理者：顧客マスタ一覧（GET /api/admin/customers）
 *
 * 登録会員（customer_profiles）を主軸に、auth.users(email) と orders 集計を結合した
 * 読取専用RPC admin_list_customers を呼び出す。メールは auth.users にしか無いため
 * RPC（SECURITY DEFINER）経由で取得する。
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = adminCustomersQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { q, limit, offset } = parsed.data;

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc('admin_list_customers', {
      p_search: q ?? null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      secureLog('error', 'admin customers list query failed', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    // 総件数は window count（total_count）を先頭行から取得（0件なら 0）
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    const customers = rows.map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      email: r.email,
      phone: r.phone,
      registered_at: r.registered_at,
      order_count: Number(r.order_count ?? 0),
      total_spent_yen: Number(r.total_spent_yen ?? 0),
      last_order_at: r.last_order_at,
    }));

    return NextResponse.json({ customers, total, limit, offset });
  } catch (error) {
    secureLog('error', 'admin customers list failed', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
