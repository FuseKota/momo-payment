/**
 * CSRF保護
 * Originヘッダーを検証してクロスサイトリクエスト偽造を防止
 */

/**
 * 許可されたオリジンのリストを取得
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // 本番環境のURL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    origins.push(appUrl);
    // HTTPSバージョンも追加（HTTP→HTTPSリダイレクト対応）
    if (appUrl.startsWith('http://')) {
      origins.push(appUrl.replace('http://', 'https://'));
    }
  }

  // 開発環境
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3001');
    origins.push('http://127.0.0.1:3000');
    origins.push('http://127.0.0.1:3001');
  }

  return origins;
}

/**
 * リクエストのOriginを検証
 * @param request - リクエストオブジェクト
 * @returns 検証結果と詳細情報
 */
export function validateOrigin(request: Request): {
  valid: boolean;
  origin: string | null;
  reason?: string;
} {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Originヘッダーがない場合（同一オリジンリクエストの可能性）
  // ブラウザによってはPOSTでもOriginを送らない場合がある
  if (!origin) {
    // Refererヘッダーで代替チェック
    if (referer) {
      const refererOrigin = new URL(referer).origin;
      const allowedOrigins = getAllowedOrigins();
      if (allowedOrigins.includes(refererOrigin)) {
        return { valid: true, origin: refererOrigin };
      }
      return {
        valid: false,
        origin: refererOrigin,
        reason: 'Invalid referer origin',
      };
    }

    // curl等のツールからのリクエストを拒否
    // 開発環境では許可することも検討
    if (process.env.NODE_ENV === 'development') {
      return { valid: true, origin: null, reason: 'Development mode - no origin check' };
    }

    return {
      valid: false,
      origin: null,
      reason: 'Missing origin header',
    };
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    return { valid: true, origin };
  }

  return {
    valid: false,
    origin,
    reason: `Origin not allowed: ${origin}`,
  };
}

/**
 * CSRF検証が必要かどうかを判定
 * Webhookエンドポイントは署名検証があるため除外
 */
export function requiresCsrfCheck(pathname: string): boolean {
  // Webhookは除外（署名検証で保護）
  if (pathname.startsWith('/api/webhooks/')) {
    return false;
  }

  // GETリクエストは通常CSRFの対象外
  // この関数はPOST/PUT/DELETE等で呼ばれる想定

  return true;
}
