import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * セキュリティヘッダー設定
 */
const securityHeaders = [
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
];

const nextConfig: NextConfig = {
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
