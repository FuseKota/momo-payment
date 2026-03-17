import { ImageResponse } from 'next/og';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  let productName = '';
  let productDescription = '';
  let productImage: string | null = null;
  let priceYen: number | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: product } = await supabase
      .from('products')
      .select('name, name_zh_tw, description, description_zh_tw, image_url, price_yen')
      .eq('slug', slug)
      .single();

    if (product) {
      productName =
        locale === 'zh-tw'
          ? (product.name_zh_tw || product.name)
          : product.name;
      productDescription =
        locale === 'zh-tw'
          ? (product.description_zh_tw || product.description || '')
          : (product.description || '');
      productImage = product.image_url;
      priceYen = product.price_yen;
    }
  } catch {
    // fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF0F3 0%, #FFE0E6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Product image */}
        {productImage && (
          <div
            style={{
              width: '50%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImage}
              alt={productName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Product info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: productImage ? '48px 48px 48px 40px' : 60,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: '#999',
              marginBottom: 16,
            }}
          >
            momomusume
          </div>
          <div
            style={{
              fontSize: productName.length > 15 ? 40 : 52,
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {productName || 'Product'}
          </div>
          {productDescription && (
            <div
              style={{
                fontSize: 22,
                color: '#666',
                marginBottom: 24,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {productDescription}
            </div>
          )}
          {priceYen && (
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#FF6680',
              }}
            >
              ¥{priceYen.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
