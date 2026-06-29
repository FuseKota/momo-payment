import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminPasswordChangeSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { writeAuditLog } from '@/lib/logging/audit-log';

/**
 * ログイン中の管理者が自分のパスワードを変更する。
 * 現在のパスワードで本人確認（再認証）したうえで新しいパスワードへ更新する。
 */
export async function POST(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parseResult = adminPasswordChangeSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parseResult.data;
  const supabase = getSupabaseAdmin();

  try {
    // 自分のメールアドレスを解決
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      guard.userId
    );
    const email = userData?.user?.email;
    if (userError || !email) {
      secureLog('error', 'Password change: failed to resolve current user', safeErrorLog(userError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 現在のパスワードを検証（セッションを残さない一時クライアントで再認証）
    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      return NextResponse.json({ error: 'invalid_current_password' }, { status: 401 });
    }

    // 新しいパスワードへ更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(guard.userId, {
      password: newPassword,
    });
    if (updateError) {
      secureLog('error', 'Password change: update failed', safeErrorLog(updateError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'admin.password_change',
      targetType: 'admin',
      targetId: guard.userId,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    secureLog('error', 'Password change exception', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
