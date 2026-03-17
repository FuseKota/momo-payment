import { getSupabaseAdmin } from '@/lib/supabase/admin';
import NewsListClient from './NewsListClient';

export default async function NewsPage() {
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return <NewsListClient items={news ?? []} />;
}
