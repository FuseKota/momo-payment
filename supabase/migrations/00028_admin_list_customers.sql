-- =========================================
-- 管理画面「顧客マスタ」一覧用の読取専用RPC
-- customer_profiles を主軸に auth.users(email) と orders 集計を結合して返す。
-- 氏名/メール/電話の部分一致検索 + ページネーション + 総件数(window count)。
--
-- メールは auth.users にしか無く、PostgREST には auth スキーマが公開されていないため、
-- SECURITY DEFINER 関数で auth.users を直接参照する。
-- PII 漏洩防止のため anon/authenticated からの実行を禁止し、service_role のみ許可する
-- （API 層は requireAdmin 後に service_role クライアントから呼び出す）。
-- =========================================

create or replace function public.admin_list_customers(
  p_search text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  phone text,
  registered_at timestamptz,
  order_count bigint,
  total_spent_yen bigint,
  last_order_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pattern text;
begin
  -- 検索語があれば LIKE メタ文字をエスケープ（既定のエスケープ文字 \）してパターン化
  if p_search is not null and length(trim(p_search)) > 0 then
    v_pattern := '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  else
    v_pattern := null;
  end if;

  return query
  with stats as (
    -- 有効注文（PAID 以降、PENDING_PAYMENT/CANCELED/REFUNDED を除外）で集計
    select
      o.user_id as uid,
      count(*) filter (
        where o.status in ('PAID', 'PACKING', 'SHIPPED', 'FULFILLED')
      ) as order_count,
      coalesce(sum(o.total_yen) filter (
        where o.status in ('PAID', 'PACKING', 'SHIPPED', 'FULFILLED')
      ), 0) as total_spent_yen,
      max(o.created_at) filter (
        where o.status in ('PAID', 'PACKING', 'SHIPPED', 'FULFILLED')
      ) as last_order_at
    from public.orders o
    where o.user_id is not null
    group by o.user_id
  ),
  base as (
    select
      cp.user_id,
      cp.display_name,
      u.email::text as email,
      cp.phone,
      cp.created_at as registered_at,
      coalesce(s.order_count, 0)::bigint as order_count,
      coalesce(s.total_spent_yen, 0)::bigint as total_spent_yen,
      s.last_order_at
    from public.customer_profiles cp
    join auth.users u on u.id = cp.user_id
    left join stats s on s.uid = cp.user_id
    where
      v_pattern is null
      or cp.display_name ilike v_pattern
      or u.email ilike v_pattern
      or cp.phone ilike v_pattern
  )
  select
    b.user_id,
    b.display_name,
    b.email,
    b.phone,
    b.registered_at,
    b.order_count,
    b.total_spent_yen,
    b.last_order_at,
    count(*) over () as total_count
  from base b
  order by b.registered_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- search_path 固定（既存 00020 の lint 対応に合わせる）
alter function public.admin_list_customers(text, int, int) set search_path = public;

-- PII 漏洩防止: PostgREST 経由で anon/authenticated から呼べないようにする
revoke all on function public.admin_list_customers(text, int, int) from public;
revoke all on function public.admin_list_customers(text, int, int) from anon;
revoke all on function public.admin_list_customers(text, int, int) from authenticated;
grant execute on function public.admin_list_customers(text, int, int) to service_role;
