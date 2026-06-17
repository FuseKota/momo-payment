import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';
import NewsListClient from './NewsListClient';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/structured-data';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  return {
    title: t('news.title'),
    description: t('news.description'),
    alternates: {
      canonical: localeUrl(appUrl, locale, '/news'),
      languages: languageAlternates(appUrl, '/news'),
    },
    openGraph: {
      title: t('news.title'),
      description: t('news.description'),
      url: localeUrl(appUrl, locale, '/news'),
      type: 'website',
    },
  };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  const homeLabel = locale === 'zh-tw' ? '首頁' : locale === 'en' ? 'Home' : 'ホーム';
  const newsLabel = locale === 'zh-tw' ? '最新消息' : locale === 'en' ? 'News' : 'ニュース';

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(appUrl, locale, [
          { name: homeLabel, path: '' },
          { name: newsLabel, path: '/news' },
        ])}
      />
      <NewsListClient items={news ?? []} />
    </>
  );
}
