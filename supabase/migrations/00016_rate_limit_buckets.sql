-- AUDIT_REPORT.md SEC-001: サーバレスで有効な永続レート制限ストア
-- Postgres の UPSERT + ロックで sliding window 風のカウンタを実装

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  identifier TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at
  ON public.rate_limit_buckets(reset_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- service_role 専用（公開読み書き不可）
CREATE POLICY "rate_limit_buckets_service_role_only"
  ON public.rate_limit_buckets FOR ALL
  USING (auth.role() = 'service_role');

-- ================================================
-- check_rate_limit RPC
-- 1 往復で判定・カウントアップを原子的に実行
-- ================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining INT,
  reset_in INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_reset TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- UPSERT: 期限切れなら新ウィンドウ開始、そうでなければインクリメント
  INSERT INTO public.rate_limit_buckets (identifier, count, reset_at)
  VALUES (p_identifier, 1, v_now + make_interval(secs => p_window_seconds))
  ON CONFLICT (identifier) DO UPDATE
    SET
      count = CASE
        WHEN rate_limit_buckets.reset_at <= v_now THEN 1
        ELSE rate_limit_buckets.count + 1
      END,
      reset_at = CASE
        WHEN rate_limit_buckets.reset_at <= v_now
          THEN v_now + make_interval(secs => p_window_seconds)
        ELSE rate_limit_buckets.reset_at
      END
  RETURNING rate_limit_buckets.count, rate_limit_buckets.reset_at
    INTO v_count, v_reset;

  RETURN QUERY SELECT
    (v_count <= p_limit) AS allowed,
    GREATEST(0, p_limit - v_count) AS remaining,
    GREATEST(0, EXTRACT(EPOCH FROM (v_reset - v_now))::INT) AS reset_in;
END;
$$;

-- ================================================
-- 古いレコードを定期的にクリーンアップする補助関数
-- （pg_cron で呼び出す、または手動実行）
-- ================================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limit_buckets
  WHERE reset_at < now() - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
