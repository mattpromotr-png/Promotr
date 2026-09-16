-- Serialize SMS concierge work, provide durable per-manager unread state, and
-- allow authenticated staff clients to receive realtime message changes.
alter table public.conversations
  add column if not exists ai_processing_started_at timestamptz,
  add column if not exists ai_processing_message_id uuid references public.messages(id) on delete set null,
  add column if not exists ai_last_processed_message_id uuid references public.messages(id) on delete set null;

create table if not exists public.conversation_reads (
  staff_membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (staff_membership_id, conversation_id)
);

create index if not exists conversation_reads_conversation_idx
  on public.conversation_reads (conversation_id, last_read_at);

alter table public.conversation_reads enable row level security;

drop policy if exists "venue staff read conversations" on public.conversations;
create policy "venue staff read conversations"
  on public.conversations for select to authenticated
  using (
    exists (
      select 1 from public.staff_memberships sm
      where sm.user_id = auth.uid()
        and sm.venue_id = conversations.venue_id
        and sm.active = true
    )
  );

drop policy if exists "venue staff read messages" on public.messages;
create policy "venue staff read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      join public.staff_memberships sm on sm.venue_id = c.venue_id
      where c.id = messages.conversation_id
        and sm.user_id = auth.uid()
        and sm.active = true
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;

create or replace function public.claim_sms_concierge_work(
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
  where id = p_conversation_id and channel = 'sms'
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

create or replace function public.finish_sms_concierge_work(
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
    and ai_processing_message_id = p_message_id;
  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

create or replace function public.manager_conversation_unread_counts(
  p_staff_membership_id uuid
)
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
as $$
  select c.id,
         count(m.id) filter (
           where m.direction = 'inbound'
             and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
         )::bigint
  from public.staff_memberships sm
  join public.conversations c on c.venue_id = sm.venue_id
  left join public.conversation_reads r
    on r.staff_membership_id = sm.id and r.conversation_id = c.id
  left join public.messages m on m.conversation_id = c.id
  where sm.id = p_staff_membership_id and sm.active = true
  group by c.id;
$$;

create or replace function public.mark_manager_conversation_read(
  p_staff_membership_id uuid,
  p_conversation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.staff_memberships sm
    join public.conversations c on c.venue_id = sm.venue_id
    where sm.id = p_staff_membership_id
      and sm.active = true
      and c.id = p_conversation_id
  ) then
    return false;
  end if;

  insert into public.conversation_reads (
    staff_membership_id, conversation_id, last_read_at, updated_at
  ) values (
    p_staff_membership_id, p_conversation_id, now(), now()
  )
  on conflict (staff_membership_id, conversation_id)
  do update set last_read_at = excluded.last_read_at, updated_at = now();
  return true;
end;
$$;

revoke all on function public.claim_sms_concierge_work(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_sms_concierge_work(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.manager_conversation_unread_counts(uuid) from public, anon, authenticated;
revoke all on function public.mark_manager_conversation_read(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_sms_concierge_work(uuid, integer) to service_role;
grant execute on function public.finish_sms_concierge_work(uuid, uuid, boolean) to service_role;
grant execute on function public.manager_conversation_unread_counts(uuid) to service_role;
grant execute on function public.mark_manager_conversation_read(uuid, uuid) to service_role;

comment on table public.conversation_reads is
  'Per-manager read cursor used for durable unread conversation counts.';
