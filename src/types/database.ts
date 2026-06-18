// Database types matching Supabase schema (MVP v1.0)

export type OrderType = 'SHIPPING';
export type PaymentMethod = 'STRIPE';
export type TempZone = 'AMBIENT' | 'FROZEN';
export type ProductKind = 'FROZEN_FOOD' | 'GOODS';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PACKING'
  | 'SHIPPED'
  | 'FULFILLED'
  | 'CANCELED'
  | 'REFUNDED';
export type PaymentStatus =
  | 'INIT'
  | 'LINK_CREATED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED';

// Food label for frozen food products
export interface FoodLabel {
  ingredients?: string;
  allergens?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbohydrates?: number;
    sodium?: number;
  };
  net_weight_grams?: number;
  expiry_info?: string;
  storage_method?: string;
  manufacturer?: string;
}

export interface Product {
  id: string;
  slug: string;
  kind: ProductKind;
  name: string;
  description: string | null;
  price_yen: number;
  can_ship: boolean;
  temp_zone: TempZone;
  stock_qty: number | null;
  image_url: string | null;
  images: string[] | null; // Array of image URLs for product gallery (nullable in Supabase)
  food_label: FoodLabel | null;
  name_zh_tw: string | null;
  description_zh_tw: string | null;
  food_label_zh_tw: FoodLabel | null;
  name_en: string | null;
  description_en: string | null;
  food_label_en: FoodLabel | null;
  is_active: boolean;
  sort_order: number;
  has_variants: boolean; // When true, inventory is tracked per variant
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  price_yen: number | null; // null = use product.price_yen
  stock_qty: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface Order {
  id: string;
  order_no: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_method: PaymentMethod;
  temp_zone: TempZone | null;
  subtotal_yen: number;
  shipping_fee_yen: number;
  total_yen: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  agreement_accepted: boolean;
  admin_note: string | null;
  user_id: string | null;
  locale: string;
  paid_at: string | null;
  refunded_at: string | null;
  lookup_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  unit_price_yen: number;
  line_total_yen: number;
  product_name: string;
  product_kind: ProductKind;
  product_temp_zone: TempZone;
  product_size: string | null;
  created_at: string;
}

export interface ShippingAddress {
  id: string;
  order_id: string;
  postal_code: string;
  pref: string;
  city: string;
  address1: string;
  address2: string | null;
  recipient_name: string;
  recipient_phone: string;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_no: string | null;
  shipped_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string; // 'stripe'
  status: PaymentStatus;
  amount_yen: number;
  // Square関連（レガシー）
  square_payment_link_id: string | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  square_environment: string | null;
  // Stripe関連
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_environment: string | null;
  // 返金関連（00024_add_refund_tracking.sql）
  refunded_at: string | null;
  stripe_refund_id: string | null;
  // 共通
  idempotency_key: string | null;
  raw_webhook: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SquareWebhookEvent {
  event_id: string;
  event_type: string;
  received_at: string;
  payload: Record<string, unknown>;
}

export interface StripeWebhookEvent {
  event_id: string;
  event_type: string;
  received_at: string;
  payload: Record<string, unknown>;
}

export interface AdminUser {
  user_id: string;
  role: string;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  postal_code: string;
  pref: string;
  city: string;
  address1: string;
  address2: string | null;
  recipient_name: string;
  recipient_phone: string;
  is_default: boolean;
  created_at: string;
}

// Extended types with relations
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  shipping_address: ShippingAddress | null;
  shipments: Shipment[];
  payments: Payment[];
}

export interface News {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  category: string;
  slug: string;
  title_zh_tw: string | null;
  excerpt_zh_tw: string | null;
  content_zh_tw: string | null;
  title_en: string | null;
  excerpt_en: string | null;
  content_en: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IitateCalendarEventType = 'day' | 'night' | 'closed' | 'stage';

export interface IitateCalendarEvent {
  id: string;
  event_date: string;
  types: IitateCalendarEventType[];
  time_range: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface IitateCalendarMonthNote {
  id: string;
  year_month: string;
  notes: string[];
  created_at: string;
  updated_at: string;
}

// =========================
// 管理者：注文一覧 / CSV エクスポート
// =========================
export interface AdminOrderListRow extends Order {
  order_items: Pick<
    OrderItem,
    'id' | 'product_id' | 'product_name' | 'qty' | 'unit_price_yen' | 'line_total_yen'
  >[];
  shipments: Pick<Shipment, 'id' | 'tracking_no' | 'shipped_at'>[];
}

export interface AdminOrderListResponse {
  orders: AdminOrderListRow[];
  total: number; // フィルタ条件に一致する全件数（count）
  limit: number;
  offset: number;
}

// CSV エクスポート用の結合行（payment_status 列はDBに無いため payments[0].status で導出）
export interface AdminOrderExportRow extends Order {
  order_items: Pick<OrderItem, 'product_name' | 'qty'>[];
  shipping_addresses:
    | Pick<
        ShippingAddress,
        'postal_code' | 'pref' | 'city' | 'address1' | 'address2' | 'recipient_name' | 'recipient_phone'
      >[]
    | null;
  payments: Pick<Payment, 'status'>[] | null;
}

// =========================
// 監査ログ（audit_logs）
// =========================
export type AuditAction =
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'product.reorder'
  | 'news.create'
  | 'news.update'
  | 'news.delete'
  | 'order.status_update'
  | 'order.mark_paid'
  | 'order.ship'
  | 'order.refund'
  | 'order.email_resend';

export type AuditTargetType = 'product' | 'news' | 'order' | 'calendar';

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string; // 実体は AuditAction だが DB は text のため string
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}
