import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import ProductDetailClient from './ProductDetailClient';

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';

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
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProductDetailClient params={params} />;
}
