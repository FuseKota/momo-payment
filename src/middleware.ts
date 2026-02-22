import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js Middleware
 * セキュリティヘッダー + Supabase セッションリフレッシュ
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // セキュリティヘッダーを追加
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  // レート制限ヘッダー（情報提供用）
  if (request.nextUrl.pathname.startsWith('/api/orders/')) {
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Window', '60');
  }

  // Supabase セッションリフレッシュ（admin + mypage パス）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // セキュリティヘッダーを再設定
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set('X-Frame-Options', 'DENY');
        },
      },
    }
  );

  // セッションリフレッシュ（JWTの有効期限を延長）
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/mypage/:path*', '/login'],
};
