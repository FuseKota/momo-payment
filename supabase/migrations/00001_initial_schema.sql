-- =========================================
-- momo-payment 初期スキーマ (MVP v1.0 確定版)
-- =========================================

-- =========
-- Extensions
-- =========
create extension if not exists pgcrypto;

-- =========
-- Enums
-- =========
do $$ begin
  create type public.order_type as enum ('PICKUP', 'SHIPPING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('SQUARE', 'PAY_AT_PICKUP');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.temp_zone as enum ('AMBIENT', 'FROZEN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_kind as enum ('FROZEN_FOOD', 'GOODS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'RESERVED',
    'PENDING_PAYMENT',
    'PAID',
    'PACKING',
    'SHIPPED',
    'FULFILLED',
    'CANCELED',
    'REFUNDED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'INIT',
    'LINK_CREATED',
    'SUCCEEDED',
    'FAILED',
    'CANCELED',
    'REFUNDED'
  );
exception when duplicate_object then null; end $$;

-- =========
-- Utility: updated_at trigger
-- =========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========
-- Utility: order_no generator
-- =========
create or replace function public.generate_order_no()
returns text
language sql
stable
as $$
  select
    to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
$$;

-- =========
-- Admin users (Supabase Auth連携)
-- =========
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

-- =========
-- Products
-- =========
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind public.product_kind not null,
  name text not null,
  description text,
  price_yen int not null check (price_yen >= 0),

  -- Fulfillment support
  can_pickup boolean not null default true,
  can_ship boolean not null default false,
  temp_zone public.temp_zone not null default 'AMBIENT',

  -- Inventory (null = 在庫管理しない)
  stock_qty int check (stock_qty is null or stock_qty >= 0),

  -- Media
  image_url text,

  -- Food label (冷凍食品用: JSONB for flexibility)
  -- 例: { "ingredients": "...", "allergens": "小麦,卵", "nutrition": {...}, "net_weight_grams": 300, "expiry_info": "..." }
  food_label jsonb,

  is_active boolean not null default true,
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create index if not exists idx_products_active_sort on public.products(is_active, sort_order);
create index if not exists idx_products_kind on public.products(kind);
create index if not exists idx_products_slug on public.products(slug);

-- =========
-- Orders
-- =========
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default public.generate_order_no(),

  order_type public.order_type not null,
  status public.order_status not null,

  payment_method public.payment_method not null,
  temp_zone public.temp_zone, -- SHIPPINGは必須（checkで担保）

  subtotal_yen int not null check (subtotal_yen >= 0),
  shipping_fee_yen int not null default 0 check (shipping_fee_yen >= 0),
  total_yen int not null check (total_yen >= 0),

  customer_name text not null,
  customer_phone text not null,
  customer_email text,

  -- 店頭受け取り用（任意）
  pickup_date date,
  pickup_time text,

  agreement_accepted boolean not null default false,
  admin_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 合計金額の整合性
  constraint orders_total_consistency check (total_yen = subtotal_yen + shipping_fee_yen),

  -- 配送はオンライン決済必須 + 温度帯必須
  constraint orders_shipping_rules check (
    (order_type = 'SHIPPING' and payment_method = 'SQUARE' and temp_zone is not null)
    or
    (order_type = 'PICKUP')
  )
);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_type on public.orders(order_type);
create index if not exists idx_orders_order_no on public.orders(order_no);

-- =========
-- Order items (スナップショット保持)
-- =========
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),

  qty int not null check (qty > 0),
  unit_price_yen int not null check (unit_price_yen >= 0),
  line_total_yen int not null check (line_total_yen >= 0),

  -- Snapshot (注文時点の商品情報)
  product_name text not null,
  product_kind public.product_kind not null,
  product_temp_zone public.temp_zone not null,

  created_at timestamptz not null default now(),

  constraint order_items_line_total check (line_total_yen = unit_price_yen * qty)
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- =========
-- Shipping addresses (配送のみ)
-- =========
create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,

  postal_code text not null,
  pref text not null,
  city text not null,
  address1 text not null,
  address2 text,

  recipient_name text not null,
  recipient_phone text not null,

  created_at timestamptz not null default now()
);

create index if not exists idx_shipping_addresses_order_id on public.shipping_addresses(order_id);

-- =========
-- Shipments
-- =========
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,

  carrier text,       -- yamato / sagawa / jp_post / other
  tracking_no text,
  shipped_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_shipments_order_id on public.shipments(order_id);

-- =========
-- Payments
-- =========
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,

  provider text not null, -- square / on_site
  status public.payment_status not null default 'INIT',
  amount_yen int not null check (amount_yen >= 0),

  -- Square関連
  square_payment_link_id text,
  square_order_id text,
  square_payment_id text,
  square_environment text, -- Sandbox / Production

  idempotency_key text,
  raw_webhook jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payments_square_order_id on public.payments(square_order_id);
create index if not exists idx_payments_square_payment_id on public.payments(square_payment_id);

-- =========
-- Square Webhook Events (重複処理防止)
-- =========
create table if not exists public.square_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

-- =========
-- RLS enable
-- =========
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.shipments enable row level security;
alter table public.payments enable row level security;
alter table public.square_webhook_events enable row level security;

-- =========
-- RLS Policies
-- =========

-- admin_users: 管理者だけ参照
drop policy if exists "admin_users_select" on public.admin_users;
create policy "admin_users_select"
on public.admin_users for select
to authenticated
using (public.is_admin());

-- products: 公開商品は誰でも閲覧OK
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products for select
to anon, authenticated
using (is_active = true);

-- products: 管理者は全操作OK
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- orders: 管理者のみ操作（購入者はNext.jsのservice_role経由）
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
on public.orders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- order_items: 管理者のみ
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
on public.order_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- shipping_addresses: 管理者のみ
drop policy if exists "shipping_addresses_admin_all" on public.shipping_addresses;
create policy "shipping_addresses_admin_all"
on public.shipping_addresses for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- shipments: 管理者のみ
drop policy if exists "shipments_admin_all" on public.shipments;
create policy "shipments_admin_all"
on public.shipments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- payments: 管理者のみ
drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all"
on public.payments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- square_webhook_events: 管理者のみ
drop policy if exists "square_webhook_events_admin_all" on public.square_webhook_events;
create policy "square_webhook_events_admin_all"
on public.square_webhook_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
