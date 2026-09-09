-- Klasso — personal college tracker
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to re-run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone    text not null default 'Asia/Dubai',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- subjects
create table if not exists subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  short_name  text,
  color       text not null default '#497563',
  teacher     text,
  room        text,
  min_attendance numeric not null default 75,
  created_at  timestamptz not null default now()
);
create index if not exists subjects_user_idx on subjects(user_id);

-- ------------------------------------------------------- recurring weekly grid
-- weekday: 0=Sunday .. 6=Saturday (matches JS Date.getDay())
create table if not exists timetable_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  subject_id  uuid references subjects on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  room        text,
  kind        text not null default 'lecture',
  created_at  timestamptz not null default now(),
  constraint slot_time_order check (end_time > start_time)
);
create index if not exists slots_user_day_idx on timetable_slots(user_id, weekday);

-- --------------------------------------------------------- per-date overrides
-- kind: 'cancel_slot' (slot_id set) | 'cancel_day' | 'extra' (subject+times set)
create table if not exists schedule_overrides (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  on_date     date not null,
  kind        text not null check (kind in ('cancel_slot','cancel_day','extra')),
  slot_id     uuid references timetable_slots on delete cascade,
  subject_id  uuid references subjects on delete set null,
  start_time  time,
  end_time    time,
  room        text,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists overrides_user_date_idx on schedule_overrides(user_id, on_date);

-- ------------------------------------------------------- calendar events/exams
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  kind        text not null default 'event' check (kind in ('exam','assignment','event','holiday')),
  subject_id  uuid references subjects on delete set null,
  on_date     date not null,
  start_time  time,
  end_time    time,
  location    text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists events_user_date_idx on events(user_id, on_date);

-- ------------------------------------------------------------------- tasks
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  notes       text,
  subject_id  uuid references subjects on delete set null,
  due_date    date,
  due_time    time,
  priority    smallint not null default 1 check (priority between 0 and 2),
  done        boolean not null default false,
  done_at     timestamptz,
  position    double precision not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_user_idx on tasks(user_id, done, position);

-- Existing tasks remain permanent master tasks. Daily lists never auto-delete.
alter table tasks add column if not exists list_kind text not null default 'master';
alter table tasks add column if not exists planned_date date;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_list_scope' and conrelid = 'tasks'::regclass) then
    alter table tasks add constraint tasks_list_scope check (
      (list_kind = 'master' and planned_date is null) or
      (list_kind = 'daily' and planned_date is not null)
    );
  end if;
end $$;
create index if not exists tasks_scope_idx on tasks(user_id, list_kind, planned_date);

-- -------------------------------------------------------------- attendance
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  subject_id  uuid not null references subjects on delete cascade,
  slot_id     uuid references timetable_slots on delete set null,
  -- Stable identity for "one class on one day": 'slot:<uuid>' for a recurring
  -- class, 'extra:<override uuid>' for a one-off. This exists instead of keying
  -- on a nullable slot_id because ON CONFLICT cannot infer a PARTIAL unique
  -- index (PostgREST sends no predicate), and NULLs compare distinct, so
  -- one-off classes could never be de-duplicated.
  occurrence_key text not null,
  on_date     date not null,
  status      text not null check (status in ('present','absent','cancelled')),
  created_at  timestamptz not null default now()
);

-- Upgrade a database created before occurrence_key existed. Non-destructive.
alter table attendance add column if not exists occurrence_key text;
update attendance
   set occurrence_key = coalesce('slot:' || slot_id::text, 'legacy:' || id::text)
 where occurrence_key is null;
alter table attendance alter column occurrence_key set not null;
drop index if exists attendance_unique_idx;

create unique index if not exists attendance_occurrence_idx
  on attendance(user_id, on_date, occurrence_key);
create index if not exists attendance_user_subject_idx on attendance(user_id, subject_id);

-- ------------------------------------------------------- push subscriptions
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz,
  fail_count  int not null default 0
);
create index if not exists push_subs_user_idx on push_subscriptions(user_id);

-- ------------------------------------------------------ notification settings
create table if not exists notification_prefs (
  user_id             uuid primary key references auth.users on delete cascade,
  class_enabled       boolean not null default true,
  class_lead_minutes  int[]   not null default '{10}',
  day_summary_enabled boolean not null default true,
  day_summary_time    time    not null default '07:30',
  task_enabled        boolean not null default true,
  task_lead_minutes   int[]   not null default '{60}',
  task_allday_time    time    not null default '09:00',
  exam_enabled        boolean not null default true,
  exam_lead_days      int[]   not null default '{7,3,1}',
  exam_lead_minutes   int[]   not null default '{60}',
  quiet_enabled       boolean not null default false,
  quiet_start         time    not null default '23:00',
  quiet_end           time    not null default '07:00',
  updated_at          timestamptz not null default now()
);

-- --------------------------------------------- exactly-once delivery ledger
create table if not exists notification_log (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  dedupe_key text not null unique,
  title      text,
  body       text,
  sent_at    timestamptz not null default now()
);
create index if not exists notif_log_user_idx on notification_log(user_id, sent_at desc);

-- ------------------------------------------------------------- heartbeat
-- The per-minute dispatcher touches this, which also keeps a Supabase free
-- project from being paused for inactivity after 7 idle days.
create table if not exists cron_heartbeat (
  id       int primary key default 1,
  beat_at  timestamptz not null default now(),
  constraint heartbeat_single_row check (id = 1)
);
insert into cron_heartbeat(id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------- syllabus on exams/events
-- Free text, one topic per line. Kept on the event itself rather than in its
-- own table because it is authored and read as a single block; the Planning
-- screen splits it on newlines to offer each topic as a schedulable item.
alter table events add column if not exists syllabus text;

-- --------------------------------------------------------- study plan blocks
-- "What to do, and when." A block is a piece of work placed on a date, with an
-- optional time window, optionally tied to the exam whose syllabus it came from.
create table if not exists study_blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  on_date     date not null,
  start_time  time,
  end_time    time,
  subject_id  uuid references subjects on delete set null,
  -- Deleting the exam removes the blocks that exist only to revise for it.
  event_id    uuid references events on delete cascade,
  notes       text,
  done        boolean not null default false,
  done_at     timestamptz,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  constraint study_block_time_order
    check (start_time is null or end_time is null or end_time > start_time)
);
-- A plan holds more than revision: activities (gym, society, travel) and
-- meetings (a project group, office hours) sit on the same timeline.
alter table study_blocks add column if not exists kind text not null default 'study';
alter table study_blocks add column if not exists location text;
alter table study_blocks add column if not exists people text;
do $$ begin
  alter table study_blocks add constraint study_blocks_kind_check
    check (kind in ('study','activity','meeting'));
exception when duplicate_object then null; end $$;

create index if not exists study_blocks_user_date_idx on study_blocks(user_id, on_date);
create index if not exists study_blocks_event_idx on study_blocks(event_id);

-- =====================================================================
-- Row Level Security — every table is private to its owner
-- =====================================================================
alter table profiles            enable row level security;
alter table subjects            enable row level security;
alter table timetable_slots     enable row level security;
alter table schedule_overrides  enable row level security;
alter table events              enable row level security;
alter table tasks               enable row level security;
alter table attendance          enable row level security;
alter table push_subscriptions  enable row level security;
alter table notification_prefs  enable row level security;
alter table notification_log    enable row level security;
alter table study_blocks        enable row level security;

do $$
declare t text;
begin
  -- profiles / notification_prefs key on `id` / `user_id` as the PK
  execute 'drop policy if exists own_rows on profiles';
  execute 'create policy own_rows on profiles for all using (auth.uid() = id) with check (auth.uid() = id)';

  foreach t in array array[
    'subjects','timetable_slots','schedule_overrides','events','tasks',
    'attendance','push_subscriptions','notification_prefs','notification_log',
    'study_blocks'
  ] loop
    execute format('drop policy if exists own_rows on %I', t);
    execute format(
      'create policy own_rows on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- =====================================================================
-- New user bootstrap: give every signup a profile + default notif prefs
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.notification_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this schema was applied. The trigger
-- above only fires on new inserts, so an account created first would otherwise
-- have no profile and no notification preferences, and Settings would sit on
-- "Loading your preferences…" forever.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

insert into public.notification_prefs (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;
