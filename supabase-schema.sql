create table if not exists public.rooms (
  id text primary key,
  title text not null default 'New event',
  confirmed_date text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id text primary key,
  room_id text not null references public.rooms(id) on delete cascade,
  name text not null,
  color text not null,
  available_dates text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists participants_room_id_idx on public.participants(room_id);

alter table public.rooms enable row level security;
alter table public.participants enable row level security;

drop policy if exists "rooms service role all" on public.rooms;
drop policy if exists "participants service role all" on public.participants;

create policy "rooms service role all"
on public.rooms
for all
to service_role
using (true)
with check (true);

create policy "participants service role all"
on public.participants
for all
to service_role
using (true)
with check (true);
