import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { checkAdminRateLimit, getClientIP } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';

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
 * CSRF検証 + 管理者認証 + レート制限 を一括処理
 */
export async function adminWriteGuard(request: NextRequest): Promise<AdminGuardResult> {
  // CSRF 検証（管理者の書き込み操作は必ずOrigin検証を行う）
  const originCheck = validateOrigin(request);
  if (!originCheck.valid) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'invalid_origin' },
        { status: 403 }
      ),
    };
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { ok: false, response: auth.response };
  }

  const rateLimit = await checkAdminRateLimit(getClientIP(request));
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
