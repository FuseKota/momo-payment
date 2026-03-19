import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import TaiwanNightMarketClient from './TaiwanNightMarketClient';
import { JsonLd } from '@/components/JsonLd';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';

  return {
    title: t('taiwanNightMarket.title'),
    description: t('taiwanNightMarket.description'),
    alternates: {
      canonical: `${appUrl}/${locale}/taiwan-night-market`,
      languages: {
        ja: `${appUrl}/ja/taiwan-night-market`,
        'zh-TW': `${appUrl}/zh-tw/taiwan-night-market`,
        'x-default': `${appUrl}/ja/taiwan-night-market`,
      },
    },
    openGraph: {
      title: t('taiwanNightMarket.title'),
      description: t('taiwanNightMarket.description'),
      url: `${appUrl}/${locale}/taiwan-night-market`,
      type: 'website',
    },
  };
}

export default async function TaiwanNightMarketPage({ params }: Props) {
  const { locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';

  const supabase = getSupabaseAdmin();
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3);

  const isJa = locale === 'ja';

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isJa ? 'ホーム' : '首頁',
        item: `${appUrl}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: isJa ? '台湾夜市' : '台灣夜市',
        item: `${appUrl}/${locale}/taiwan-night-market`,
      },
    ],
  };

  const articleData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: isJa
      ? '台湾夜市ガイド - 人気夜市と必食グルメ'
      : '台灣夜市指南 - 熱門夜市與必吃美食',
    description: isJa
      ? '士林・饒河街・寧夏の人気台湾夜市と大鶏排・小籠包・臭豆腐などの必食グルメを紹介'
      : '介紹士林、饒河街、寧夏等熱門台灣夜市，以及大雞排、小籠包、臭豆腐等必吃美食',
    author: { '@type': 'Organization', name: isJa ? 'もも娘' : '桃娘' },
    publisher: {
      '@type': 'Organization',
      name: isJa ? 'もも娘' : '桃娘',
      logo: {
        '@type': 'ImageObject',
        url: `${appUrl}/images/momo-main-logo.png`,
      },
    },
    datePublished: '2024-01-01',
    mainEntityOfPage: `${appUrl}/${locale}/taiwan-night-market`,
  };

  const nightMarketListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isJa ? '人気台湾夜市' : '熱門台灣夜市',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isJa ? '士林夜市' : '士林夜市',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: isJa ? '饒河街観光夜市' : '饒河街觀光夜市',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: isJa ? '寧夏夜市' : '寧夏夜市',
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={articleData} />
      <JsonLd data={nightMarketListData} />
      <TaiwanNightMarketClient news={news ?? []} />
    </>
  );
}
