-- Durable, venue-independent abuse protection for anonymous website AI chat.
create table if not exists public.web_chat_attempts (
  id bigint generated always as identity primary key,
  rate_key text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists web_chat_attempts_rate_window_idx
  on public.web_chat_attempts (rate_key, attempted_at desc);
alter table public.web_chat_attempts enable row level security;

create or replace function public.consume_web_chat_quota(p_rate_key text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_rate_key is null or length(p_rate_key) <> 64 then return false; end if;
  perform pg_advisory_xact_lock(hashtext('web-chat:' || p_rate_key));
  if (select count(*) from public.web_chat_attempts
      where rate_key = p_rate_key and attempted_at > now() - interval '10 minutes') >= 12
    or (select count(*) from public.web_chat_attempts
      where rate_key = p_rate_key and attempted_at > now() - interval '1 day') >= 60 then
    return false;
  end if;
  insert into public.web_chat_attempts (rate_key) values (p_rate_key);
  return true;
end; $$;

revoke all on function public.consume_web_chat_quota(text) from public, anon, authenticated;
grant execute on function public.consume_web_chat_quota(text) to service_role;
