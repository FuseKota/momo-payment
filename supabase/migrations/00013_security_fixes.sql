-- セキュリティ修正マイグレーション

-- 1. news テーブルの無効な RLS ポリシーを削除
-- service_role は RLS を完全迂回するため、このポリシーは機能せず誤解を招く
DROP POLICY IF EXISTS "news_service_role_all" ON news;

-- 2. stripe_webhook_events.event_id の一意性について
-- event_id は 00006 で既に PRIMARY KEY（=一意制約）として定義済みのため、
-- 追加の UNIQUE 制約は不要。競合条件による二重処理は PK + アプリ側の
-- 23505 ハンドリングで防止される。
-- （旧版にあった `ADD CONSTRAINT IF NOT EXISTS` は PostgreSQL では無効な構文で
--   適用不能だったため削除した。）

-- 3. customer_addresses(user_id) にインデックスを追加
-- ユーザーごとの住所取得クエリのパフォーマンスを改善
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
  ON customer_addresses (user_id);
