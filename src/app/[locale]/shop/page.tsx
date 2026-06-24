import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';
import { getShippingProductsResult } from '@/lib/api/product-queries';
import ShopClient from './ShopClient';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, shopItemListSchema } from '@/lib/seo/structured-data';

// ISR: 商品一覧をサーバー側でプリレンダリングし、画像を初期 HTML に含める。
// 商品カタログは更新頻度が低いため 300 秒でエッジキャッシュを長めに保ち TTFB を安定させる
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  return {
    title: t('shop.title'),
    description: t('shop.description'),
    alternates: {
      canonical: localeUrl(appUrl, locale, '/shop'),
      languages: languageAlternates(appUrl, '/shop'),
    },
    openGraph: {
      title: t('shop.title'),
      description: t('shop.description'),
      url: localeUrl(appUrl, locale, '/shop'),
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  // 取得失敗（DB障害等）と0件を区別し、失敗時は ShopClient でエラー表示する
  const { products, error: loadError } = await getShippingProductsResult();

  const homeLabel = locale === 'zh-tw' ? '首頁' : locale === 'en' ? 'Home' : 'ホーム';
  const shopLabel = locale === 'zh-tw' ? '商店' : locale === 'en' ? 'Shop' : 'ショップ';

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(appUrl, locale, [
          { name: homeLabel, path: '' },
          { name: shopLabel, path: '/shop' },
        ])}
      />
      <JsonLd data={shopItemListSchema(appUrl, locale, products)} />
      <ShopClient initialProducts={products} loadError={loadError} />
    </>
  );
}
