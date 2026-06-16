import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import NewsDetailClient from './NewsDetailClient';
import { JsonLd } from '@/components/JsonLd';
import { articleSchema, breadcrumbSchema } from '@/lib/seo/structured-data';

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!news) return { title: 'Not Found' };

  return {
    title: news.title,
    description: news.excerpt || news.title,
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
          { name: news.title, path: `/news/${news.slug}` },
        ])}
      />
      <JsonLd data={articleSchema(appUrl, locale, news)} />
      <NewsDetailClient news={news} />
    </>
  );
}
