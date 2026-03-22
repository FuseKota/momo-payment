import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import HomeClient from './HomeClient';

// ニュースセクションを60秒ごとに再生成（ISR）
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';

  return {
    title: t('home.title'),
    description: t('home.description'),
    alternates: {
      canonical: `${appUrl}/${locale}`,
      languages: {
        ja: `${appUrl}/ja`,
        'zh-TW': `${appUrl}/zh-tw`,
        'x-default': `${appUrl}/ja`,
      },
    },
    openGraph: {
      title: t('home.title'),
      description: t('home.description'),
      url: `${appUrl}/${locale}`,
      type: 'website',
    },
  };
}

export default async function Home() {
  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3);

  return <HomeClient news={news ?? []} />;
}
