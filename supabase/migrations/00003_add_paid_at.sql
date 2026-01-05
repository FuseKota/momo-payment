-- Add paid_at column to orders table
alter table public.orders add column if not exists paid_at timestamptz;

-- Add comment
comment on column public.orders.paid_at is '支払い完了日時';
