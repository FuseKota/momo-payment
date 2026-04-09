import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import NewsListClient from './NewsListClient';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'news' });
  return {
    title: t('heading'),
    description: t('heading'),
  };
}

export default async function NewsPage() {
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return <NewsListClient items={news ?? []} />;
}
