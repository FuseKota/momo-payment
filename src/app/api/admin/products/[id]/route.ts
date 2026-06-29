import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminProductUpdateSchema, formatValidationErrors, uuidSchema } from '@/lib/validation/schemas';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { writeAuditLog } from '@/lib/logging/audit-log';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const rawBody = await request.json();

  const parseResult = adminProductUpdateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .update(parseResult.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'product.update',
      targetType: 'product',
      targetId: id,
      metadata: {
        slug: parseResult.data.slug,
        changedKeys: Object.keys(parseResult.data),
      },
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // 物理削除はしない。order_items.product_id の外部キー制約（RESTRICT）で
    // 注文済み商品は物理削除できず、また注文履歴を保全する必要があるため、
    // deleted_at をセットして論理削除（アーカイブ）し、is_active も false にして
    // 公開・管理一覧の両方から除外する。
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (error) {
      secureLog('error', 'Admin product delete (archive) error', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'product.delete',
      targetType: 'product',
      targetId: id,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    secureLog('error', 'Admin product delete (archive) exception', safeErrorLog(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
