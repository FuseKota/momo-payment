import { z } from 'zod';

/**
 * 日本の電話番号バリデーション
 * 形式: 090-1234-5678, 09012345678, 03-1234-5678 等
 */
export const phoneSchema = z
  .string()
  .min(1, '電話番号を入力してください')
  .regex(/^0[0-9\-]{9,13}$/, '電話番号の形式が正しくありません');

/**
 * メールアドレスバリデーション
 */
export const emailSchema = z
  .string()
  .min(1, 'メールアドレスを入力してください')
  .email('メールアドレスの形式が正しくありません');

/**
 * 日本の郵便番号バリデーション
 * 形式: 123-4567 または 1234567
 */
export const postalCodeSchema = z
  .string()
  .min(1, '郵便番号を入力してください')
  .regex(/^\d{3}-?\d{4}$/, '郵便番号の形式が正しくありません');

/**
 * 名前バリデーション
 */
export const nameSchema = z
  .string()
  .min(1, 'お名前を入力してください')
  .max(100, 'お名前は100文字以内で入力してください')
  .transform((val) => val.trim());

/**
 * 商品数量バリデーション
 */
export const qtySchema = z
  .number()
  .int('数量は整数で入力してください')
  .min(1, '数量は1以上で入力してください')
  .max(99, '数量は99以下で入力してください');

/**
 * UUID バリデーション
 */
export const uuidSchema = z.string().uuid('無効なIDです');

/**
 * カートアイテムスキーマ
 */
export const cartItemSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.optional(),
  qty: qtySchema,
});

/**
 * 顧客情報スキーマ
 */
export const customerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

/**
 * 配送先住所スキーマ
 */
export const addressSchema = z.object({
  postalCode: postalCodeSchema,
  pref: z.string().min(1, '都道府県を入力してください').max(10),
  city: z.string().min(1, '市区町村を入力してください').max(50),
  address1: z.string().min(1, '番地を入力してください').max(200),
  address2: z.string().max(200).optional(),
});

/**
 * キッチンカー（PICKUP）注文スキーマ
 */
export const pickupOrderSchema = z.object({
  customer: customerSchema,
  items: z
    .array(cartItemSchema)
    .min(1, 'カートに商品がありません')
    .max(50, '一度に注文できる商品は50種類までです'),
  paymentMethod: z.enum(['STRIPE', 'PAY_AT_PICKUP'], {
    message: '支払い方法を選択してください',
  }),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  notes: z.string().max(500).optional(),
  agreementAccepted: z.literal(true, {
    message: '利用規約に同意してください',
  }),
});

/**
 * 配送（SHIPPING）注文スキーマ
 */
export const shippingOrderSchema = z.object({
  customer: customerSchema,
  address: addressSchema,
  items: z
    .array(cartItemSchema)
    .min(1, 'カートに商品がありません')
    .max(50, '一度に注文できる商品は50種類までです'),
  agreementAccepted: z.literal(true, {
    message: '利用規約に同意してください',
  }),
});

/**
 * バリデーションエラーをユーザーフレンドリーな形式に変換
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

export type PickupOrderInput = z.infer<typeof pickupOrderSchema>;
export type ShippingOrderInput = z.infer<typeof shippingOrderSchema>;
