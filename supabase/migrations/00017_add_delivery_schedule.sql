-- 配送注文のお届け希望日・時間帯を追加
alter table public.orders
  add column if not exists delivery_date date,
  add column if not exists delivery_time_slot text;

comment on column public.orders.delivery_date is 'お届け希望日（任意・配送注文のみ）';
comment on column public.orders.delivery_time_slot is '佐川急便の時間帯コード（UNSPECIFIED/AM/T12_14/T14_16/T16_18/T18_21）';

-- 時間帯コードの値を制約（src/lib/shipping/time-slots.ts の DELIVERY_TIME_SLOTS と一致させること）
alter table public.orders
  drop constraint if exists orders_delivery_time_slot_check;
alter table public.orders
  add constraint orders_delivery_time_slot_check check (
    delivery_time_slot is null
    or delivery_time_slot in ('UNSPECIFIED', 'AM', 'T12_14', 'T14_16', 'T16_18', 'T18_21')
  );
