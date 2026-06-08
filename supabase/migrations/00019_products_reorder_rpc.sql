-- ===========================================
-- Migration: products reorder RPC
-- ===========================================
-- 管理画面で商品の表示順（sort_order）を一括更新するための関数。
-- このファイルはリモートDBに既に存在していた関数をローカル追跡用に取り込んだもの
-- （履歴整合のため remote の定義をそのまま反映）。

CREATE OR REPLACE FUNCTION public.reorder_products(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_updated int := 0;
  v_item jsonb;
BEGIN
  -- jsonb 配列: [{ id: uuid, sort_order: int }]
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE public.products
    SET sort_order = (v_item->>'sort_order')::int
    WHERE id = (v_item->>'id')::uuid;
    v_updated := v_updated + 1;
  END LOOP;
  RETURN v_updated;
END;
$function$;
