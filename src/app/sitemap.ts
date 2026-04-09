import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const locales = ['ja', 'zh-tw'] as const;
type Locale = (typeof locales)[number];

const localeToHreflang: Record<Locale, string> = {
  ja: 'ja',
  'zh-tw': 'zh-TW',
};

function buildAlternates(path: string, appUrl: string) {
  return {
    languages: Object.fromEntries(
      locales.map((l) => [localeToHreflang[l], `${appUrl}/${l}${path}`])
    ) as Record<string, string>,
  };
}

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/shop', changeFrequency: 'daily', priority: 0.9 },
  { path: '/news', changeFrequency: 'daily', priority: 0.7 },
  { path: '/taiwan-night-market', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/legal/tokushoho', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/legal/privacy', changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // Static routes
  for (const route of staticRoutes) {
    for (const locale of locales) {
      entries.push({
        url: `${appUrl}/${locale}${route.path}`,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: buildAlternates(route.path, appUrl),
      });
    }
  }

  // Dynamic product routes
  try {
    const supabase = getSupabaseAdmin();
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true);

    if (products) {
      for (const product of products) {
        const path = `/shop/${product.slug}`;
        for (const locale of locales) {
          entries.push({
            url: `${appUrl}/${locale}${path}`,
            lastModified: product.updated_at ? new Date(product.updated_at) : now,
            changeFrequency: 'weekly',
            priority: 0.8,
            alternates: buildAlternates(path, appUrl),
          });
        }
      }
    }
  } catch {
    // DB unavailable during build — skip dynamic routes
  }

  // Dynamic news routes
  try {
    const supabase = getSupabaseAdmin();
    const { data: newsItems } = await supabase
      .from('news')
      .select('slug, published_at')
      .eq('is_published', true);

    if (newsItems) {
      for (const item of newsItems) {
        const path = `/news/${item.slug}`;
        for (const locale of locales) {
          entries.push({
            url: `${appUrl}/${locale}${path}`,
            lastModified: item.published_at ? new Date(item.published_at) : now,
            changeFrequency: 'monthly',
            priority: 0.6,
            alternates: buildAlternates(path, appUrl),
          });
        }
      }
    }
  } catch {
    // DB unavailable during build — skip dynamic routes
  }

  return entries;
}
