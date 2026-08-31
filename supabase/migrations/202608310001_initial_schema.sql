create extension if not exists pgcrypto;

create type public.conversation_status as enum ('open', 'handoff_required', 'closed');
create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_sender_type as enum ('guest', 'ai', 'human');
create type public.lead_booking_type as enum ('guest_list', 'table', 'unsure');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'closed');

create table public.venues (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  timezone text not null, booking_form_url text not null, venue_facts jsonb not null default '{}'::jsonb,
  ai_configuration jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.venues(id) on delete cascade,
  instagram_scoped_id text not null, display_name text, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  unique (venue_id, instagram_scoped_id)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.venues(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade, channel text not null default 'instagram' check (channel = 'instagram'),
  status public.conversation_status not null default 'open', handoff_reason text, rolling_summary text,
  last_message_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (venue_id, contact_id, channel)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  provider_message_id text unique, direction public.message_direction not null, sender_type public.message_sender_type not null,
  content text not null check (char_length(content) between 1 and 4000), intent text, delivery_status text not null default 'received',
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.venues(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null, submission_key uuid not null unique,
  name text not null, email text, phone text, instagram_handle text, requested_date date not null,
  preferred_arrival_time time, party_size integer not null check (party_size between 1 and 100), occasion text,
  booking_type public.lead_booking_type not null, bottle_preference text, notes text,
  status public.lead_status not null default 'new', consented_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (email is not null or phone is not null), check (requested_date > current_date),
  check (booking_type <> 'table' or bottle_preference is not null)
);
create table public.lead_submission_attempts (
  id bigint generated always as identity primary key, rate_limit_key text not null, attempted_at timestamptz not null default now()
);
create table public.webhook_events (
  provider_message_id text primary key, normalized_event jsonb not null,
  status text not null default 'received' check (status in ('received', 'forwarded', 'failed')),
  received_at timestamptz not null default now(), forwarded_at timestamptz
);

create index conversations_recent_idx on public.conversations (venue_id, last_message_at desc);
create index messages_context_idx on public.messages (conversation_id, created_at desc);
create index leads_newest_idx on public.leads (venue_id, created_at desc);
create index lead_attempts_window_idx on public.lead_submission_attempts (rate_limit_key, attempted_at desc);

alter table public.venues enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.lead_submission_attempts enable row level security;
alter table public.webhook_events enable row level security;

create policy "permitted admin reads venues" on public.venues for select to authenticated using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "permitted admin reads leads" on public.leads for select to authenticated using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "permitted admin updates leads" on public.leads for update to authenticated using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true)) with check (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));
create policy "permitted admin reads conversations" on public.conversations for select to authenticated using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

create or replace function public.submit_booking_inquiry(p_idempotency_key uuid, p_rate_limit_key text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_venue_id uuid; v_lead_id uuid;
begin
  select id into v_lead_id from public.leads where submission_key = p_idempotency_key;
  if v_lead_id is not null then return v_lead_id; end if;
  perform pg_advisory_xact_lock(hashtext(p_rate_limit_key));
  if (select count(*) from public.lead_submission_attempts where rate_limit_key = p_rate_limit_key and attempted_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limit_exceeded';
  end if;
  insert into public.lead_submission_attempts (rate_limit_key) values (p_rate_limit_key);
  select id into v_venue_id from public.venues where slug = 'promotr-nightclub';
  if v_venue_id is null then raise exception 'venue_not_configured'; end if;
  insert into public.leads (
    venue_id, submission_key, name, email, phone, instagram_handle, requested_date, preferred_arrival_time,
    party_size, occasion, booking_type, bottle_preference, notes, consented_at
  ) values (
    v_venue_id, p_idempotency_key, p_payload ->> 'name', nullif(p_payload ->> 'email', ''), nullif(p_payload ->> 'phone', ''),
    nullif(p_payload ->> 'instagram_handle', ''), (p_payload ->> 'requested_date')::date,
    nullif(p_payload ->> 'preferred_arrival_time', '')::time, (p_payload ->> 'party_size')::integer,
    nullif(p_payload ->> 'occasion', ''), (p_payload ->> 'booking_type')::public.lead_booking_type,
    nullif(p_payload ->> 'bottle_preference', ''), nullif(p_payload ->> 'notes', ''), now()
  ) returning id into v_lead_id;
  return v_lead_id;
end; $$;

revoke all on function public.submit_booking_inquiry(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_booking_inquiry(uuid, text, jsonb) to service_role;
