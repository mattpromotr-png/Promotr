alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations
  add constraint conversations_channel_check
  check (channel in ('instagram', 'web_preview', 'sms'));

create table if not exists public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null check (channel in ('instagram', 'web_preview', 'sms')),
  external_address text not null,
  normalized_address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, channel, normalized_address),
  unique (contact_id, channel)
);

create table if not exists public.lead_conversations (
  lead_id uuid not null references public.leads(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, conversation_id)
);

create table if not exists public.sms_consents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  contact_channel_id uuid references public.contact_channels(id) on delete cascade,
  phone_e164 text not null,
  status text not null check (status in ('opted_in', 'opted_out')),
  source text not null check (source in ('booking_form', 'incoming_sms', 'admin')),
  consented_at timestamptz,
  opted_out_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sms_consents_phone_idx
  on public.sms_consents (phone_e164);

create table if not exists public.outbound_notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  channel text not null check (channel = 'sms'),
  event_type text not null check (event_type in (
    'inquiry_received', 'deposit_received', 'guest_updated', 'admin_updated',
    'booking_confirmed', 'booking_cancelled', 'refund_started'
  )),
  event_key text not null unique,
  destination text not null,
  rendered_content text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in (
    'pending', 'queued', 'sent', 'delivered', 'undelivered', 'failed', 'skipped'
  )),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_channels_contact_idx
  on public.contact_channels (contact_id, channel);
create index if not exists lead_conversations_lead_idx
  on public.lead_conversations (lead_id, created_at desc);
create index if not exists outbound_notifications_lead_idx
  on public.outbound_notifications (lead_id, created_at desc);
create index if not exists outbound_notifications_provider_idx
  on public.outbound_notifications (provider_message_id)
  where provider_message_id is not null;

alter table public.contact_channels enable row level security;
alter table public.lead_conversations enable row level security;
alter table public.sms_consents enable row level security;
alter table public.outbound_notifications enable row level security;

