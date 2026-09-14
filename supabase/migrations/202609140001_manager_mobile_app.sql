create table if not exists public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, user_id)
);

create table if not exists public.manager_devices (
  id uuid primary key default gen_random_uuid(),
  staff_membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  notifications_enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_memberships_user_active_idx
  on public.staff_memberships (user_id, active);
create index if not exists manager_devices_membership_enabled_idx
  on public.manager_devices (staff_membership_id, notifications_enabled);

alter table public.staff_memberships enable row level security;
alter table public.manager_devices enable row level security;

comment on table public.staff_memberships is
  'Venue-scoped authorization for Promotr dashboard and manager-app users.';
comment on table public.manager_devices is
  'Manager mobile devices eligible for Expo push notifications.';

-- No direct client policies are intentional. These records are accessed only
-- through authenticated, venue-scoped server API routes.
