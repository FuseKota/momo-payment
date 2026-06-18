-- 00026_remove_pickup.sql
-- 店頭受け取り(PICKUP)/店頭払い(PAY_AT_PICKUP)/Square(SQUARE)/RESERVED を撤去し、配送EC(SHIPPING)専用化する。
--
-- 【適用前の必須確認】enum 値の付け替え(USING cast)は、撤去対象の値を持つ行があると失敗する。
-- 適用前に dev/prod 双方で下記がすべて 0 件であることを確認すること:
--   select count(*) from orders where order_type = 'PICKUP';
--   select count(*) from orders where payment_method in ('SQUARE','PAY_AT_PICKUP');
--   select count(*) from orders where status = 'RESERVED';
-- 非0の場合は対象行を整理してから適用する（本番は要バックアップ・要確認）。

begin;

-- 1) 配送ルール CHECK 制約を一旦削除（PICKUP/SQUARE を参照しているため）
alter table public.orders drop constraint if exists orders_shipping_rules;

-- 2) order_type の index を削除（enum 付け替えの前に外す。SHIPPING 単一値になるため再作成は任意）
drop index if exists public.idx_orders_type;

-- 3) PICKUP 専用カラムを削除
alter table public.orders drop column if exists pickup_date;
alter table public.orders drop column if exists pickup_time;
alter table public.products drop column if exists can_pickup;

-- 4) order_type enum を SHIPPING のみへ付け替え
create type public.order_type_new as enum ('SHIPPING');
alter table public.orders
  alter column order_type type public.order_type_new
  using order_type::text::public.order_type_new;
drop type public.order_type;
alter type public.order_type_new rename to order_type;

-- 5) payment_method enum を STRIPE のみへ付け替え
create type public.payment_method_new as enum ('STRIPE');
alter table public.orders
  alter column payment_method type public.payment_method_new
  using payment_method::text::public.payment_method_new;
drop type public.payment_method;
alter type public.payment_method_new rename to payment_method;

-- 6) order_status enum から RESERVED を除去
create type public.order_status_new as enum (
  'PENDING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'FULFILLED', 'CANCELED', 'REFUNDED'
);
alter table public.orders
  alter column status type public.order_status_new
  using status::text::public.order_status_new;
drop type public.order_status;
alter type public.order_status_new rename to order_status;

-- 7) order_type の index を再作成（将来の拡張に備えて維持）
create index if not exists idx_orders_type on public.orders(order_type);

-- 8) 配送ルール CHECK 制約を再作成（SHIPPING + STRIPE + temp_zone 必須）
alter table public.orders
  add constraint orders_shipping_rules check (
    order_type = 'SHIPPING' and payment_method = 'STRIPE' and temp_zone is not null
  );

commit;
