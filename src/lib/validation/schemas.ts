import { z } from 'zod';
import { DELIVERY_TIME_SLOTS } from '@/lib/shipping/time-slots';
import { resolveZone } from '@/lib/shipping/calc';

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
 * お届け時間帯スキーマ（佐川急便の指定枠）
 */
export const deliveryTimeSlotSchema = z.enum(DELIVERY_TIME_SLOTS);

/**
 * 配送（SHIPPING）注文スキーマ
 *
 * deliveryDate の「最短日〜+14日」範囲チェックは注文日(now)に依存するため
 * route 側で行う（now を単一ソース化しテストを安定させるため）。
 * ここでは pref が配送対応地域かどうかのみ superRefine で検証する。
 */
export const shippingOrderSchema = z
  .object({
    customer: customerSchema,
    address: addressSchema,
    items: z
      .array(cartItemSchema)
      .min(1, 'カートに商品がありません')
      .max(50, '一度に注文できる商品は50種類までです'),
    deliveryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'お届け希望日の形式が正しくありません')
      .optional(),
    deliveryTimeSlot: deliveryTimeSlotSchema.optional(),
    agreementAccepted: z.literal(true, {
      message: '利用規約に同意してください',
    }),
  })
  .superRefine((data, ctx) => {
    // address 自体の欠落は object スキーマ側で検出済みのため、ここでは pref がある場合のみ判定
    if (data.address && resolveZone(data.address.pref) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['address', 'pref'],
        message: 'お届けに対応していない地域です',
      });
    }
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
  name_en: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  food_label_en: foodLabelSchema,
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
  title_zh_tw: z.string().max(200).nullable().optional(),
  excerpt_zh_tw: z.string().max(500).nullable().optional(),
  content_zh_tw: z.string().max(50000).nullable().optional(),
  title_en: z.string().max(200).nullable().optional(),
  excerpt_en: z.string().max(500).nullable().optional(),
  content_en: z.string().max(50000).nullable().optional(),
  is_published: z.boolean().optional(),
  published_at: z.string().nullable().optional(),
});

/**
 * 管理者：ニュース更新スキーマ（全フィールドオプション）
 */
export const adminNewsUpdateSchema = adminNewsCreateSchema.partial();

/**
 * 飯舘村台湾夜市カレンダー：イベントタイプ
 * （日毎イベントは Google カレンダーを正としており、マッパーで型として再利用する）
 */
export const iitateCalendarEventTypeSchema = z.enum(['day', 'night', 'closed', 'stage']);

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
 * 管理者：全額返金スキーマ
 * 全額返金のみ対応（部分返金なし）。reason は任意の管理メモ。
 */
export const adminRefundSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * 管理者：メール再送スキーマ
 */
export const adminResendEmailSchema = z.object({
  type: z.enum(['ORDER_CONFIRMATION', 'PAYMENT_CONFIRMATION', 'SHIPPING_NOTIFICATION'], {
    message: '再送するメール種別を選択してください',
  }),
});

/**
 * 管理者：注文一覧の絞り込み条件（GET /api/admin/orders と export で共用）
 * searchParams は全て string なので coerce/transform で正規化する。
 */
export const adminOrdersFilterSchema = z.object({
  type: z.enum(['SHIPPING']).optional(),
  status: z
    .enum(['PENDING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'FULFILLED', 'CANCELED', 'REFUNDED'])
    .optional(),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? v : undefined)),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * 管理者：注文一覧（ページネーション込み）クエリスキーマ
 */
export const adminOrdersQuerySchema = adminOrdersFilterSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AdminOrdersFilter = z.infer<typeof adminOrdersFilterSchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;

/**
 * 管理者：監査ログ一覧クエリ（GET /api/admin/audit-logs）
 */
export const adminAuditLogQuerySchema = z.object({
  action: z
    .enum([
      'product.create',
      'product.update',
      'product.delete',
      'product.reorder',
      'news.create',
      'news.update',
      'news.delete',
      'order.status_update',
      'order.mark_paid',
      'order.ship',
      'order.refund',
      'order.email_resend',
    ])
    .optional(),
  targetType: z.enum(['product', 'news', 'order', 'calendar']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
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

export type ShippingOrderInput = z.infer<typeof shippingOrderSchema>;
