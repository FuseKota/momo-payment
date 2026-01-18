import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * レート制限とセキュリティチェックを実施
 *
 * Note: Edge Runtimeで動作するため、Node.js固有のモジュールは使用不可
 * レート制限の実際のチェックは各APIルート内で実行
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // セキュリティヘッダーを追加（next.config.tsと併用）
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  // レート制限ヘッダー（情報提供用）
  if (request.nextUrl.pathname.startsWith('/api/orders/')) {
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Window', '60');
  }

  return response;
}

export const config = {
  // APIルートにのみ適用
  matcher: ['/api/:path*'],
};
