import { NextRequest, NextResponse } from 'next/server';
import { checkOrderRateLimit, getClientIP } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';
import { secureLog } from '@/lib/logging/secure-logger';
import { createClient } from '@/lib/supabase/server';

interface OrderGuardSuccess {
  ok: true;
  clientIP: string;
  userId: string | null;
}

interface OrderGuardFailure {
  ok: false;
  response: NextResponse;
}

export type OrderGuardResult = OrderGuardSuccess | OrderGuardFailure;

/**
 * 注文API用セキュリティガード
 * レート制限 + CSRF検証 + ユーザーID取得 を一括処理
 */
export async function orderGuard(request: NextRequest): Promise<OrderGuardResult> {
  const clientIP = getClientIP(request);

  // 1. レート制限チェック
  const rateLimit = await checkOrderRateLimit(clientIP);
  if (!rateLimit.allowed) {
    secureLog('warn', 'Rate limit exceeded', { ip: clientIP });
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'rate_limit_exceeded', retryAfter: rateLimit.resetIn },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetIn),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  // 2. CSRF保護（Origin検証）
  const originCheck = validateOrigin(request);
  if (!originCheck.valid) {
    secureLog('warn', 'CSRF check failed', { ip: clientIP, reason: originCheck.reason });
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'invalid_origin' },
        { status: 403 }
      ),
    };
  }

  // 3. ログインユーザーの場合、user_idを取得（オプション）
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ゲスト購入の場合は無視
  }

  return { ok: true, clientIP, userId };
}
