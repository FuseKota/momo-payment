import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getProductBySlugResult } from '@/lib/api/product-queries';
import ProductDetailClient from './ProductDetailClient';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, productSchema } from '@/lib/seo/structured-data';
import { getLocalizedName } from '@/lib/utils/localize-product';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';

// ISR: 商品詳細をサーバー側でプリレンダリングし、LCP 画像を初期 HTML に含める。
// 商品カタログは更新頻度が低いため 300 秒でエッジキャッシュを長めに保ち TTFB を安定させる
export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true);
    return (data || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';

  try {
    const supabase = getSupabaseAdmin();
    const { data: product } = await supabase
      .from('products')
      .select('name, name_zh_tw, name_en, description, description_zh_tw, description_en, image_url')
      .eq('slug', slug)
      .single();

    if (!product) return {};

    const name =
      locale === 'zh-tw' ? (product.name_zh_tw || product.name)
      : locale === 'en' ? (product.name_en || product.name)
      : product.name;
    const description =
      locale === 'zh-tw' ? (product.description_zh_tw || product.description)
      : locale === 'en' ? (product.description_en || product.description)
      : product.description;
    return {
      title: name,
      description: description || name,
      alternates: {
        canonical: localeUrl(appUrl, locale, `/shop/${slug}`),
        languages: languageAlternates(appUrl, `/shop/${slug}`),
      },
      openGraph: {
        title: name,
        description: description || '',
        url: localeUrl(appUrl, locale, `/shop/${slug}`),
        images: product.image_url
          ? [{ url: product.image_url, width: 1200, height: 630, alt: name }]
          : undefined,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: name,
        description: description || '',
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  // 取得失敗（DB障害等）と「本当に存在しない slug」を区別する。
  // 存在しない slug は 404、取得失敗は ProductDetailClient でエラー表示する。
  const { product, error: loadError } = await getProductBySlugResult(slug);

  if (!product && !loadError) {
    notFound();
  }

  const homeLabel = locale === 'zh-tw' ? '首頁' : locale === 'en' ? 'Home' : 'ホーム';
  const shopLabel = locale === 'zh-tw' ? '商店' : locale === 'en' ? 'Shop' : 'ショップ';

  return (
    <>
      {product && (
        <>
          <JsonLd
            data={breadcrumbSchema(appUrl, locale, [
              { name: homeLabel, path: '' },
              { name: shopLabel, path: '/shop' },
              {
                name: getLocalizedName(product, locale),
                path: `/shop/${slug}`,
              },
            ])}
          />
          <JsonLd data={productSchema(appUrl, locale, product)} />
        </>
      )}
      <ProductDetailClient product={product} loadError={loadError} />
    </>
  );
}
