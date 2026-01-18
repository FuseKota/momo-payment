/**
 * バリデーションスキーマのユニットテスト
 */
import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  emailSchema,
  postalCodeSchema,
  nameSchema,
  qtySchema,
  uuidSchema,
  pickupOrderSchema,
  shippingOrderSchema,
} from '../schemas';

describe('validation schemas', () => {
  describe('phoneSchema', () => {
    it('有効な電話番号を受け入れる', () => {
      expect(phoneSchema.safeParse('090-1234-5678').success).toBe(true);
      expect(phoneSchema.safeParse('09012345678').success).toBe(true);
      expect(phoneSchema.safeParse('03-1234-5678').success).toBe(true);
      expect(phoneSchema.safeParse('0312345678').success).toBe(true);
      expect(phoneSchema.safeParse('0120-123-456').success).toBe(true);
    });

    it('無効な電話番号を拒否する', () => {
      expect(phoneSchema.safeParse('').success).toBe(false);
      expect(phoneSchema.safeParse('123-456-7890').success).toBe(false); // 0で始まらない
      expect(phoneSchema.safeParse('abc').success).toBe(false);
      expect(phoneSchema.safeParse('090').success).toBe(false); // 短すぎる
    });
  });

  describe('emailSchema', () => {
    it('有効なメールアドレスを受け入れる', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name@domain.co.jp').success).toBe(true);
    });

    it('無効なメールアドレスを拒否する', () => {
      expect(emailSchema.safeParse('').success).toBe(false);
      expect(emailSchema.safeParse('invalid').success).toBe(false);
      expect(emailSchema.safeParse('no@domain').success).toBe(false);
    });
  });

  describe('postalCodeSchema', () => {
    it('有効な郵便番号を受け入れる', () => {
      expect(postalCodeSchema.safeParse('123-4567').success).toBe(true);
      expect(postalCodeSchema.safeParse('1234567').success).toBe(true);
    });

    it('無効な郵便番号を拒否する', () => {
      expect(postalCodeSchema.safeParse('').success).toBe(false);
      expect(postalCodeSchema.safeParse('123-456').success).toBe(false); // 桁数不足
      expect(postalCodeSchema.safeParse('12345678').success).toBe(false); // 桁数超過
      expect(postalCodeSchema.safeParse('abc-defg').success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('有効な名前を受け入れる', () => {
      expect(nameSchema.safeParse('山田太郎').success).toBe(true);
      expect(nameSchema.safeParse('John Doe').success).toBe(true);
    });

    it('空の名前を拒否する', () => {
      expect(nameSchema.safeParse('').success).toBe(false);
    });

    it('100文字を超える名前を拒否する', () => {
      const longName = 'あ'.repeat(101);
      expect(nameSchema.safeParse(longName).success).toBe(false);
    });

    it('前後の空白をトリムする', () => {
      const result = nameSchema.safeParse('  山田太郎  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('山田太郎');
      }
    });
  });

  describe('qtySchema', () => {
    it('有効な数量を受け入れる', () => {
      expect(qtySchema.safeParse(1).success).toBe(true);
      expect(qtySchema.safeParse(50).success).toBe(true);
      expect(qtySchema.safeParse(99).success).toBe(true);
    });

    it('0以下を拒否する', () => {
      expect(qtySchema.safeParse(0).success).toBe(false);
      expect(qtySchema.safeParse(-1).success).toBe(false);
    });

    it('100以上を拒否する', () => {
      expect(qtySchema.safeParse(100).success).toBe(false);
    });

    it('小数を拒否する', () => {
      expect(qtySchema.safeParse(1.5).success).toBe(false);
    });
  });

  describe('uuidSchema', () => {
    it('有効なUUIDを受け入れる', () => {
      expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('無効なUUIDを拒否する', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidSchema.safeParse('').success).toBe(false);
    });
  });

  describe('pickupOrderSchema', () => {
    const validPickupOrder = {
      customer: {
        name: '山田太郎',
        phone: '090-1234-5678',
        email: 'test@example.com',
      },
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          qty: 2,
        },
      ],
      paymentMethod: 'STRIPE' as const,
      agreementAccepted: true as const,
    };

    it('有効な注文を受け入れる', () => {
      expect(pickupOrderSchema.safeParse(validPickupOrder).success).toBe(true);
    });

    it('PAY_AT_PICKUPも受け入れる', () => {
      const order = { ...validPickupOrder, paymentMethod: 'PAY_AT_PICKUP' as const };
      expect(pickupOrderSchema.safeParse(order).success).toBe(true);
    });

    it('同意なしを拒否する', () => {
      const order = { ...validPickupOrder, agreementAccepted: false };
      expect(pickupOrderSchema.safeParse(order).success).toBe(false);
    });

    it('空のカートを拒否する', () => {
      const order = { ...validPickupOrder, items: [] };
      expect(pickupOrderSchema.safeParse(order).success).toBe(false);
    });

    it('50種類を超える商品を拒否する', () => {
      const items = Array.from({ length: 51 }, (_, i) => ({
        productId: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
        qty: 1,
      }));
      const order = { ...validPickupOrder, items };
      expect(pickupOrderSchema.safeParse(order).success).toBe(false);
    });

    it('無効な支払い方法を拒否する', () => {
      const order = { ...validPickupOrder, paymentMethod: 'INVALID' };
      expect(pickupOrderSchema.safeParse(order).success).toBe(false);
    });
  });

  describe('shippingOrderSchema', () => {
    const validShippingOrder = {
      customer: {
        name: '山田太郎',
        phone: '090-1234-5678',
        email: 'test@example.com',
      },
      address: {
        postalCode: '123-4567',
        pref: '東京都',
        city: '渋谷区',
        address1: '渋谷1-2-3',
        address2: 'マンション101',
      },
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          qty: 1,
        },
      ],
      agreementAccepted: true as const,
    };

    it('有効な配送注文を受け入れる', () => {
      expect(shippingOrderSchema.safeParse(validShippingOrder).success).toBe(true);
    });

    it('住所なしを拒否する', () => {
      const { address, ...orderWithoutAddress } = validShippingOrder;
      expect(shippingOrderSchema.safeParse(orderWithoutAddress).success).toBe(false);
    });

    it('variantIdを含む注文を受け入れる', () => {
      const order = {
        ...validShippingOrder,
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            variantId: '660e8400-e29b-41d4-a716-446655440000',
            qty: 1,
          },
        ],
      };
      expect(shippingOrderSchema.safeParse(order).success).toBe(true);
    });
  });
});
