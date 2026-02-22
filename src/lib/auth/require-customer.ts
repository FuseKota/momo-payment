import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CustomerAuthResult {
  authorized: true;
  userId: string;
}

interface CustomerAuthError {
  authorized: false;
  response: NextResponse;
}

export type RequireCustomerResult = CustomerAuthResult | CustomerAuthError;

/**
 * 顧客認証ガード
 * cookieからセッションを取得し、ログイン済みユーザーであることを確認する
 */
export async function requireCustomer(): Promise<RequireCustomerResult> {
  try {
    const supabase = await createClient();

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
