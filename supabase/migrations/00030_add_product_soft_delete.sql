-- 00030_add_product_soft_delete.sql
-- 商品の論理削除（アーカイブ）対応。
--
-- 【背景】order_items.product_id が products(id) を ON DELETE 句なし（RESTRICT）で
-- 参照しているため、一度でも注文された商品は物理削除できず 500 になっていた。
-- 注文履歴は order_items 側にスナップショット（product_name 等）を保持しているため、
-- 商品を物理削除する必要はない。deleted_at による論理削除へ切り替える。
--
-- deleted_at: NULL = 有効 / 非NULL = アーカイブ済み（削除ボタンで非公開＋アーカイブ）。
-- 冪等性のため IF NOT EXISTS を使用（再適用しても安全）。

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 有効な商品（deleted_at IS NULL）の一覧・並び替えクエリ用の部分インデックス。
CREATE INDEX IF NOT EXISTS idx_products_not_deleted
  ON public.products (sort_order)
  WHERE deleted_at IS NULL;
