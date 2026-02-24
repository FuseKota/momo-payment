/**
 * API側で使う商品名ローカライズヘルパー
 * フロントエンド用の getLocalizedName (localize-product.ts) とは異なり、
 * DBから取得した部分的な型でも動作する
 */
export function localizedProductName(
  product: { name: string; name_zh_tw?: string | null },
  locale: string
): string {
  if (locale === 'zh-tw' && product.name_zh_tw) return product.name_zh_tw;
  return product.name;
}
