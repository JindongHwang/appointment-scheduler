-- Nolaboda: tables and the functions the browser calls.
-- Run this whole file once in the Supabase SQL editor. It is safe to run again.
--
-- How access works:
--   * The page only calls the five functions at the bottom (create_room, get_room, ...).
--   * Every function first records which room it is working on. The row level security
--     policies only let a request see or change rows of that one room.
--   * Reading the tables directly through the Data API returns nothing, so nobody can
--     list rooms. Knowing a room's id (the invite link) is what grants access to it.

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

-- Policies from the old server-based setup are no longer needed.
drop policy if exists "rooms service role all" on public.rooms;
drop policy if exists "participants service role all" on public.participants;

drop policy if exists "rooms current room select" on public.rooms;
drop policy if exists "rooms current room insert" on public.rooms;
drop policy if exists "rooms current room update" on public.rooms;
drop policy if exists "participants current room select" on public.participants;
drop policy if exists "participants current room insert" on public.participants;
drop policy if exists "participants current room update" on public.participants;

create policy "rooms current room select" on public.rooms
  for select to anon, authenticated
  using (id = current_setting('nolaboda.room_id', true));

create policy "rooms current room insert" on public.rooms
  for insert to anon, authenticated
  with check (id = current_setting('nolaboda.room_id', true));

create policy "rooms current room update" on public.rooms
  for update to anon, authenticated
  using (id = current_setting('nolaboda.room_id', true))
  with check (id = current_setting('nolaboda.room_id', true));

create policy "participants current room select" on public.participants
  for select to anon, authenticated
  using (room_id = current_setting('nolaboda.room_id', true));

create policy "participants current room insert" on public.participants
  for insert to anon, authenticated
  with check (room_id = current_setting('nolaboda.room_id', true));

create policy "participants current room update" on public.participants
  for update to anon, authenticated
  using (room_id = current_setting('nolaboda.room_id', true))
  with check (room_id = current_setting('nolaboda.room_id', true));

-- No delete for the browser roles. Rows are only removed from the Supabase dashboard.
revoke all on table public.rooms from anon, authenticated;
revoke all on table public.participants from anon, authenticated;
grant select, insert, update on table public.rooms to anon, authenticated;
grant select, insert, update on table public.participants to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Functions (called as /rest/v1/rpc/<name>)
-- ---------------------------------------------------------------------------

create or replace function public.get_room(p_room_id text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_room jsonb;
begin
  perform set_config('nolaboda.room_id', coalesce(p_room_id, ''), true);

  select jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'confirmedDate', r.confirmed_date,
    'createdAt', r.created_at,
    'participants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'color', p.color,
          'availableDates', to_jsonb(p.available_dates)
        )
        order by p.created_at, p.id
      )
      from public.participants p
      where p.room_id = r.id
    ), '[]'::jsonb)
  )
  into v_room
  from public.rooms r
  where r.id = p_room_id;

  return v_room; -- null when the room does not exist
end;
$$;

create or replace function public.create_room(p_title text default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id text := 'room_' || replace(gen_random_uuid()::text, '-', '');
  v_title text := coalesce(nullif(btrim(left(coalesce(p_title, ''), 32)), ''), 'New event');
begin
  perform set_config('nolaboda.room_id', v_id, true);
  insert into public.rooms (id, title) values (v_id, v_title);
  return public.get_room(v_id);
end;
$$;

create or replace function public.update_room(
  p_room_id text,
  p_title text default null,
  p_confirmed_date text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_title text := nullif(btrim(left(coalesce(p_title, ''), 32)), '');
  v_date text := btrim(p_confirmed_date);
begin
  perform set_config('nolaboda.room_id', coalesce(p_room_id, ''), true);

  if v_date is not null and v_date <> '' and v_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception '날짜 형식이 올바르지 않아요.';
  end if;

  update public.rooms
  set title = coalesce(v_title, title),
      confirmed_date = coalesce(v_date, confirmed_date)
  where id = p_room_id;

  if not found then
    raise exception '약속을 찾을 수 없어요.';
  end if;

  return public.get_room(p_room_id);
end;
$$;

create or replace function public.add_participant(p_room_id text, p_name text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_colors text[] := array['#4f9d76', '#ef7d6b', '#5f8fc7', '#e4b94f', '#9b72cf'];
  v_count int;
  v_id text := 'p_' || replace(gen_random_uuid()::text, '-', '');
  v_name text;
  v_color text;
begin
  perform set_config('nolaboda.room_id', coalesce(p_room_id, ''), true);

  if not exists (select 1 from public.rooms where id = p_room_id) then
    raise exception '약속을 찾을 수 없어요.';
  end if;

  select count(*) into v_count from public.participants where room_id = p_room_id;
  if v_count >= 30 then
    raise exception '한 약속에는 30명까지 참여할 수 있어요.';
  end if;

  v_name := coalesce(nullif(btrim(left(coalesce(p_name, ''), 12)), ''), 'Friend ' || (v_count + 1));
  v_color := v_colors[(v_count % 5) + 1];

  insert into public.participants (id, room_id, name, color)
  values (v_id, p_room_id, v_name, v_color);

  return jsonb_build_object('id', v_id, 'name', v_name, 'color', v_color, 'availableDates', '[]'::jsonb);
end;
$$;

create or replace function public.toggle_participant_date(
  p_room_id text,
  p_participant_id text,
  p_date text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_date text := btrim(coalesce(p_date, ''));
begin
  perform set_config('nolaboda.room_id', coalesce(p_room_id, ''), true);

  if v_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception '날짜 형식이 올바르지 않아요.';
  end if;

  update public.participants
  set available_dates = case
    when v_date = any(available_dates) then array_remove(available_dates, v_date)
    else (select array_agg(d order by d) from unnest(array_append(available_dates, v_date)) as d)
  end
  where id = p_participant_id
    and room_id = p_room_id
    and (v_date = any(available_dates) or coalesce(array_length(available_dates, 1), 0) < 366);

  if not found then
    raise exception '참여자를 찾을 수 없어요.';
  end if;

  return public.get_room(p_room_id);
end;
$$;

-- Only these five functions are callable from the browser.
revoke all on function public.get_room(text) from public;
revoke all on function public.create_room(text) from public;
revoke all on function public.update_room(text, text, text) from public;
revoke all on function public.add_participant(text, text) from public;
revoke all on function public.toggle_participant_date(text, text, text) from public;

grant execute on function public.get_room(text) to anon, authenticated;
grant execute on function public.create_room(text) to anon, authenticated;
grant execute on function public.update_room(text, text, text) to anon, authenticated;
grant execute on function public.add_participant(text, text) to anon, authenticated;
grant execute on function public.toggle_participant_date(text, text, text) to anon, authenticated;

-- Make the Data API pick up the new functions right away.
notify pgrst, 'reload schema';
