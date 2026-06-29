import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { writeAuditLog } from '@/lib/logging/audit-log';

/**
 * 管理者権限の剥奪（admin_users から削除）
 * auth ユーザー自体は削除せず権限のみ外す。
 * - 自分自身は削除不可（誤操作で締め出されるのを防ぐ）
 * - 最後の1人は削除不可（全管理者が居なくなるのを防ぐ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { userId } = await params;
  const idParse = uuidSchema.safeParse(userId);
  if (!idParse.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  if (userId === guard.userId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // 対象が管理者として存在するか確認しつつ、総数も把握する
    const { data: admins, error: listError } = await supabase
      .from('admin_users')
      .select('user_id');

    if (listError) {
      secureLog('error', 'Admin delete: list query failed', safeErrorLog(listError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const exists = (admins ?? []).some((a) => a.user_id === userId);
    if (!exists) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if ((admins ?? []).length <= 1) {
      return NextResponse.json({ error: 'cannot_delete_last_admin' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      secureLog('error', 'Admin delete failed', safeErrorLog(deleteError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'admin.delete',
      targetType: 'admin',
      targetId: userId,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    secureLog('error', 'Admin delete exception', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
