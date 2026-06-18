import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

// 売上集計の対象ステータス（入金済み以降）
const SALES_STATUSES = ['PAID', 'PACKING', 'SHIPPED', 'FULFILLED'] as const;

/**
 * JST（Asia/Tokyo）基準の当日0時 / 当月1日0時を ISO 文字列で返す。
 * Intl で JST の日付パーツを取得し、+09:00 を付けた ISO を UTC へ変換する。
 */
function getJstBoundaries(): { todayIso: string; monthIso: string } {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');

  const todayIso = new Date(`${year}-${month}-${day}T00:00:00+09:00`).toISOString();
  const monthIso = new Date(`${year}-${month}-01T00:00:00+09:00`).toISOString();

  return { todayIso, monthIso };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = getSupabaseAdmin();
  const { todayIso, monthIso } = getJstBoundaries();

  try {
    const [
      todayRes,
      monthRes,
      statusRes,
      toShipRes,
      recentRes,
    ] = await Promise.all([
      // ① 本日売上 + 件数
      supabase
        .from('orders')
        .select('total_yen')
        .gte('paid_at', todayIso)
        .in('status', SALES_STATUSES),
      // ② 今月売上 + 件数
      supabase
        .from('orders')
        .select('total_yen')
        .gte('paid_at', monthIso)
        .in('status', SALES_STATUSES),
      // ③ ステータス別件数
      supabase.from('orders').select('status'),
      // ④ 要発送件数（SHIPPING かつ PAID/PACKING）
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_type', 'SHIPPING')
        .in('status', ['PAID', 'PACKING']),
      // ⑤ 直近注文10件
      supabase
        .from('orders')
        .select('id, order_no, status, total_yen, customer_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const firstError =
      todayRes.error ||
      monthRes.error ||
      statusRes.error ||
      toShipRes.error ||
      recentRes.error;

    if (firstError) {
      secureLog('error', 'admin dashboard aggregation failed', safeErrorLog(firstError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const todayRows = todayRes.data ?? [];
    const monthRows = monthRes.data ?? [];

    const todaySales = todayRows.reduce((sum, r) => sum + (r.total_yen ?? 0), 0);
    const monthSales = monthRows.reduce((sum, r) => sum + (r.total_yen ?? 0), 0);

    const byStatus: Record<string, number> = {};
    for (const row of statusRes.data ?? []) {
      const s = row.status as string;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    return NextResponse.json({
      today: { sales: todaySales, count: todayRows.length },
      month: { sales: monthSales, count: monthRows.length },
      byStatus,
      pending: {
        toShip: toShipRes.count ?? 0,
      },
      recentOrders: recentRes.data ?? [],
    });
  } catch (error) {
    secureLog('error', 'admin dashboard unexpected error', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
