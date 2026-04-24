import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * CSP を per-request nonce 付きで生成
 * - script-src: 'strict-dynamic' + nonce で XSS 緩和を有効化
 * - style-src: MUI/emotion の CSSinJS が動的 <style> を挿入するため 'unsafe-inline' 継続
 */
function buildCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://js.stripe.com',
    // 古いブラウザ向けフォールバック（strict-dynamic があれば無視される）
    "'unsafe-inline'",
    'https:',
    // 開発時のみ HMR eval を許容
    ...(isProd ? [] : ["'unsafe-eval'"]),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://upload.wikimedia.org",
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

  // per-request nonce（CSP 用）を生成
  const nonce = Buffer.from(crypto.randomUUID().replace(/-/g, '')).toString('base64');
  const csp = buildCsp(nonce);

  // request 側にも nonce を伝播（Server Components で headers() から読める）
  request.headers.set('x-nonce', nonce);

  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    response.headers.set('Content-Security-Policy', csp);

    if (pathname.startsWith('/api/orders/')) {
      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set('X-RateLimit-Window', '60');
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

  const localePattern = /^\/(ja|zh-tw)\/(mypage|login|checkout\/shipping|checkout\/pickup)(\/|$)/;
  if (localePattern.test(pathname)) {
    await refreshSupabaseSession(request, response);
    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
