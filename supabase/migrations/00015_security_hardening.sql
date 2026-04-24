-- セキュリティ監査対応のDBハードニング（2026-04-25）
-- AUDIT_REPORT.md: DB-001, DB-002, DB-003, DB-004, DB-005, DB-006

-- =========================================
-- DB-001: generate_order_no を volatile に修正
-- stable 宣言はプランナに「同一クエリ内で同じ値」と仮定させるため誤り
-- =========================================
CREATE OR REPLACE FUNCTION public.generate_order_no()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT
    to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
$$;

-- =========================================
-- DB-002: payments に UNIQUE 制約追加
-- 競合条件による重複を DB レベルでも防ぐ
-- =========================================
-- 既存重複がある場合に備えて DO ブロックで安全に追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_stripe_session_id_key'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'payments.stripe_session_id に既存重複あり。手動クリーンアップが必要。';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_idempotency_key_key'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'payments.idempotency_key に既存重複あり。手動クリーンアップが必要。';
END $$;

-- =========================================
-- DB-003: customer_addresses に updated_at
-- =========================================
ALTER TABLE public.customer_addresses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_customer_addresses_updated_at ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- DB-004: orders.admin_note 長さ制限
-- =========================================
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_admin_note_length;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_admin_note_length CHECK (char_length(admin_note) <= 2000);

-- =========================================
-- DB-005: news.content, news.excerpt, news.title に長さ制限
-- =========================================
ALTER TABLE public.news
  DROP CONSTRAINT IF EXISTS news_content_length;
ALTER TABLE public.news
  ADD CONSTRAINT news_content_length CHECK (char_length(content) <= 50000);

ALTER TABLE public.news
  DROP CONSTRAINT IF EXISTS news_excerpt_length;
ALTER TABLE public.news
  ADD CONSTRAINT news_excerpt_length CHECK (char_length(excerpt) <= 500);

ALTER TABLE public.news
  DROP CONSTRAINT IF EXISTS news_title_length;
ALTER TABLE public.news
  ADD CONSTRAINT news_title_length CHECK (char_length(title) <= 200);

-- =========================================
-- DB-006: iitate_calendar_month_notes の year_month 範囲チェック
-- 月 01-12 のみ受け入れ
-- =========================================
ALTER TABLE public.iitate_calendar_month_notes
  DROP CONSTRAINT IF EXISTS iitate_calendar_month_notes_year_month_format;
ALTER TABLE public.iitate_calendar_month_notes
  ADD CONSTRAINT iitate_calendar_month_notes_year_month_format
  CHECK (year_month ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- =========================================
-- SEC-201: orders.lookup_token 追加（ゲスト注文閲覧用）
-- order_no とは別の高エントロピートークンで IDOR 対策
-- =========================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS lookup_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_lookup_token
  ON public.orders(lookup_token)
  WHERE lookup_token IS NOT NULL;

-- 既存行の lookup_token を生成（NULL のまま運用しても OK だが、移行しておく）
UPDATE public.orders
SET lookup_token = encode(extensions.gen_random_bytes(24), 'hex')
WHERE lookup_token IS NULL;

-- 今後の INSERT ではアプリ側で設定、または DEFAULT を使う
ALTER TABLE public.orders
  ALTER COLUMN lookup_token SET DEFAULT encode(extensions.gen_random_bytes(24), 'hex');
