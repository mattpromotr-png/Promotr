-- Instagram uses the same durable quiet-window/processing state as SMS.
-- Separate RPC names leave the existing SMS behavior untouched.
create or replace function public.claim_instagram_concierge_work(
  p_conversation_id uuid,
  p_quiet_seconds integer default 3
)
returns jsonb
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
  where id = p_conversation_id and channel = 'instagram'
  for update;

  if not found or v_conversation.human_takeover then
    return jsonb_build_object('claimed', false, 'reason', 'unavailable');
  end if;

  select * into v_latest
  from public.messages
  where conversation_id = p_conversation_id and direction = 'inbound'
  order by created_at desc, id desc
  limit 1;

  if not found or v_latest.id = v_conversation.ai_last_processed_message_id then
    return jsonb_build_object('claimed', false, 'reason', 'nothing_new');
  end if;

  if v_latest.created_at > now() - make_interval(secs => greatest(1, least(p_quiet_seconds, 10))) then
    return jsonb_build_object('claimed', false, 'reason', 'not_quiet');
  end if;

  if v_conversation.ai_processing_started_at is not null
     and v_conversation.ai_processing_started_at > now() - interval '2 minutes' then
    return jsonb_build_object('claimed', false, 'reason', 'busy');
  end if;

  update public.conversations
  set ai_processing_started_at = now(),
      ai_processing_message_id = v_latest.id,
      updated_at = now()
  where id = p_conversation_id;

  return jsonb_build_object(
    'claimed', true,
    'messageId', v_latest.id,
    'createdAt', v_latest.created_at
  );
end;
$$;

create or replace function public.finish_instagram_concierge_work(
  p_conversation_id uuid,
  p_message_id uuid,
  p_processed boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer;
begin
  update public.conversations
  set ai_last_processed_message_id = case
        when p_processed then p_message_id
        else ai_last_processed_message_id
      end,
      ai_processing_started_at = null,
      ai_processing_message_id = null,
      updated_at = now()
  where id = p_conversation_id
    and channel = 'instagram'
    and ai_processing_message_id = p_message_id;
  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function public.claim_instagram_concierge_work(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_instagram_concierge_work(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_instagram_concierge_work(uuid, integer) to service_role;
grant execute on function public.finish_instagram_concierge_work(uuid, uuid, boolean) to service_role;
