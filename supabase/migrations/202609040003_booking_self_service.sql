alter table public.table_bookings
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists stripe_refund_id text unique,
  add column if not exists cancellation_reason text;

create index if not exists table_bookings_cancelled_idx
  on public.table_bookings (cancelled_at desc)
  where cancelled_at is not null;

