import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface AdminAuthResult {
  authorized: true;
  userId: string;
}

interface AdminAuthError {
  authorized: false;
  response: NextResponse;
}

export type RequireAdminResult = AdminAuthResult | AdminAuthError;

/**
 * 管理者認証ガード
 * cookieからセッションを取得し、admin_usersテーブルで照合する
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  try {
    const supabase = await createClient();

    // getUser() でJWT検証（getSessionはローカルのみで検証が不十分）
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'unauthorized' },
          { status: 401 }
        ),
      };
    }

    // admin_usersテーブルで管理者かチェック
    const supabaseAdmin = getSupabaseAdmin();
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'forbidden' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId: user.id,
    };
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'auth_error' },
        { status: 500 }
      ),
    };
  }
}
