import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import TaiwanNightMarketClient from './TaiwanNightMarketClient';
import { JsonLd } from '@/components/JsonLd';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  return {
    title: t('taiwanNightMarket.title'),
    description: t('taiwanNightMarket.description'),
    alternates: {
      canonical: localeUrl(appUrl, locale, '/taiwan-night-market'),
      languages: languageAlternates(appUrl, '/taiwan-night-market'),
    },
    openGraph: {
      title: t('taiwanNightMarket.title'),
      description: t('taiwanNightMarket.description'),
      url: localeUrl(appUrl, locale, '/taiwan-night-market'),
      type: 'website',
    },
  };
}

export default async function TaiwanNightMarketPage({ params }: Props) {
  const { locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  const supabase = getSupabaseAdmin();
  const [{ data: momoNews }, { data: domesticNews }, { data: taiwanArticles }] = await Promise.all([
    supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('category', '福島もも娘')
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('category', '日本国内台湾夜市')
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('category', '本場台湾夜市')
      .order('published_at', { ascending: false }),
  ]);

  const isJa = locale === 'ja';

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'en' ? 'Home' : isJa ? 'ホーム' : '首頁',
        item: localeUrl(appUrl, locale),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'en' ? 'Taiwan Night Market' : isJa ? '台湾夜市' : '台灣夜市',
        item: localeUrl(appUrl, locale, '/taiwan-night-market'),
      },
    ],
  };

  const articleData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: locale === 'en'
      ? 'Taiwan Night Market Guide - Authentic Night Markets & Momomusume Events'
      : isJa
      ? '台湾夜市ガイド - 本場台湾夜市とももむすめイベント情報'
      : '台灣夜市指南 - 正宗台灣夜市與桃娘活動資訊',
    description: locale === 'en'
      ? 'Guides to authentic Taiwan night markets (Shilin, Raohe, Ningxia) plus Fukushima Momomusume and Japan-based Taiwan night market event info'
      : isJa
      ? '士林・饒河街・寧夏の本場台湾夜市情報と、福島ももむすめ・日本国内台湾夜市イベント情報を紹介'
      : '介紹士林、饒河街、寧夏等正宗台灣夜市，以及福島桃娘與日本國內台灣夜市活動資訊',
    author: { '@type': 'Organization', name: locale === 'en' ? 'Momomusume' : isJa ? 'もも娘' : '桃娘' },
    publisher: {
      '@type': 'Organization',
      name: locale === 'en' ? 'Momomusume' : isJa ? 'もも娘' : '桃娘',
      logo: {
        '@type': 'ImageObject',
        url: `${appUrl}/images/momo-main-logo.png`,
      },
    },
    datePublished: '2024-01-01',
    mainEntityOfPage: localeUrl(appUrl, locale, '/taiwan-night-market'),
  };

  const nightMarketListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'en' ? 'Popular Taiwan Night Markets' : isJa ? '人気台湾夜市' : '熱門台灣夜市',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'en' ? 'Shilin Night Market' : isJa ? '士林夜市' : '士林夜市',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'en' ? 'Raohe Street Night Market' : isJa ? '饒河街観光夜市' : '饒河街觀光夜市',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: locale === 'en' ? 'Ningxia Night Market' : isJa ? '寧夏夜市' : '寧夏夜市',
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={articleData} />
      <JsonLd data={nightMarketListData} />
      <TaiwanNightMarketClient momoNews={momoNews ?? []} domesticNews={domesticNews ?? []} taiwanArticles={taiwanArticles ?? []} />
    </>
  );
}
