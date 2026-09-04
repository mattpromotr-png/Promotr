create table public.club_tables (
  id uuid primary key,
  venue_id uuid not null references public.venues(id) on delete cascade,
  code text not null,
  name text not null,
  zone text not null,
  capacity integer not null check (capacity > 0),
  minimum_spend_cad numeric(10,2) not null check (minimum_spend_cad >= 0),
  deposit_cad numeric(10,2) not null check (deposit_cad > 0),
  map_x numeric(5,2) not null check (map_x between 0 and 100),
  map_y numeric(5,2) not null check (map_y between 0 and 100),
  active boolean not null default true,
  unique (venue_id, code)
);

create table public.table_bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  lead_id uuid not null unique references public.leads(id) on delete restrict,
  table_id uuid not null references public.club_tables(id) on delete restrict,
  booking_date date not null,
  status text not null default 'held' check (status in ('held','confirmed','expired','cancelled','refunded')),
  minimum_spend_cad numeric(10,2) not null,
  deposit_cad numeric(10,2) not null,
  hold_expires_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index table_bookings_no_active_duplicate
  on public.table_bookings (table_id, booking_date)
  where status in ('held','confirmed');
create index table_bookings_date_idx on public.table_bookings (booking_date, status);

alter table public.club_tables enable row level security;
alter table public.table_bookings enable row level security;

insert into public.club_tables (id, venue_id, code, name, zone, capacity, minimum_spend_cad, deposit_cad, map_x, map_y)
select seed.id, v.id, seed.code, seed.name, seed.zone, seed.capacity, seed.minimum_spend, seed.deposit, seed.x, seed.y
from public.venues v cross join (values
  ('10000000-0000-4000-8000-000000000001'::uuid,'L1','Lounge One','Lounge',6,600,150,12,18),
  ('10000000-0000-4000-8000-000000000002'::uuid,'L2','Lounge Two','Lounge',6,600,150,12,62),
  ('10000000-0000-4000-8000-000000000003'::uuid,'P1','Premium One','Premium',8,1000,250,72,18),
  ('10000000-0000-4000-8000-000000000004'::uuid,'P2','Premium Two','Premium',8,1000,250,72,62),
  ('10000000-0000-4000-8000-000000000005'::uuid,'D1','Dance Floor One','Dance floor',10,1500,400,34,25),
  ('10000000-0000-4000-8000-000000000006'::uuid,'D2','Dance Floor Two','Dance floor',10,1500,400,52,25)
) seed(id,code,name,zone,capacity,minimum_spend,deposit,x,y)
where v.slug = 'promotr-nightclub' on conflict (id) do nothing;

create or replace function public.create_table_hold(p_lead_id uuid, p_table_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_lead public.leads%rowtype; v_table public.club_tables%rowtype; v_booking public.table_bookings%rowtype;
begin
  update public.table_bookings set status='expired', updated_at=now()
    where status='held' and hold_expires_at <= now();
  select * into v_lead from public.leads where id=p_lead_id;
  if v_lead.id is null or v_lead.booking_type <> 'table' then raise exception 'invalid_table_inquiry'; end if;
  select * into v_table from public.club_tables where id=p_table_id and venue_id=v_lead.venue_id and active;
  if v_table.id is null then raise exception 'table_not_found'; end if;
  if v_lead.party_size > v_table.capacity then raise exception 'table_capacity_exceeded'; end if;
  insert into public.table_bookings (venue_id,lead_id,table_id,booking_date,minimum_spend_cad,deposit_cad,hold_expires_at)
  values (v_lead.venue_id,v_lead.id,v_table.id,v_lead.requested_date,v_table.minimum_spend_cad,v_table.deposit_cad,now()+interval '30 minutes')
  on conflict (lead_id) do update set table_id=excluded.table_id, booking_date=excluded.booking_date,
    minimum_spend_cad=excluded.minimum_spend_cad, deposit_cad=excluded.deposit_cad,
    status='held', hold_expires_at=now()+interval '30 minutes', updated_at=now()
  returning * into v_booking;
  return jsonb_build_object('bookingId',v_booking.id,'depositCents',(v_booking.deposit_cad*100)::integer,
    'minimumSpendCad',v_booking.minimum_spend_cad,'holdExpiresAt',v_booking.hold_expires_at,'tableName',v_table.name);
exception when unique_violation then raise exception 'table_unavailable';
end; $$;

create or replace function public.confirm_deposit_payment(p_session_id text, p_payment_intent_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_booking public.table_bookings%rowtype;
begin
  select * into v_booking from public.table_bookings where stripe_checkout_session_id=p_session_id for update;
  if v_booking.id is null then raise exception 'booking_not_found'; end if;
  if v_booking.status='confirmed' then return; end if;
  update public.table_bookings set status='confirmed',stripe_payment_intent_id=p_payment_intent_id,paid_at=now(),hold_expires_at=null,updated_at=now() where id=v_booking.id;
  update public.leads set status='booked',booked_at=coalesce(booked_at,now()),updated_at=now() where id=v_booking.lead_id;
end; $$;

revoke all on function public.create_table_hold(uuid,uuid) from public,anon,authenticated;
revoke all on function public.confirm_deposit_payment(text,text) from public,anon,authenticated;
grant execute on function public.create_table_hold(uuid,uuid) to service_role;
grant execute on function public.confirm_deposit_payment(text,text) to service_role;
