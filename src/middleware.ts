import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * セキュリティヘッダーを付与
 */
function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

/**
 * Supabase セッションリフレッシュ
 */
async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
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
          // Re-create response to propagate cookie changes
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/* と /api/* は next-intl をスキップ
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    applySecurityHeaders(response);

    // レート制限ヘッダー
    if (pathname.startsWith('/api/orders/')) {
      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set('X-RateLimit-Window', '60');
    }

    // admin パスは Supabase セッションリフレッシュ
    if (pathname.startsWith('/admin')) {
      response = await refreshSupabaseSession(request, response);
      applySecurityHeaders(response);
    }

    return response;
  }

  // それ以外は next-intl ミドルウェアでロケール検出・リダイレクト
  const response = intlMiddleware(request);
  applySecurityHeaders(response);

  // /[locale]/mypage, /[locale]/login のセッションリフレッシュ
  const localePattern = /^\/(ja|zh-tw)\/(mypage|login)(\/|$)/;
  if (localePattern.test(pathname)) {
    await refreshSupabaseSession(request, response);
    applySecurityHeaders(response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
