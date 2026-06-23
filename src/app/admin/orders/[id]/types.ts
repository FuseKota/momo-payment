/** 管理者：注文詳細画面で扱う注文型（GET /api/admin/orders/[id] のレスポンス形状） */

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price_yen: number;
  line_total_yen: number;
}

export interface Order {
  id: string;
  order_no: string;
  order_type: 'SHIPPING';
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_postal_code: string | null;
  shipping_prefecture: string | null;
  shipping_city: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  subtotal_yen: number;
  shipping_fee_yen: number;
  total_yen: number;
  tracking_number: string | null;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  shipped_at: string | null;
  fulfilled_at: string | null;
  order_items: OrderItem[];
  payments?: Array<{
    id: string;
    provider: string;
    status: string;
    amount_yen: number;
    stripe_payment_intent_id: string | null;
    refunded_at: string | null;
    stripe_refund_id: string | null;
  }>;
}
