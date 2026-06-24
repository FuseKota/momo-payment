-- 00029_drop_square_legacy.sql
-- 廃止済み Square 決済の残存 DB 資産を撤去する（決済は Stripe に統一済み）。
--
-- 【適用前の確認結果】dev / prod 双方で以下を確認済み（2026-06-25）:
--   - public.square_webhook_events: 0 行
--   - payments.square_* 4列: non-null 0 件（データ損失なし）
--   - square_webhook_events への FK 参照: なし
-- 冪等性のため全て IF EXISTS を使用（再適用しても安全）。

-- 1) Square Webhook イベントテーブル（RLS ポリシー・インデックス含め CASCADE で撤去）
drop table if exists public.square_webhook_events cascade;

-- 2) payments の Square 用インデックス（00001 で作成）
drop index if exists public.idx_payments_square_order_id;
drop index if exists public.idx_payments_square_payment_id;

-- 3) payments の Square 用レガシー列（00001 で作成）
alter table public.payments drop column if exists square_payment_link_id;
alter table public.payments drop column if exists square_order_id;
alter table public.payments drop column if exists square_payment_id;
alter table public.payments drop column if exists square_environment;
