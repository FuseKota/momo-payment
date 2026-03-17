import { getSupabaseAdmin } from '@/lib/supabase/admin';
import TaiwanNightMarketClient from './TaiwanNightMarketClient';

export default async function TaiwanNightMarketPage() {
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3);

  return <TaiwanNightMarketClient news={news ?? []} />;
}
