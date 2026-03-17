import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import NewsDetailClient from './NewsDetailClient';

interface Props {
  params: Promise<{ slug: string; locale: string }>;
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
