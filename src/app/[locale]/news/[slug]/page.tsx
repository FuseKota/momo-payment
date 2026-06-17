import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import NewsDetailClient from './NewsDetailClient';
import { JsonLd } from '@/components/JsonLd';
import { articleSchema, breadcrumbSchema } from '@/lib/seo/structured-data';
import { getLocalizedNewsTitle, getLocalizedNewsExcerpt } from '@/lib/utils/localize-news';

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('title, excerpt, title_zh_tw, excerpt_zh_tw')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!news) return { title: 'Not Found' };

  const title = getLocalizedNewsTitle(news, locale);
  const excerpt = getLocalizedNewsExcerpt(news, locale);

  return {
    title,
    description: excerpt || title,
    alternates: {
      canonical: `${appUrl}/${locale}/news/${slug}`,
      languages: {
        ja: `${appUrl}/ja/news/${slug}`,
        'zh-TW': `${appUrl}/zh-tw/news/${slug}`,
        'x-default': `${appUrl}/ja/news/${slug}`,
      },
    },
    openGraph: {
      title,
      description: excerpt || title,
      url: `${appUrl}/${locale}/news/${slug}`,
      type: 'article',
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  const ja = locale === 'ja';
  const supabase = getSupabaseAdmin();

  const { data: news, error } = await supabase
    .from('news')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !news) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(appUrl, locale, [
          { name: ja ? 'ホーム' : '首頁', path: '' },
          { name: ja ? 'ニュース' : '最新消息', path: '/news' },
          { name: getLocalizedNewsTitle(news, locale), path: `/news/${news.slug}` },
        ])}
      />
      <JsonLd data={articleSchema(appUrl, locale, news)} />
      <NewsDetailClient news={news} />
    </>
  );
}
