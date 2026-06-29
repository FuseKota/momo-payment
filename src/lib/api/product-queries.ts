import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Product, ProductVariant, ProductWithVariants } from '@/types/database';

/**
 * 配送（SHIPPING）対象の公開商品一覧をサーバー側で取得する。
 * Server Component から直接呼び出し、初期 HTML に商品・画像を含めるために使う。
 * （クライアントからの `/api/products?mode=shipping` フェッチを置き換える）
 *
 * 取得失敗（DB障害等）と「本当に0件」を呼び出し側で区別できるよう、
 * `error` フラグ付きで返す。失敗時は products を空配列に倒しつつ error: true とする。
 */
export async function getShippingProductsResult(): Promise<{
  products: Product[];
  error: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('can_ship', true)
    .is('deleted_at', null)
    .order('sort_order');

  if (error || !data) return { products: [], error: true };
  return { products: data as Product[], error: false };
}

/**
 * slug 単一商品を variants 付きでサーバー側取得する。
 * （クライアントからの `/api/products?slug=` フェッチを置き換える）
 *
 * 「本当に存在しない slug（404）」と「DB障害等の取得失敗」を呼び出し側で
 * 区別できるよう、`error` フラグ付きで返す。
 * - 存在しない: { product: null, error: false } → 呼び出し側で notFound()
 * - 取得失敗:   { product: null, error: true }  → 呼び出し側でエラー表示
 *
 * `.single()` は対象0件のとき PGRST116 エラーを返すため、これは「存在しない」
 * （error: false）として扱い、それ以外の error のみ取得失敗とみなす。
 */
export async function getProductBySlugResult(
  slug: string
): Promise<{ product: ProductWithVariants | null; error: boolean }> {
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
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 = 行が見つからない（`.single()` で0件）。これは「存在しない」扱い
    const notFound = error.code === 'PGRST116';
    return { product: null, error: !notFound };
  }
  if (!data) return { product: null, error: false };

  // アクティブな variant のみに絞り、sort_order で並べ替え
  const product = data as ProductWithVariants;
  if (Array.isArray(product.variants)) {
    product.variants = product.variants
      .filter((v: ProductVariant) => v.is_active)
      .sort((a: ProductVariant, b: ProductVariant) => a.sort_order - b.sort_order);
  }

  return { product, error: false };
}
