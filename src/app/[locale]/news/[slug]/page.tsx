import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import NewsDetailClient from './NewsDetailClient';
import { JsonLd } from '@/components/JsonLd';
import { articleSchema, breadcrumbSchema } from '@/lib/seo/structured-data';
import { getLocalizedNewsTitle, getLocalizedNewsExcerpt } from '@/lib/utils/localize-news';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('title, excerpt, title_zh_tw, excerpt_zh_tw, title_en, excerpt_en')
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
      canonical: localeUrl(appUrl, locale, `/news/${slug}`),
      languages: languageAlternates(appUrl, `/news/${slug}`),
    },
    openGraph: {
      title,
      description: excerpt || title,
      url: localeUrl(appUrl, locale, `/news/${slug}`),
      type: 'article',
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
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

  const homeLabel = locale === 'zh-tw' ? '首頁' : locale === 'en' ? 'Home' : 'ホーム';
  const newsLabel = locale === 'zh-tw' ? '最新消息' : locale === 'en' ? 'News' : 'ニュース';

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(appUrl, locale, [
          { name: homeLabel, path: '' },
          { name: newsLabel, path: '/news' },
          { name: getLocalizedNewsTitle(news, locale), path: `/news/${news.slug}` },
        ])}
      />
      <JsonLd data={articleSchema(appUrl, locale, news)} />
      <NewsDetailClient news={news} />
    </>
  );
}
