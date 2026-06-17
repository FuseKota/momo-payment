-- =========================================
-- 00025: 監査ログ (audit_logs)
-- admin の重要操作（商品/ニュースのCRUD・注文ステータス変更・入金確認・発送・返金・メール再送）
-- を記録する追記専用テーブル。
-- 既存テーブルへの破壊的変更なし（CREATE TABLE / CREATE POLICY のみ）。
-- =========================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  -- 操作者（admin の auth.users.id / email スナップショット）
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,

  -- 操作内容（例: 'order.mark_paid', 'product.create'）
  action text not null,

  -- 対象リソース
  target_type text,                 -- 'order' | 'product' | 'news' | 'calendar'
  target_id text,                   -- 対象の id（uuid文字列 or order_no 等）

  -- 補足情報（PIIマスク済みを格納する想定。secure-logger 方針に準拠）
  metadata jsonb not null default '{}'::jsonb,

  -- リクエスト元IP（getClientIP の戻り値）
  ip text,

  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);

-- RLS（既存テーブルと同方針: service_role 経由のみ。API層で requireAdmin により担保）
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_service_role_all" on public.audit_logs;
create policy "audit_logs_service_role_all" on public.audit_logs
  for all using (auth.role() = 'service_role');

-- 改ざん防止: 閲覧/記録は Next.js service_role API 経由のみ。
-- authenticated 向け SELECT / UPDATE / DELETE ポリシーは意図的に作成しない。
