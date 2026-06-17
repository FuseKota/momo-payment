-- =========================================
-- 00024: 全額返金トラッキング
-- 管理画面からの全額返金（Stripe / 店頭現金の手動マーク）で使用する列を追加する。
-- order_status / payment_status enum には既に 'REFUNDED' が存在するため enum 変更は不要。
-- 破壊的変更なし（NULL 許容列の追加のみ・冪等）。
-- =========================================

-- payments: 返金日時・Stripe返金IDを保持
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text;

COMMENT ON COLUMN public.payments.refunded_at IS '返金実行日時（全額返金）。冪等性チェックに使用';
COMMENT ON COLUMN public.payments.stripe_refund_id IS 'Stripe Refund ID（re_...）。店頭現金払いの手動返金マークでは NULL';

-- orders: 返金完了日時（一覧/詳細の表示・絞り込み用）
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

COMMENT ON COLUMN public.orders.refunded_at IS '返金完了日時';
