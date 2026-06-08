-- ===========================================
-- Migration: Variant stock decrement function
-- ===========================================
-- 決済成功（Stripe Webhook）時に在庫をアトミックに減算するための関数。
-- 注文作成時に stock_qty をチェックしているが、これまで減算処理が無く
-- 在庫チェックが実質無効化されていた（売り越しの原因）ため補完する。
--
-- - stock_qty が NULL のバリアント（在庫管理なし）は対象外
-- - 同時実行でもアトミックに減算（行ロック）
-- - 在庫が負にならないよう greatest(stock_qty - qty, 0) でクランプ

CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id uuid,
  p_qty int
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.product_variants
  SET stock_qty = greatest(stock_qty - p_qty, 0)
  WHERE id = p_variant_id
    AND stock_qty IS NOT NULL;
$$;

-- 関数の実行権限は service_role のみに限定（公開クライアントからは呼べない）
REVOKE ALL ON FUNCTION public.decrement_variant_stock(uuid, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, int) TO service_role;
