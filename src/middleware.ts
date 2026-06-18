import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// next-intl middleware と Next.js の自動 nonce 付与が両立できず、'strict-dynamic'
// 下では _next/static の <script> が全て CSP で弾かれていたため host-based に戻した。
function buildCsp(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://js.stripe.com',
    ...(isProd ? [] : ["'unsafe-eval'"]),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // フォントは next/font で同一オリジン配信のため Google Fonts の外部許可は不要
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

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
  const csp = buildCsp();

  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    response.headers.set('Content-Security-Policy', csp);

    if (pathname.startsWith('/api/orders/')) {
      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set('X-RateLimit-Window', '60');
    }

    // 個人情報を含む API レスポンスは共有キャッシュ（CDN 等）に保存させない
    if (
      pathname.startsWith('/api/mypage') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/orders/by-no')
    ) {
      response.headers.set('Cache-Control', 'private, no-store');
    }

    if (pathname.startsWith('/admin')) {
      response = await refreshSupabaseSession(request, response);
      response.headers.set('Content-Security-Policy', csp);

      // サーバサイドで /admin/* のアクセス制御（/admin/login 以外）
      if (pathname !== '/admin/login' && !pathname.startsWith('/api/')) {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll() {},
            },
          }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const loginUrl = new URL('/admin/login', request.url);
          return NextResponse.redirect(loginUrl);
        }
      }
    }

    return response;
  }

  const response = intlMiddleware(request);
  response.headers.set('Content-Security-Policy', csp);

  // as-needed のため ja はプレフィックスなし（/mypage 等）、zh-tw/en はプレフィックス付き
  const localePattern = /^\/(?:(?:zh-tw|en)\/)?(mypage|login|checkout\/shipping)(\/|$)/;
  if (localePattern.test(pathname)) {
    await refreshSupabaseSession(request, response);
    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
