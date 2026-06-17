import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminAuditLogQuerySchema } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = adminAuditLogQuerySchema.safeParse({
    action: searchParams.get('action') || undefined,
    targetType: searchParams.get('targetType') || undefined,
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const { action, targetType, page, perPage } = parsed.data;
  const supabase = getSupabaseAdmin();

  try {
    let query = supabase
      .from('audit_logs')
      .select(
        'id, actor_id, actor_email, action, target_type, target_id, metadata, ip, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * perPage, page * perPage + perPage - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    const { data, error, count } = await query;

    if (error) {
      secureLog('error', 'admin audit-logs query failed', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      perPage,
    });
  } catch (error) {
    secureLog('error', 'admin audit-logs unexpected error', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
