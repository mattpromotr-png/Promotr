-- Separate new homepage chats; preserve historical transcripts with uncertain origin.
alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations add constraint conversations_channel_check
  check (channel in ('instagram', 'sms', 'email', 'web_preview', 'webchat'));
-- Homepage API stamps inbound IDs as web:<session UUID>:<message UUID>.
-- Only move threads whose entire inbound history has that fingerprint.
update public.conversations c set channel = 'webchat'
where c.channel = 'web_preview'
  and exists (select 1 from public.messages m where m.conversation_id = c.id and m.direction = 'inbound')
  and not exists (
    select 1 from public.messages m where m.conversation_id = c.id and m.direction = 'inbound'
      and (m.provider_message_id is null or m.provider_message_id !~ '^web:[0-9a-f-]{36}:[0-9a-f-]{36}$')
  );
create or replace function public.prepare_webchat_message(
  p_session_id text,
  p_provider_message_id text,
  p_content text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue public.venues%rowtype;
  v_contact_id uuid;
  v_conversation public.conversations%rowtype;
  v_inbound_message_id uuid;
  v_messages jsonb;
begin
  select * into v_venue
  from public.venues
  where slug = 'promotr-nightclub';

  if v_venue.id is null then
    raise exception 'venue_not_configured';
  end if;

  insert into public.contacts (venue_id, instagram_scoped_id)
  values (v_venue.id, 'web:' || p_session_id)
  on conflict (venue_id, instagram_scoped_id)
  do update set last_seen_at = now()
  returning id into v_contact_id;

  insert into public.conversations (venue_id, contact_id, channel)
  values (v_venue.id, v_contact_id, 'webchat')
  on conflict (venue_id, contact_id, channel)
  do update set
    last_message_at = now(),
    updated_at = now()
  returning * into v_conversation;

  insert into public.messages (
    conversation_id,
    provider_message_id,
    direction,
    sender_type,
    content
  )
  values (
    v_conversation.id,
    p_provider_message_id,
    'inbound',
    'guest',
    p_content
  )
  on conflict (provider_message_id)
  do update set content = public.messages.content
  returning id into v_inbound_message_id;

  select coalesce(jsonb_agg(item order by created_at), '[]'::jsonb)
  into v_messages
  from (
    select id, direction, sender_type, content, metadata, created_at
    from public.messages
    where conversation_id = v_conversation.id
    order by created_at desc
    limit 12
  ) item;

  return jsonb_build_object(
    'conversationId', v_conversation.id,
    'inboundMessageId', v_inbound_message_id,
    'humanTakeover', v_conversation.human_takeover,
    'recentMessages', v_messages
  );
end;
$$;

create or replace function public.get_webchat_messages(
  p_conversation_id uuid,
  p_session_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_messages jsonb;
  v_human_takeover boolean;
begin
  select c.human_takeover
  into v_human_takeover
  from public.conversations c
  join public.contacts ct on ct.id = c.contact_id
  where c.id = p_conversation_id
    and c.channel = 'webchat'
    and ct.instagram_scoped_id = 'web:' || p_session_id;

  if v_human_takeover is null then
    raise exception 'conversation_not_found';
  end if;

  select coalesce(jsonb_agg(item order by created_at), '[]'::jsonb)
  into v_messages
  from (
    select id, sender_type, content, metadata, created_at
    from public.messages
    where conversation_id = p_conversation_id
    order by created_at desc
    limit 100
  ) item;

  return jsonb_build_object(
    'humanTakeover', v_human_takeover,
    'messages', v_messages
  );
end;
$$;

revoke all on function public.prepare_webchat_message(text, text, text)
  from public, anon, authenticated;
revoke all on function public.get_webchat_messages(uuid, text)
  from public, anon, authenticated;

grant execute on function public.prepare_webchat_message(text, text, text)
  to service_role;
grant execute on function public.get_webchat_messages(uuid, text)
  to service_role;

create or replace function public.complete_webchat_reply(
  p_conversation_id uuid, p_content text, p_intent text,
  p_handoff_required boolean, p_handoff_reason text, p_metadata jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversations where id = p_conversation_id and channel = 'webchat') then
    raise exception 'conversation_not_found';
  end if;
  insert into public.messages (conversation_id, direction, sender_type, content, intent, delivery_status, metadata)
  values (p_conversation_id, 'outbound', 'ai', p_content, p_intent, 'sent', coalesce(p_metadata, '{}'::jsonb));
  update public.conversations set
    status = case when p_handoff_required then 'handoff_required'::public.conversation_status else status end,
    handoff_reason = case when p_handoff_required then p_handoff_reason else handoff_reason end,
    last_message_at = now(), updated_at = now()
  where id = p_conversation_id;
end; $$;


revoke all on function public.complete_webchat_reply(uuid, text, text, boolean, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_webchat_reply(uuid, text, text, boolean, text, jsonb) to service_role;
-- Block the temporary app's old persistence endpoints, including old deployments.
revoke all on function public.prepare_web_preview_message(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.get_web_preview_messages(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.complete_web_preview_reply(uuid, text, text, boolean, text, jsonb) from public, anon, authenticated, service_role;
