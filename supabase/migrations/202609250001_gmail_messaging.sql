alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations
  add constraint conversations_channel_check
  check (channel in ('instagram', 'web_preview', 'sms', 'email'));

alter table public.contact_channels drop constraint if exists contact_channels_channel_check;
alter table public.contact_channels
  add constraint contact_channels_channel_check
  check (channel in ('instagram', 'web_preview', 'sms', 'email'));

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references public.venues(id) on delete cascade,
  email_address text not null,
  encrypted_refresh_token text not null,
  granted_scopes text[] not null default '{}',
  history_id text,
  watch_expiration timestamptz,
  status text not null default 'connected'
    check (status in ('connected', 'error', 'revoked')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

create index if not exists gmail_connections_status_idx
  on public.gmail_connections (status, updated_at desc);

create or replace function public.claim_email_concierge_work(
  p_conversation_id uuid,
  p_quiet_seconds integer default 3
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations%rowtype;
  v_latest public.messages%rowtype;
begin
  select * into v_conversation
  from public.conversations
  where id = p_conversation_id and channel = 'email'
  for update;

  if not found then return jsonb_build_object('claimed', false, 'reason', 'missing'); end if;
  if v_conversation.human_takeover then return jsonb_build_object('claimed', false, 'reason', 'paused'); end if;
  if v_conversation.ai_processing_message_id is not null then
    return jsonb_build_object('claimed', false, 'reason', 'busy');
  end if;

  select * into v_latest
  from public.messages
  where conversation_id = p_conversation_id and direction = 'inbound'
  order by created_at desc
  limit 1;

  if not found then return jsonb_build_object('claimed', false, 'reason', 'empty'); end if;
  if v_latest.id = v_conversation.ai_last_processed_message_id then
    return jsonb_build_object('claimed', false, 'reason', 'processed');
  end if;
  if v_latest.created_at > now() - make_interval(secs => greatest(p_quiet_seconds, 0)) then
    return jsonb_build_object('claimed', false, 'reason', 'not_quiet');
  end if;

  update public.conversations
  set ai_processing_message_id = v_latest.id, updated_at = now()
  where id = p_conversation_id;

  return jsonb_build_object(
    'claimed', true,
    'messageId', v_latest.id,
    'createdAt', v_latest.created_at
  );
end;
$$;

create or replace function public.finish_email_concierge_work(
  p_conversation_id uuid,
  p_message_id uuid,
  p_processed boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    ai_processing_message_id = null,
    ai_last_processed_message_id = case
      when p_processed then p_message_id
      else ai_last_processed_message_id
    end,
    updated_at = now()
  where id = p_conversation_id
    and channel = 'email'
    and ai_processing_message_id = p_message_id;
end;
$$;

revoke all on function public.claim_email_concierge_work(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_email_concierge_work(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_email_concierge_work(uuid, integer) to service_role;
grant execute on function public.finish_email_concierge_work(uuid, uuid, boolean) to service_role;
