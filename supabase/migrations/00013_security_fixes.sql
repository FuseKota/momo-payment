-- セキュリティ修正マイグレーション

-- 1. news テーブルの無効な RLS ポリシーを削除
-- service_role は RLS を完全迂回するため、このポリシーは機能せず誤解を招く
DROP POLICY IF EXISTS "news_service_role_all" ON news;

-- 2. stripe_webhook_events.event_id に UNIQUE 制約を追加
-- 競合条件による二重処理（二重課金・重複メール）を防止
ALTER TABLE stripe_webhook_events
  ADD CONSTRAINT IF NOT EXISTS stripe_webhook_events_event_id_unique UNIQUE (event_id);

-- 3. customer_addresses(user_id) にインデックスを追加
-- ユーザーごとの住所取得クエリのパフォーマンスを改善
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
  ON customer_addresses (user_id);
