// Database types matching Supabase schema (MVP v1.0)

export type OrderType = 'PICKUP' | 'SHIPPING';
export type PaymentMethod = 'SQUARE' | 'PAY_AT_PICKUP';
export type TempZone = 'AMBIENT' | 'FROZEN';
export type ProductKind = 'FROZEN_FOOD' | 'GOODS';
export type OrderStatus =
  | 'RESERVED'
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
  can_pickup: boolean;
  can_ship: boolean;
  temp_zone: TempZone;
  stock_qty: number | null;
  image_url: string | null;
  images: string[]; // Array of image URLs for product gallery
  food_label: FoodLabel | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  pickup_date: string | null;
  pickup_time: string | null;
  agreement_accepted: boolean;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  unit_price_yen: number;
  line_total_yen: number;
  product_name: string;
  product_kind: ProductKind;
  product_temp_zone: TempZone;
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
  provider: string;
  status: PaymentStatus;
  amount_yen: number;
  square_payment_link_id: string | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  square_environment: string | null;
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

export interface AdminUser {
  user_id: string;
  role: string;
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
