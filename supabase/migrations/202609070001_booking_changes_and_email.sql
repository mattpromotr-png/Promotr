alter table public.leads
  add column if not exists booking_change_status text
    check (booking_change_status in ('guest_updated','change_requested','admin_updated')),
  add column if not exists booking_changed_at timestamptz;

alter table public.table_bookings
  add column if not exists management_email_sent_at timestamptz;

create table if not exists public.booking_change_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.table_bookings(id) on delete restrict,
  lead_id uuid not null references public.leads(id) on delete restrict,
  changed_by text not null check (changed_by in ('guest','admin')),
  reason text,
  previous_values jsonb not null,
  new_values jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_change_history_booking_idx
  on public.booking_change_history (booking_id, created_at desc);
create index if not exists leads_booking_changed_idx
  on public.leads (booking_changed_at desc)
  where booking_change_status is not null;

alter table public.booking_change_history enable row level security;

create or replace function public.reschedule_table_booking(
  p_booking_id uuid,
  p_table_id uuid,
  p_booking_date date,
  p_party_size integer,
  p_changed_by text,
  p_reason text default null,
  p_allow_price_change boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking public.table_bookings%rowtype;
  v_table public.club_tables%rowtype;
  v_old_table public.club_tables%rowtype;
  v_change_status text;
begin
  if p_changed_by not in ('guest','admin') then raise exception 'invalid_actor'; end if;
  if p_party_size < 1 or p_party_size > 100 then raise exception 'invalid_party_size'; end if;

  select * into v_booking from public.table_bookings where id=p_booking_id for update;
  if v_booking.id is null then raise exception 'booking_not_found'; end if;
  if v_booking.status not in ('held','confirmed') then raise exception 'booking_inactive'; end if;

  select * into v_old_table from public.club_tables where id=v_booking.table_id;
  select * into v_table from public.club_tables
    where id=p_table_id and venue_id=v_booking.venue_id and active;
  if v_table.id is null then raise exception 'table_not_found'; end if;
  if p_party_size > v_table.capacity then raise exception 'table_capacity_exceeded'; end if;
  if p_changed_by='guest' and ((p_booking_date + time '22:00') at time zone 'America/Toronto') < now() + interval '48 hours'
    then raise exception 'change_cutoff'; end if;
  if exists (
    select 1 from public.table_bookings
    where table_id=p_table_id and booking_date=p_booking_date
      and status in ('held','confirmed') and id<>p_booking_id
      and (status='confirmed' or hold_expires_at>now())
  ) then raise exception 'table_unavailable'; end if;

  if not p_allow_price_change and v_table.deposit_cad <> v_booking.deposit_cad then
    insert into public.booking_change_history
      (booking_id,lead_id,changed_by,reason,previous_values,new_values)
    values (
      v_booking.id,v_booking.lead_id,p_changed_by,nullif(trim(p_reason),''),
      jsonb_build_object('bookingDate',v_booking.booking_date,'tableId',v_booking.table_id,
        'tableName',v_old_table.name,'partySize',(select party_size from public.leads where id=v_booking.lead_id),
        'minimumSpendCad',v_booking.minimum_spend_cad,'depositPaidCad',v_booking.deposit_cad),
      jsonb_build_object('bookingDate',p_booking_date,'tableId',p_table_id,
        'tableName',v_table.name,'partySize',p_party_size,
        'minimumSpendCad',v_table.minimum_spend_cad,'depositPaidCad',v_booking.deposit_cad,
        'listedDepositCad',v_table.deposit_cad,'requiresPaymentReview',true)
    );
    update public.leads set booking_change_status='change_requested',
      booking_changed_at=now(),updated_at=now() where id=v_booking.lead_id;
    return jsonb_build_object('requiresReview',true,'tableName',v_table.name,
      'bookingDate',p_booking_date,'listedDepositCad',v_table.deposit_cad,
      'depositPaidCad',v_booking.deposit_cad);
  end if;

  v_change_status := case when p_changed_by='guest' then 'guest_updated' else 'admin_updated' end;
  insert into public.booking_change_history
    (booking_id,lead_id,changed_by,reason,previous_values,new_values)
  values (
    v_booking.id,v_booking.lead_id,p_changed_by,nullif(trim(p_reason),''),
    jsonb_build_object('bookingDate',v_booking.booking_date,'tableId',v_booking.table_id,
      'tableName',v_old_table.name,'partySize',(select party_size from public.leads where id=v_booking.lead_id),
      'minimumSpendCad',v_booking.minimum_spend_cad,'depositPaidCad',v_booking.deposit_cad),
    jsonb_build_object('bookingDate',p_booking_date,'tableId',p_table_id,
      'tableName',v_table.name,'partySize',p_party_size,
      'minimumSpendCad',v_table.minimum_spend_cad,'depositPaidCad',v_booking.deposit_cad,
      'listedDepositCad',v_table.deposit_cad)
  );
  update public.table_bookings set
    table_id=p_table_id, booking_date=p_booking_date,
    minimum_spend_cad=v_table.minimum_spend_cad, updated_at=now()
    where id=v_booking.id;
  update public.leads set
    requested_date=p_booking_date, party_size=p_party_size,
    booking_change_status=v_change_status, booking_changed_at=now(), updated_at=now()
    where id=v_booking.lead_id;
  return jsonb_build_object('tableName',v_table.name,'bookingDate',p_booking_date,
    'minimumSpendCad',v_table.minimum_spend_cad,'depositPaidCad',v_booking.deposit_cad,
    'listedDepositCad',v_table.deposit_cad);
end; $$;

revoke all on function public.reschedule_table_booking(uuid,uuid,date,integer,text,text,boolean)
  from public,anon,authenticated;
grant execute on function public.reschedule_table_booking(uuid,uuid,date,integer,text,text,boolean)
  to service_role;
