import { z } from 'zod';

/**
 * 食品表示ラベルスキーマ（FoodLabel インターフェースに対応）
 */
const foodLabelSchema = z.object({
  ingredients: z.string().max(1000).optional(),
  allergens: z.string().max(500).optional(),
  nutrition: z.object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    carbohydrates: z.number().min(0).optional(),
    sodium: z.number().min(0).optional(),
  }).optional(),
  net_weight_grams: z.number().min(0).optional(),
  expiry_info: z.string().max(200).optional(),
  storage_method: z.string().max(200).optional(),
  manufacturer: z.string().max(200).optional(),
}).nullable().optional();

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
 * 制御文字・ゼロ幅文字を除去するヘルパー
 */
function stripControlChars(val: string): string {
  // ASCII control, Zero-width joiner/non-joiner, BOM, LRM/RLM, ゼロ幅スペース類を除去
  return val
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
    .replace(/[​-‏﻿‪-‮⁦-⁩]/g, '')
    .trim();
}

/**
 * 名前バリデーション
 */
export const nameSchema = z
  .string()
  .min(1, 'お名前を入力してください')
  .max(100, 'お名前は100文字以内で入力してください')
  .transform(stripControlChars)
  .refine((v) => v.length > 0, { message: 'お名前を入力してください' });

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
  pref: z.string().min(1, '都道府県を入力してください').max(10).transform(stripControlChars),
  city: z.string().min(1, '市区町村を入力してください').max(50).transform(stripControlChars),
  address1: z.string().min(1, '番地を入力してください').max(200).transform(stripControlChars),
  address2: z.string().max(200).optional().transform((v) => (v ? stripControlChars(v) : v)),
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

/**
 * 管理者：商品作成スキーマ
 */
export const adminProductCreateSchema = z.object({
  name: z.string().min(1, '商品名を入力してください').max(200),
  slug: z.string().min(1, 'スラッグを入力してください').max(100).regex(/^[a-z0-9-]+$/, 'スラッグは小文字英数字とハイフンのみ使用できます'),
  description: z.string().max(2000).optional(),
  kind: z.enum(['FROZEN_FOOD', 'GOODS']),
  temp_zone: z.enum(['FROZEN', 'AMBIENT']).nullable().optional(),
  price_yen: z.number().int().min(0).max(1000000),
  can_pickup: z.boolean().optional(),
  can_ship: z.boolean().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  stock_qty: z.number().int().min(0).nullable().optional(),
  sort_order: z.number().int().optional(),
  has_variants: z.boolean().optional(),
  food_label: foodLabelSchema,
  name_zh_tw: z.string().nullable().optional(),
  description_zh_tw: z.string().nullable().optional(),
  food_label_zh_tw: foodLabelSchema,
});

/**
 * 管理者：商品更新スキーマ（全フィールドオプション）
 */
export const adminProductUpdateSchema = adminProductCreateSchema.partial();

/**
 * 管理者：商品並び替えスキーマ
 */
export const adminProductReorderSchema = z.object({
  items: z.array(
    z.object({
      id: uuidSchema,
      sort_order: z.number().int().min(0).max(9999),
    })
  ).min(1).max(100),
});

/**
 * 管理者：ニュース作成スキーマ
 */
export const adminNewsCreateSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください').max(200),
  slug: z.string().min(1, 'スラッグを入力してください').max(100).regex(/^[a-z0-9-]+$/, 'スラッグは小文字英数字とハイフンのみ使用できます'),
  content: z.string().max(50000).nullable().optional(),
  excerpt: z.string().max(500).nullable().optional(),
  category: z.string().max(100).optional(),
  is_published: z.boolean().optional(),
  published_at: z.string().nullable().optional(),
});

/**
 * 管理者：ニュース更新スキーマ（全フィールドオプション）
 */
export const adminNewsUpdateSchema = adminNewsCreateSchema.partial();

/**
 * 飯舘村台湾夜市カレンダー：イベントタイプ
 */
export const iitateCalendarEventTypeSchema = z.enum(['day', 'night', 'closed', 'stage']);

/**
 * 管理者：飯舘村カレンダーイベント作成スキーマ
 */
export const adminIitateCalendarEventCreateSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません (YYYY-MM-DD)'),
  types: z.array(iitateCalendarEventTypeSchema).min(1, 'タイプを1つ以上選択してください').max(4),
  time_range: z.string().max(100).nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

/**
 * 管理者：飯舘村カレンダーイベント更新スキーマ
 */
export const adminIitateCalendarEventUpdateSchema = adminIitateCalendarEventCreateSchema.partial();

/**
 * 管理者：飯舘村カレンダー月別ノート更新スキーマ（upsert）
 */
export const adminIitateCalendarMonthNoteSchema = z.object({
  year_month: z.string().regex(/^\d{4}-\d{2}$/, '年月の形式が正しくありません (YYYY-MM)'),
  notes: z.array(z.string().max(500)).max(10),
});

/**
 * 管理者：注文ステータス更新スキーマ
 */
export const adminOrderUpdateSchema = z.object({
  status: z.enum(['PAID', 'PACKING', 'SHIPPED', 'FULFILLED', 'CANCELED']).optional(),
  tracking_number: z.string().max(100).nullable().optional(),
});

/**
 * 管理者：発送登録スキーマ
 */
export const adminShipSchema = z.object({
  carrier: z.string().min(1, '配送業者を入力してください').max(50),
  trackingNo: z.string().min(1, '追跡番号を入力してください').max(100),
});

/**
 * 管理者：入金確認スキーマ
 */
export const adminMarkPaidSchema = z.object({
  note: z.string().max(500).optional(),
});

/**
 * 住所保存スキーマ（mypage用）
 */
export const savedAddressSchema = z.object({
  label: z.string().max(50).optional(),
  recipientName: nameSchema,
  recipientPhone: phoneSchema,
  postalCode: postalCodeSchema,
  pref: z.string().min(1).max(10),
  city: z.string().min(1).max(50),
  address1: z.string().min(1).max(200),
  address2: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

export type PickupOrderInput = z.infer<typeof pickupOrderSchema>;
export type ShippingOrderInput = z.infer<typeof shippingOrderSchema>;
