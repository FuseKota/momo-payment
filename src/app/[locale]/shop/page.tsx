import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ShopClient from './ShopClient';

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

export default function ShopPage() {
  return <ShopClient />;
}
