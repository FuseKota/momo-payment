import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminCreateSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { writeAuditLog } from '@/lib/logging/audit-log';

/**
 * 管理者一覧取得
 * admin_users の各行に auth.users のメールアドレスを突き合わせて返す。
 * 管理者は少数想定のため、user_id ごとに getUserById で解決する。
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const { data: rows, error } = await supabase
      .from('admin_users')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      secureLog('error', 'Admin list query failed', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const admins = await Promise.all(
      (rows ?? []).map(async (row) => {
        let email: string | null = null;
        try {
          const { data } = await supabase.auth.admin.getUserById(row.user_id);
          email = data.user?.email ?? null;
        } catch {
          // email 解決失敗は致命ではない（user_id は残す）
        }
        return {
          user_id: row.user_id,
          email,
          role: row.role,
          created_at: row.created_at,
        };
      })
    );

    return NextResponse.json({ admins });
  } catch (error) {
    secureLog('error', 'Admin list failed', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 新規管理者の追加
 * email + 初期パスワードで auth ユーザーを作成し、admin_users に登録する。
 * admin_users への登録に失敗した場合は作成済み auth ユーザーを削除してロールバックする。
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

  const parseResult = adminCreateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const { email, password } = parseResult.data;
  const supabase = getSupabaseAdmin();

  try {
    // auth ユーザー作成（メール確認済みとして即ログイン可能にする）
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      // 既存メールの重複は専用トークンで返す（status / code いずれでも検知）
      const code = (createError as { code?: string; status?: number } | null)?.code;
      const status = (createError as { code?: string; status?: number } | null)?.status;
      const isDuplicate =
        code === 'email_exists' ||
        status === 422 ||
        (createError && /already|exist|registered/i.test(createError.message));
      if (isDuplicate) {
        // 既存 auth アカウント（過去に権限剥奪された管理者など）を管理者として復活させる
        return await reactivateExistingAdmin(request, supabase, guard.userId, email, password);
      }
      secureLog('error', 'Admin create: auth user creation failed', safeErrorLog(createError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const newUserId = created.user.id;

    // admin_users へ登録（失敗時は作成済み auth ユーザーを削除してロールバック）
    const { data: adminRow, error: insertError } = await supabase
      .from('admin_users')
      .insert({ user_id: newUserId })
      .select('created_at')
      .single();

    if (insertError) {
      await supabase.auth.admin.deleteUser(newUserId).catch(() => {
        // ロールバック失敗は孤児ユーザーが残るが、ログに残して握る
        secureLog('error', 'Admin create: rollback deleteUser failed', { userId: newUserId });
      });
      secureLog('error', 'Admin create: admin_users insert failed', safeErrorLog(insertError));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'admin.create',
      targetType: 'admin',
      targetId: newUserId,
      metadata: { email },
    });

    return NextResponse.json(
      {
        user_id: newUserId,
        email,
        role: 'admin',
        created_at: adminRow.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    secureLog('error', 'Admin create exception', safeErrorLog(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * email から auth ユーザーを探す。
 * supabase-js の admin API は email 検索を直接サポートしないため listUsers をページングする。
 * 管理者追加は低頻度操作のため、上限ページまで走査する。
 */
async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<User | null> {
  const target = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      secureLog('error', 'Admin reactivate: listUsers failed', safeErrorLog(error));
      return null;
    }
    const users = data?.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) break;
  }
  return null;
}

/**
 * createUser がメール重複で失敗した場合の復活処理。
 * 既存の auth ユーザー（過去に権限剥奪された管理者など）を再び管理者として登録し、
 * 入力された初期パスワードへ更新する。すでに管理者の場合は重複として 409 を返す。
 */
async function reactivateExistingAdmin(
  request: NextRequest,
  supabase: SupabaseClient,
  actorId: string,
  email: string,
  password: string
): Promise<NextResponse> {
  const existing = await findAuthUserByEmail(supabase, email);
  if (!existing) {
    // 衝突しているのに該当ユーザーを特定できない稀ケース
    secureLog('error', 'Admin reactivate: existing user not found by email');
    return NextResponse.json({ error: 'email_exists' }, { status: 409 });
  }

  // すでに管理者なら本当の重複
  const { data: alreadyAdmin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', existing.id)
    .maybeSingle();
  if (alreadyAdmin) {
    return NextResponse.json({ error: 'already_admin' }, { status: 409 });
  }

  // 初期パスワードへ更新（メール未確認なら確認済みにする）
  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (updateError) {
    secureLog('error', 'Admin reactivate: password update failed', safeErrorLog(updateError));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // admin_users へ登録（管理者として復活）
  const { data: adminRow, error: insertError } = await supabase
    .from('admin_users')
    .insert({ user_id: existing.id })
    .select('created_at')
    .single();
  if (insertError) {
    secureLog('error', 'Admin reactivate: admin_users insert failed', safeErrorLog(insertError));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  await writeAuditLog({
    request,
    actorId,
    action: 'admin.create',
    targetType: 'admin',
    targetId: existing.id,
    metadata: { email, reactivated: true },
  });

  return NextResponse.json(
    {
      user_id: existing.id,
      email,
      role: 'admin',
      created_at: adminRow.created_at,
      reactivated: true,
    },
    { status: 201 }
  );
}
