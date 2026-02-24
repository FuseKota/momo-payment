import { describe, it, expect } from 'vitest';
import { calculateOrderItems, calculateSubtotal } from '../price-calc';
import type { FetchedProduct } from '../product-helpers';

const mockProduct = (overrides: Partial<FetchedProduct> = {}): FetchedProduct => ({
  id: 'prod-1',
  name: 'テスト商品',
  name_zh_tw: null,
  kind: 'FROZEN_FOOD',
  temp_zone: 'FROZEN',
  price_yen: 1000,
  can_pickup: true,
  can_ship: true,
  is_active: true,
  ...overrides,
});

describe('price-calc', () => {
  describe('calculateOrderItems', () => {
    it('単一商品の金額を正しく計算する', () => {
      const products = [mockProduct()];
      const items = calculateOrderItems(
        [{ productId: 'prod-1', qty: 2 }],
        products
      );
      expect(items).toHaveLength(1);
      expect(items[0].qty).toBe(2);
      expect(items[0].unitPrice).toBe(1000);
      expect(items[0].lineTotal).toBe(2000);
    });

    it('複数商品の金額を正しく計算する', () => {
      const products = [
        mockProduct({ id: 'prod-1', price_yen: 1000 }),
        mockProduct({ id: 'prod-2', price_yen: 500 }),
      ];
      const items = calculateOrderItems(
        [
          { productId: 'prod-1', qty: 1 },
          { productId: 'prod-2', qty: 3 },
        ],
        products
      );
      expect(items).toHaveLength(2);
      expect(items[0].lineTotal).toBe(1000);
      expect(items[1].lineTotal).toBe(1500);
    });

    it('バリアント価格を優先する', () => {
      const products = [mockProduct({ id: 'prod-1', price_yen: 1000 })];
      const variants = [{ id: 'var-1', product_id: 'prod-1', size: 'L', price_yen: 1500 }];
      const items = calculateOrderItems(
        [{ productId: 'prod-1', qty: 2, variantId: 'var-1' }],
        products,
        variants
      );
      expect(items[0].unitPrice).toBe(1500);
      expect(items[0].lineTotal).toBe(3000);
      expect(items[0].variant?.size).toBe('L');
    });

    it('バリアント価格がnullの場合は商品価格を使用する', () => {
      const products = [mockProduct({ id: 'prod-1', price_yen: 1000 })];
      const variants = [{ id: 'var-1', product_id: 'prod-1', size: 'M', price_yen: null }];
      const items = calculateOrderItems(
        [{ productId: 'prod-1', qty: 1, variantId: 'var-1' }],
        products,
        variants
      );
      expect(items[0].unitPrice).toBe(1000);
    });

    it('数量が0以下の場合はエラーを投げる', () => {
      const products = [mockProduct()];
      expect(() =>
        calculateOrderItems([{ productId: 'prod-1', qty: 0 }], products)
      ).toThrow('qty out of range');
    });

    it('数量が100以上の場合はエラーを投げる', () => {
      const products = [mockProduct()];
      expect(() =>
        calculateOrderItems([{ productId: 'prod-1', qty: 100 }], products)
      ).toThrow('qty out of range');
    });

    it('数量99は許可される', () => {
      const products = [mockProduct()];
      const items = calculateOrderItems(
        [{ productId: 'prod-1', qty: 99 }],
        products
      );
      expect(items[0].qty).toBe(99);
    });
  });

  describe('calculateSubtotal', () => {
    it('空配列の場合は0を返す', () => {
      expect(calculateSubtotal([])).toBe(0);
    });

    it('複数アイテムの合計を正しく計算する', () => {
      const products = [
        mockProduct({ id: 'prod-1', price_yen: 1000 }),
        mockProduct({ id: 'prod-2', price_yen: 500 }),
      ];
      const items = calculateOrderItems(
        [
          { productId: 'prod-1', qty: 2 },
          { productId: 'prod-2', qty: 3 },
        ],
        products
      );
      expect(calculateSubtotal(items)).toBe(3500);
    });
  });
});
