import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
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
      canonical: `${appUrl}/${locale}/news`,
      languages: {
        ja: `${appUrl}/ja/news`,
        'zh-TW': `${appUrl}/zh-tw/news`,
        'x-default': `${appUrl}/ja/news`,
      },
    },
    openGraph: {
      title: t('news.title'),
      description: t('news.description'),
      url: `${appUrl}/${locale}/news`,
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
  const ja = locale === 'ja';

  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(appUrl, locale, [
          { name: ja ? 'ホーム' : '首頁', path: '' },
          { name: ja ? 'ニュース' : '最新消息', path: '/news' },
        ])}
      />
      <NewsListClient items={news ?? []} />
    </>
  );
}
