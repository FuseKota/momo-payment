import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * セキュリティヘッダー設定
 */
const securityHeaders = [
  // コンテンツセキュリティポリシー
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js インラインスクリプト + Stripe
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      // MUI インラインスタイル + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts フォントファイル
      "font-src 'self' https://fonts.gstatic.com",
      // 画像: 自サイト + Supabase Storage + data URI + Unsplash + Wikimedia
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://upload.wikimedia.org",
      // Stripe iframe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // API接続先: 自サイト + Supabase + Stripe
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    ].join('; '),
  },
  // クリックジャッキング防止
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // MIMEタイプスニッフィング防止
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // リファラー情報の制御
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // XSS保護（レガシーブラウザ向け）
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // DNS事前解決の制御
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // 機能ポリシー
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // HTTPS強制（HSTS）
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  async headers() {
    return [
      {
        // すべてのルートに適用
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
