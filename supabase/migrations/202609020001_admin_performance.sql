create index if not exists leads_status_created_idx
  on public.leads (status, created_at desc);

create index if not exists leads_requested_date_idx
  on public.leads (requested_date, created_at desc);

create index if not exists conversations_status_recent_idx
  on public.conversations (status, last_message_at desc);

