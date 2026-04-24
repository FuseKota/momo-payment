import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminProductReorderSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

export async function PATCH(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parseResult = adminProductReorderSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const { items } = parseResult.data;

  try {
    // 原子的に複数行を更新（PostgreSQL RPC 経由でトランザクション保証）
    const { data, error } = await supabase.rpc('reorder_products', { p_items: items });

    if (error) {
      secureLog('error', 'Product reorder error', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ updated: data ?? items.length });
  } catch (err) {
    secureLog('error', 'Product reorder exception', safeErrorLog(err));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
