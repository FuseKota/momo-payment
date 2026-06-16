-- セキュリティアドバイザ対応のDBハードニング（2026-06-10）
-- Supabase get_advisors(security) の WARN を解消する。

-- =========================================
-- 1. 関数の search_path を固定
-- （lint 0011 function_search_path_mutable）
-- 全関数はテーブル参照を public. で完全修飾済みのため public 固定で安全。
-- SECURITY DEFINER の is_admin も含め search_path ハイジャックを防ぐ。
-- =========================================
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_order_no() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_news_updated_at() SET search_path = public;
ALTER FUNCTION public.update_iitate_calendar_updated_at() SET search_path = public;
ALTER FUNCTION public.check_rate_limit(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.cleanup_rate_limit_buckets() SET search_path = public;
ALTER FUNCTION public.reorder_products(jsonb) SET search_path = public;

-- =========================================
-- 2. 公開バケット product-images の広域 SELECT ポリシーを削除
-- （lint 0025 public_bucket_allows_listing）
-- 公開URL（/storage/v1/object/public/...）は RLS 非依存で配信されるため、
-- 匿名クライアントに全ファイル一覧(list)を許す広域 SELECT は不要。
-- アプリの画像表示は公開URL、管理操作は service_role 経由のため影響なし。
-- =========================================
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
