import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

interface Props {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 管理者：顧客詳細（GET /api/admin/customers/[id]）
 *
 * [id] は会員の user_id（auth.users.id）。プロフィール・メール・保存住所・注文履歴を
 * 集約して返す（読取専用）。会員プロフィールが無い user_id は 404。
 */
export async function GET(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: userId } = await params;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .select('id, user_id, display_name, phone, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      secureLog('error', 'admin customer profile query failed', safeErrorLog(profileError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // email は auth.users にしか無いため Admin API で取得（失敗してもページは表示する）
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) {
      secureLog('error', 'admin customer getUserById failed', safeErrorLog(userError));
    }
    const email = userData?.user?.email ?? null;

    const { data: addresses, error: addrError } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (addrError) {
      secureLog('error', 'admin customer addresses query failed', safeErrorLog(addrError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_no, order_type, status, total_yen, created_at, paid_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      secureLog('error', 'admin customer orders query failed', safeErrorLog(ordersError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      user_id: userId,
      profile,
      email,
      addresses: addresses ?? [],
      orders: orders ?? [],
    });
  } catch (error) {
    secureLog('error', 'admin customer detail failed', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
