import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import HomeClient from './HomeClient';
import { JsonLd } from '@/components/JsonLd';
import {
  organizationSchema,
  websiteSchema,
  localBusinessSchema,
} from '@/lib/seo/structured-data';

// ニュースセクションを60秒ごとに再生成（ISR）
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  return {
    title: t('home.title'),
    description: t('home.description'),
    alternates: {
      canonical: localeUrl(appUrl, locale),
      languages: languageAlternates(appUrl),
    },
    openGraph: {
      title: t('home.title'),
      description: t('home.description'),
      url: localeUrl(appUrl, locale),
      type: 'website',
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3);

  return (
    <>
      <JsonLd data={organizationSchema(appUrl, locale)} />
      <JsonLd data={websiteSchema(appUrl, locale)} />
      <JsonLd data={localBusinessSchema(appUrl, locale)} />
      <HomeClient news={news ?? []} />
    </>
  );
}
