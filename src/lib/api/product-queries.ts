import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Product, ProductVariant, ProductWithVariants } from '@/types/database';

/**
 * 配送（SHIPPING）対象の公開商品一覧をサーバー側で取得する。
 * Server Component から直接呼び出し、初期 HTML に商品・画像を含めるために使う。
 * （クライアントからの `/api/products?mode=shipping` フェッチを置き換える）
 */
export async function getShippingProducts(): Promise<Product[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('can_ship', true)
    .order('sort_order');

  if (error || !data) return [];
  return data as Product[];
}

/**
 * slug 単一商品を variants 付きでサーバー側取得する。
 * 見つからない場合は null を返す（呼び出し側で notFound() 等を行う）。
 * （クライアントからの `/api/products?slug=` フェッチを置き換える）
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithVariants | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      variants:product_variants(
        id,
        product_id,
        size,
        price_yen,
        stock_qty,
        is_active,
        sort_order,
        created_at,
        updated_at
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  // アクティブな variant のみに絞り、sort_order で並べ替え
  const product = data as ProductWithVariants;
  if (Array.isArray(product.variants)) {
    product.variants = product.variants
      .filter((v: ProductVariant) => v.is_active)
      .sort((a: ProductVariant, b: ProductVariant) => a.sort_order - b.sort_order);
  }

  return product;
}
