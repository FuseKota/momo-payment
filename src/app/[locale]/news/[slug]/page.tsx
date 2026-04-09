import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import NewsDetailClient from './NewsDetailClient';

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
  const { slug } = await params;
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

  return <NewsDetailClient news={news} />;
}
