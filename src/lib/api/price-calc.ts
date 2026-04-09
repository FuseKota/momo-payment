import { toInt } from '@/lib/utils/format';
import type { FetchedProduct } from './product-helpers';

export interface CalculatedItem {
  product: FetchedProduct;
  variant?: { id: string; product_id: string; size: string | null; price_yen: number | null };
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * 注文アイテムの金額を計算する
 * qty の範囲チェック（1~99）も行う
 */
export function calculateOrderItems(
  orderItems: Array<{ productId: string; qty: number; variantId?: string }>,
  products: FetchedProduct[],
  variants?: Array<{ id: string; product_id: string; size: string | null; price_yen: number | null }>
): CalculatedItem[] {
  return orderItems.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    if (!p) throw new Error(`Product not found: ${i.productId}`);
    const v = i.variantId ? variants?.find((x) => x.id === i.variantId) : undefined;
    const qty = toInt(i.qty);
    if (qty <= 0 || qty > 99) {
      throw new Error('qty out of range');
    }
    const unitPrice = v?.price_yen ?? p.price_yen;
    const lineTotal = unitPrice * qty;
    return { product: p, variant: v, qty, unitPrice, lineTotal };
  });
}

/**
 * 小計を計算する
 */
export function calculateSubtotal(items: CalculatedItem[]): number {
  return items.reduce((sum, x) => sum + x.lineTotal, 0);
}
