import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { checkAdminRateLimit, getClientIP } from '@/lib/security/rate-limit';

interface AdminGuardSuccess {
  ok: true;
  userId: string;
}

interface AdminGuardFailure {
  ok: false;
  response: NextResponse;
}

export type AdminGuardResult = AdminGuardSuccess | AdminGuardFailure;

/**
 * Admin write エンドポイント用ガード
 * 管理者認証 + レート制限 を一括処理
 */
export async function adminWriteGuard(request: NextRequest): Promise<AdminGuardResult> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { ok: false, response: auth.response };
  }

  const rateLimit = checkAdminRateLimit(getClientIP(request));
  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'rate_limit_exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      ),
    };
  }

  return { ok: true, userId: auth.userId };
}
