create table public.found_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  item_name text not null check (char_length(item_name) between 2 and 120),
  description text not null check (char_length(description) between 2 and 1000),
  found_date date not null,
  approximate_found_time time,
  found_location text check (found_location is null or char_length(found_location) <= 200),
  table_number text check (table_number is null or char_length(table_number) <= 50),
  status text not null default 'available'
    check (status in ('available', 'matched', 'claimed', 'disposed')),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lost_found_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  submission_key uuid not null unique,
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (char_length(phone) between 7 and 30),
  email text not null check (char_length(email) between 5 and 254),
  item_description text not null check (char_length(item_description) between 3 and 1200),
  lost_date date not null,
  approximate_lost_time time,
  last_known_location text check (last_known_location is null or char_length(last_known_location) <= 200),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'matched', 'closed')),
  matched_found_item_id uuid references public.found_items(id) on delete set null,
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lost_found_submission_attempts (
  id bigint generated always as identity primary key,
  rate_limit_key text not null,
  attempted_at timestamptz not null default now()
);

create index found_items_status_date_idx
  on public.found_items (venue_id, status, found_date desc);
create index lost_found_reports_status_recent_idx
  on public.lost_found_reports (venue_id, status, created_at desc);
create index lost_found_attempts_window_idx
  on public.lost_found_submission_attempts (rate_limit_key, attempted_at desc);

alter table public.found_items enable row level security;
alter table public.lost_found_reports enable row level security;
alter table public.lost_found_submission_attempts enable row level security;

create or replace function public.submit_lost_found_report(
  p_idempotency_key uuid,
  p_rate_limit_key text,
  p_payload jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_venue_id uuid; v_report_id uuid; v_conversation_id uuid;
begin
  select id into v_report_id
    from public.lost_found_reports where submission_key = p_idempotency_key;
  if v_report_id is not null then return v_report_id; end if;

  perform pg_advisory_xact_lock(hashtext('lost-found:' || p_rate_limit_key));
  if (select count(*) from public.lost_found_submission_attempts
      where rate_limit_key = p_rate_limit_key
        and attempted_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limit_exceeded';
  end if;
  insert into public.lost_found_submission_attempts (rate_limit_key)
    values (p_rate_limit_key);

  select id into v_venue_id from public.venues where slug = 'promotr-nightclub';
  if v_venue_id is null then raise exception 'venue_not_configured'; end if;

  begin v_conversation_id := nullif(p_payload ->> 'conversation_id', '')::uuid;
  exception when invalid_text_representation then v_conversation_id := null; end;
  if v_conversation_id is not null and not exists (
    select 1 from public.conversations
      where id = v_conversation_id and venue_id = v_venue_id
  ) then v_conversation_id := null; end if;

  insert into public.lost_found_reports (
    venue_id, conversation_id, submission_key, name, phone, email,
    item_description, lost_date, approximate_lost_time, last_known_location
  ) values (
    v_venue_id, v_conversation_id, p_idempotency_key,
    p_payload ->> 'name', p_payload ->> 'phone', p_payload ->> 'email',
    p_payload ->> 'item_description', (p_payload ->> 'lost_date')::date,
    nullif(p_payload ->> 'approximate_lost_time', '')::time,
    nullif(p_payload ->> 'last_known_location', '')
  ) returning id into v_report_id;
  return v_report_id;
end; $$;

revoke all on function public.submit_lost_found_report(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_lost_found_report(uuid, text, jsonb)
  to service_role;
