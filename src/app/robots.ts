import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ja/', '/zh-tw/'],
        disallow: [
          '/*/cart',
          '/*/checkout',
          '/*/complete',
          '/*/login',
          '/*/mypage',
          '/admin',
          '/api/',
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
