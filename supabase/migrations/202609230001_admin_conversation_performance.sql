create index if not exists messages_inbound_unread_idx
  on public.messages (conversation_id, created_at)
  where direction = 'inbound';

create or replace function public.manager_conversation_unread_counts(
  p_staff_membership_id uuid
)
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
as $$
  select c.id,
         (
           select count(*)::bigint
           from public.messages m
           where m.conversation_id = c.id
             and m.direction = 'inbound'
             and m.created_at > coalesce(
               r.last_read_at,
               '-infinity'::timestamptz
             )
         ) as unread_count
  from public.staff_memberships sm
  join public.conversations c on c.venue_id = sm.venue_id
  left join public.conversation_reads r
    on r.staff_membership_id = sm.id
   and r.conversation_id = c.id
  where sm.id = p_staff_membership_id
    and sm.active = true;
$$;

revoke all on function public.manager_conversation_unread_counts(uuid)
  from public, anon, authenticated;
grant execute on function public.manager_conversation_unread_counts(uuid)
  to service_role;

comment on index public.messages_inbound_unread_idx is
  'Supports per-manager unread counts without scanning outbound messages.';
