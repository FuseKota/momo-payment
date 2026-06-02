import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getShippingProducts } from '@/lib/api/product-queries';
import ShopClient from './ShopClient';

// ISR: 商品一覧をサーバー側でプリレンダリングし、画像を初期 HTML に含める
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
    title: t('shop.title'),
    description: t('shop.description'),
    alternates: {
      canonical: `${appUrl}/${locale}/shop`,
      languages: {
        ja: `${appUrl}/ja/shop`,
        'zh-TW': `${appUrl}/zh-tw/shop`,
        'x-default': `${appUrl}/ja/shop`,
      },
    },
    openGraph: {
      title: t('shop.title'),
      description: t('shop.description'),
      url: `${appUrl}/${locale}/shop`,
      type: 'website',
    },
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const products = await getShippingProducts();
  return <ShopClient initialProducts={products} />;
}
