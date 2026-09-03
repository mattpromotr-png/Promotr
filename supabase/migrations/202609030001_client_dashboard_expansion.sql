alter type public.lead_status rename value 'qualified' to 'pending';
alter type public.lead_status rename value 'closed' to 'booked';

alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations
  add constraint conversations_channel_check
  check (channel in ('instagram', 'web_preview'));
alter table public.conversations
  add column if not exists human_takeover boolean not null default false;

alter table public.leads
  add column if not exists confirmed_revenue_cad numeric(10, 2),
  add column if not exists booked_at timestamptz;
alter table public.leads
  add constraint leads_confirmed_revenue_nonnegative
  check (confirmed_revenue_cad is null or confirmed_revenue_cad >= 0);

create index if not exists conversations_channel_recent_idx
  on public.conversations (channel, last_message_at desc);
create index if not exists leads_booked_revenue_idx
  on public.leads (booked_at desc)
  where status = 'booked';

create or replace function public.prepare_web_preview_message(
  p_session_id text, p_provider_message_id text, p_content text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_venue public.venues%rowtype; v_contact_id uuid; v_conversation public.conversations%rowtype; v_messages jsonb;
begin
  select * into v_venue from public.venues where slug = 'promotr-nightclub';
  if v_venue.id is null then raise exception 'venue_not_configured'; end if;
  insert into public.contacts (venue_id, instagram_scoped_id)
  values (v_venue.id, 'web:' || p_session_id)
  on conflict (venue_id, instagram_scoped_id) do update set last_seen_at = now()
  returning id into v_contact_id;
  insert into public.conversations (venue_id, contact_id, channel)
  values (v_venue.id, v_contact_id, 'web_preview')
  on conflict (venue_id, contact_id, channel) do update
    set last_message_at = now(), updated_at = now()
  returning * into v_conversation;
  insert into public.messages (conversation_id, provider_message_id, direction, sender_type, content)
  values (v_conversation.id, p_provider_message_id, 'inbound', 'guest', p_content)
  on conflict (provider_message_id) do nothing;
  select coalesce(jsonb_agg(item order by created_at), '[]'::jsonb) into v_messages from (
    select direction, sender_type, content, metadata, created_at
    from public.messages where conversation_id = v_conversation.id
    order by created_at desc limit 12
  ) item;
  return jsonb_build_object(
    'conversationId', v_conversation.id,
    'humanTakeover', v_conversation.human_takeover,
    'recentMessages', v_messages
  );
end; $$;

create or replace function public.complete_web_preview_reply(
  p_conversation_id uuid, p_content text, p_intent text,
  p_handoff_required boolean, p_handoff_reason text, p_metadata jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.messages (conversation_id, direction, sender_type, content, intent, delivery_status, metadata)
  values (p_conversation_id, 'outbound', 'ai', p_content, p_intent, 'sent', coalesce(p_metadata, '{}'::jsonb));
  update public.conversations set
    status = case when p_handoff_required then 'handoff_required'::public.conversation_status else status end,
    handoff_reason = case when p_handoff_required then p_handoff_reason else handoff_reason end,
    last_message_at = now(), updated_at = now()
  where id = p_conversation_id;
end; $$;

create or replace function public.get_web_preview_messages(
  p_conversation_id uuid, p_session_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_messages jsonb; v_human_takeover boolean;
begin
  select c.human_takeover into v_human_takeover
    from public.conversations c
    join public.contacts ct on ct.id = c.contact_id
    where c.id = p_conversation_id and c.channel = 'web_preview'
      and ct.instagram_scoped_id = 'web:' || p_session_id;
  if v_human_takeover is null then raise exception 'conversation_not_found'; end if;
  select coalesce(jsonb_agg(item order by created_at), '[]'::jsonb) into v_messages from (
    select id, sender_type, content, metadata, created_at
    from public.messages where conversation_id = p_conversation_id
    order by created_at desc limit 30
  ) item;
  return jsonb_build_object('humanTakeover', v_human_takeover, 'messages', v_messages);
end; $$;

create or replace function public.submit_booking_inquiry(p_idempotency_key uuid, p_rate_limit_key text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_venue_id uuid; v_lead_id uuid; v_conversation_id uuid;
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
  begin v_conversation_id := nullif(p_payload ->> 'conversation_id', '')::uuid;
  exception when invalid_text_representation then v_conversation_id := null; end;
  if v_conversation_id is not null and not exists (
    select 1 from public.conversations where id = v_conversation_id and venue_id = v_venue_id
  ) then v_conversation_id := null; end if;
  insert into public.leads (
    venue_id, conversation_id, submission_key, name, email, phone, instagram_handle, requested_date,
    preferred_arrival_time, party_size, occasion, booking_type, bottle_preference, notes, consented_at
  ) values (
    v_venue_id, v_conversation_id, p_idempotency_key, p_payload ->> 'name', nullif(p_payload ->> 'email', ''),
    nullif(p_payload ->> 'phone', ''), nullif(p_payload ->> 'instagram_handle', ''),
    (p_payload ->> 'requested_date')::date, nullif(p_payload ->> 'preferred_arrival_time', '')::time,
    (p_payload ->> 'party_size')::integer, nullif(p_payload ->> 'occasion', ''),
    (p_payload ->> 'booking_type')::public.lead_booking_type, nullif(p_payload ->> 'bottle_preference', ''),
    nullif(p_payload ->> 'notes', ''), now()
  ) returning id into v_lead_id;
  return v_lead_id;
end; $$;

revoke all on function public.prepare_web_preview_message(text, text, text) from public, anon, authenticated;
revoke all on function public.complete_web_preview_reply(uuid, text, text, boolean, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_web_preview_messages(uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_web_preview_message(text, text, text) to service_role;
grant execute on function public.complete_web_preview_reply(uuid, text, text, boolean, text, jsonb) to service_role;
grant execute on function public.get_web_preview_messages(uuid, text) to service_role;
