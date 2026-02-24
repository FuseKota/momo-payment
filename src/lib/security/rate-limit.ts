/**
 * インメモリレート制限
 * スライディングウィンドウ方式でリクエスト数を制限
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// IPアドレスごとのレート制限記録
const rateLimitMap = new Map<string, RateLimitRecord>();

// デフォルト設定
const DEFAULT_LIMIT = 10; // リクエスト数
const DEFAULT_WINDOW_MS = 60 * 1000; // 1分

/**
 * レート制限をチェック
 * @param identifier - 識別子（通常はIPアドレス）
 * @param limit - ウィンドウ内の最大リクエスト数
 * @param windowMs - ウィンドウサイズ（ミリ秒）
 * @returns allowed: 許可されたか, remaining: 残りリクエスト数, resetIn: リセットまでの秒数
 */
export function checkRateLimit(
  identifier: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // 新規または期限切れの場合
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  // 制限超過
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  // カウント増加
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: Math.ceil((record.resetTime - now) / 1000),
  };
}

/**
 * 注文API用レート制限チェック
 * 10リクエスト/分/IP
 */
export function checkOrderRateLimit(ip: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(`order:${ip}`, 10, 60 * 1000);
}

/**
 * Webhook用レート制限チェック
 * 100リクエスト/分（Stripeリトライ対応）
 */
export function checkWebhookRateLimit(ip: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(`webhook:${ip}`, 100, 60 * 1000);
}

/**
 * 管理者API用レート制限チェック
 * 30リクエスト/分（書き込み操作用）
 */
export function checkAdminRateLimit(ip: string): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(`admin:${ip}`, 30, 60 * 1000);
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIP(request: Request): string {
  // Vercel/Cloudflare等のプロキシ対応
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // フォールバック
  return 'unknown';
}

// 定期的なクリーンアップ（メモリリーク防止）
// サーバーサイドでのみ実行
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60 * 1000); // 1分ごと
}

/**
 * テスト用：レート制限をリセット
 */
export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    rateLimitMap.delete(identifier);
  } else {
    rateLimitMap.clear();
  }
}
