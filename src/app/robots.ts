import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/cart',
          '/*/cart',
          '/checkout',
          '/*/checkout',
          '/complete',
          '/*/complete',
          '/login',
          '/*/login',
          '/mypage',
          '/*/mypage',
          '/admin',
          '/api/',
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
