-- Additive conversation intelligence and configurable follow-up state.
-- Existing messages, bookings, identities, and delivery records are untouched.
alter table public.contacts
  add column if not exists preferred_language text,
  add column if not exists memory jsonb not null default '{}'::jsonb,
  add column if not exists memory_updated_at timestamptz;

alter table public.conversations
  add column if not exists follow_up_enabled boolean not null default false,
  add column if not exists follow_up_delay_minutes integer not null default 1440,
  add column if not exists follow_up_interval_minutes integer not null default 1440,
  add column if not exists follow_up_max_attempts integer not null default 1,
  add column if not exists follow_up_attempts integer not null default 0,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists follow_up_last_sent_at timestamptz,
  add column if not exists follow_up_message text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_follow_up_delay_check'
  ) then
    alter table public.conversations
      add constraint conversations_follow_up_delay_check
      check (follow_up_delay_minutes between 15 and 43200);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_follow_up_interval_check'
  ) then
    alter table public.conversations
      add constraint conversations_follow_up_interval_check
      check (follow_up_interval_minutes between 60 and 43200);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_follow_up_attempts_check'
  ) then
    alter table public.conversations
      add constraint conversations_follow_up_attempts_check
      check (
        follow_up_max_attempts between 1 and 5
        and follow_up_attempts between 0 and 5
      );
  end if;
end $$;

create index if not exists conversations_due_follow_up_idx
  on public.conversations (next_follow_up_at)
  where follow_up_enabled = true and next_follow_up_at is not null;
