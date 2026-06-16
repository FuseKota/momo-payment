import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import NewsListClient from './NewsListClient';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/structured-data';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'news' });
  return {
    title: t('heading'),
    description: t('heading'),
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
