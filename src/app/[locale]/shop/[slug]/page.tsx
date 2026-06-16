import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getProductBySlug } from '@/lib/api/product-queries';
import ProductDetailClient from './ProductDetailClient';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, productSchema } from '@/lib/seo/structured-data';

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
      .select('name, name_zh_tw, description, description_zh_tw, image_url')
      .eq('slug', slug)
      .single();

    if (!product) return {};

    const name =
      locale === 'zh-tw'
        ? (product.name_zh_tw || product.name)
        : product.name;
    const description =
      locale === 'zh-tw'
        ? (product.description_zh_tw || product.description)
        : product.description;
    return {
      title: name,
      description: description || name,
      alternates: {
        canonical: `${appUrl}/${locale}/shop/${slug}`,
        languages: {
          ja: `${appUrl}/ja/shop/${slug}`,
          'zh-TW': `${appUrl}/zh-tw/shop/${slug}`,
          'x-default': `${appUrl}/ja/shop/${slug}`,
        },
      },
      openGraph: {
        title: name,
        description: description || '',
        url: `${appUrl}/${locale}/shop/${slug}`,
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
  const ja = locale === 'ja';

  const product = await getProductBySlug(slug);

  return (
    <>
      {product && (
        <>
          <JsonLd
            data={breadcrumbSchema(appUrl, locale, [
              { name: ja ? 'ホーム' : '首頁', path: '' },
              { name: ja ? 'ショップ' : '商店', path: '/shop' },
              {
                name: ja ? product.name : product.name_zh_tw || product.name,
                path: `/shop/${slug}`,
              },
            ])}
          />
          <JsonLd data={productSchema(appUrl, locale, product)} />
        </>
      )}
      <ProductDetailClient product={product} />
    </>
  );
}
