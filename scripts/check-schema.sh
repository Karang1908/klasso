#!/usr/bin/env bash
# Runs supabase/schema.sql against a throwaway PostgreSQL cluster and asserts the
# queries the app actually sends still work. This exists because a partial unique
# index once made every attendance upsert fail with
#   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
# — invisible to tsc, eslint and the UI tests, and only reachable with a real database.
#
# Skips cleanly (exit 0) if PostgreSQL is not installed locally.
set -uo pipefail

for d in "$(dirname "$(command -v pg_ctl 2>/dev/null || echo /nonexistent)")" \
         /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin \
         /opt/homebrew/opt/postgresql@15/bin /opt/homebrew/opt/postgresql@14/bin \
         /usr/lib/postgresql/16/bin /usr/lib/postgresql/15/bin; do
  if [ -x "$d/initdb" ]; then PGBIN="$d"; break; fi
done
if [ -z "${PGBIN:-}" ]; then
  echo "SKIP  no local PostgreSQL found (brew install postgresql@16) — schema not checked"
  exit 0
fi
export PATH="$PGBIN:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$(mktemp -d "${TMPDIR:-/tmp}/klasso-schema-XXXXXX")"
PORT="${PGPORT_TEST:-55433}"
cleanup() { pg_ctl -D "$DIR/data" stop -m immediate >/dev/null 2>&1; rm -rf "$DIR"; }
trap cleanup EXIT

initdb -D "$DIR/data" -U postgres --auth=trust >/dev/null 2>&1 || { echo "FAIL initdb"; exit 1; }
# TCP only: a unix socket path under TMPDIR blows past the 103-byte limit.
pg_ctl -D "$DIR/data" -l "$DIR/log" \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start >/dev/null 2>&1
for _ in $(seq 1 25); do
  pg_isready -h 127.0.0.1 -p "$PORT" -q && break; sleep 0.4
done
Q() { psql -h 127.0.0.1 -p "$PORT" -U postgres -d klasso -v ON_ERROR_STOP=1 -tAq "$@"; }

psql -h 127.0.0.1 -p "$PORT" -U postgres -q -c "create database klasso;" >/dev/null 2>&1
# Minimal stand-in for the Supabase-managed auth schema.
psql -h 127.0.0.1 -p "$PORT" -U postgres -d klasso -q >/dev/null 2>&1 <<'SQL'
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text, raw_user_meta_data jsonb default '{}'::jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
SQL

fails=0
ck() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 — got '$2' want '$3'"; fails=$((fails+1)); fi; }

if Q -f "$ROOT/supabase/schema.sql" >/dev/null 2>"$DIR/err"; then echo "PASS  schema.sql applies"
else echo "FAIL  schema.sql: $(tail -2 "$DIR/err")"; fails=$((fails+1)); fi
if Q -f "$ROOT/supabase/schema.sql" >/dev/null 2>"$DIR/err2"; then echo "PASS  schema.sql is idempotent (re-run)"
else echo "FAIL  re-run: $(tail -2 "$DIR/err2")"; fails=$((fails+1)); fi

U=11111111-1111-1111-1111-111111111111
S=22222222-2222-2222-2222-222222222222
L=33333333-3333-3333-3333-333333333333
Q -c "insert into auth.users (id,email) values ('$U','me@example.com');" >/dev/null 2>&1
ck "new-user trigger creates a profile"        "$(Q -c "select count(*) from profiles;")" "1"
ck "new-user trigger creates notification prefs" "$(Q -c "select count(*) from notification_prefs;")" "1"
ck "default class reminder is 10 minutes"      "$(Q -c "select class_lead_minutes::text from notification_prefs;")" "{10}"

Q -c "insert into subjects (id,user_id,name) values ('$S','$U','Physics');
      insert into timetable_slots (id,user_id,subject_id,weekday,start_time,end_time)
      values ('$L','$U','$S',3,'09:00','10:00');" >/dev/null 2>&1

mark() { # occurrence_key, slot_id-or-NULL, status
  Q -c "insert into attendance (user_id,subject_id,slot_id,occurrence_key,on_date,status)
        values ('$U','$S',$2,'$1','2026-09-09','$3')
        on conflict (user_id,on_date,occurrence_key) do update set status=excluded.status;" >/dev/null 2>&1
  echo $?
}
ck "attendance upsert works for a recurring class" "$(mark "slot:$L" "'$L'" present)" "0"
ck "re-marking updates instead of erroring"        "$(mark "slot:$L" "'$L'" absent)"  "0"
ck "…and does not duplicate the row"  "$(Q -c "select count(*) from attendance where occurrence_key='slot:$L';")" "1"
ck "…and the status actually changed" "$(Q -c "select status from attendance where occurrence_key='slot:$L';")" "absent"
ck "attendance upsert works for a one-off class"   "$(mark "extra:44444444-4444-4444-4444-444444444444" NULL present)" "0"
ck "one-off marked twice stays one row" \
   "$(mark "extra:44444444-4444-4444-4444-444444444444" NULL absent >/dev/null; Q -c "select count(*) from attendance where occurrence_key like 'extra:%';")" "1"

ck "notification_log dedupe_key is unique" \
  "$(Q -c "insert into notification_log (user_id,dedupe_key) values ('$U','k1'),('$U','k1');" >/dev/null 2>&1; echo $?)" "1"
ck "row-level security is on for every table" \
  "$(Q -c "select count(*) from pg_tables where schemaname='public' and rowsecurity=false and tablename<>'cron_heartbeat';")" "0"
ck "end_time must be after start_time" \
  "$(Q -c "insert into timetable_slots (user_id,subject_id,weekday,start_time,end_time) values ('$U','$S',1,'10:00','09:00');" >/dev/null 2>&1; echo $?)" "1"

Q -c "insert into tasks (user_id,title) values ('$U','Legacy master task');" >/dev/null 2>&1
ck "existing task writes default to permanent Master" "$(Q -c "select list_kind from tasks where title='Legacy master task';")" "master"
ck "Daily tasks require a planned date" \
  "$(Q -c "insert into tasks (user_id,title,list_kind) values ('$U','Invalid daily','daily');" >/dev/null 2>&1; echo $?)" "1"
ck "Master tasks have no planned date" \
  "$(Q -c "insert into tasks (user_id,title,list_kind,planned_date) values ('$U','Invalid master','master','2026-09-09');" >/dev/null 2>&1; echo $?)" "1"
Q -c "insert into tasks (user_id,title,list_kind,planned_date,done) values
  ('$U','Daily today','daily','2026-09-09',true),
  ('$U','Daily yesterday','daily','2026-09-08',true),
  ('$U','Master done','master',null,true);
  delete from tasks where list_kind='daily' and planned_date='2026-09-09' and done=true;" >/dev/null 2>&1
ck "clearing today's Daily preserves Master and yesterday" "$(Q -c "select count(*) from tasks;")" "3"
Q -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1
ck "schema re-run preserves existing tasks" "$(Q -c "select count(*) from tasks;")" "3"

E=55555555-5555-5555-5555-555555555555
ck "events accept a syllabus" \
  "$(Q -c "insert into events (id,user_id,title,kind,on_date,syllabus) values ('$E','$U','Midterm','exam','2026-09-20','Alpha
Beta');" >/dev/null 2>&1; echo $?)" "0"
ck "study blocks attach to an exam" \
  "$(Q -c "insert into study_blocks (user_id,title,on_date,event_id) values ('$U','Alpha','2026-09-15','$E');" >/dev/null 2>&1; echo $?)" "0"
ck "a block's end time must follow its start" \
  "$(Q -c "insert into study_blocks (user_id,title,on_date,start_time,end_time) values ('$U','Bad','2026-09-15','18:00','17:00');" >/dev/null 2>&1; echo $?)" "1"
ck "a block may be untimed" \
  "$(Q -c "insert into study_blocks (user_id,title,on_date) values ('$U','Whenever','2026-09-16');" >/dev/null 2>&1; echo $?)" "0"
ck "deleting the exam removes its revision blocks" \
  "$(Q -c "delete from events where id='$E';" >/dev/null 2>&1; Q -c "select count(*) from study_blocks where event_id='$E';")" "0"
ck "…but leaves unrelated blocks alone" "$(Q -c "select count(*) from study_blocks;")" "1"

ck "activities persist with a location" \
  "$(Q -c "insert into study_blocks (user_id,title,kind,on_date,location) values ('$U','Society practice','activity','2026-09-16','Sports hall');" >/dev/null 2>&1; echo $?)" "0"
ck "meetings persist participants and time" \
  "$(Q -c "insert into study_blocks (user_id,title,kind,on_date,people,start_time,end_time) values ('$U','Project meeting','meeting','2026-09-16','Study group','14:00','15:00');" >/dev/null 2>&1; echo $?)" "0"
ck "unsupported plan types are rejected" \
  "$(Q -c "insert into study_blocks (user_id,title,kind,on_date) values ('$U','Invalid','invalid','2026-09-16');" >/dev/null 2>&1; echo $?)" "1"
Q -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1
ck "schema upgrade preserves activities and meetings" "$(Q -c "select count(*) from study_blocks where kind in ('activity','meeting');")" "2"

# Someone who signed up before the schema was applied (no trigger yet) must be
# backfilled when the schema is finally run, or Settings never loads for them.
EARLY=66666666-6666-6666-6666-666666666666
Q -c "alter table auth.users disable trigger on_auth_user_created;
      insert into auth.users (id,email) values ('$EARLY','early@example.com');
      alter table auth.users enable trigger on_auth_user_created;" >/dev/null 2>&1
ck "a pre-schema signup starts with no profile" \
  "$(Q -c "select count(*) from profiles where id='$EARLY';")" "0"
Q -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1
ck "re-running the schema backfills their profile" \
  "$(Q -c "select count(*) from profiles where id='$EARLY';")" "1"
ck "…and their notification preferences" \
  "$(Q -c "select count(*) from notification_prefs where user_id='$EARLY';")" "1"
ck "backfill does not duplicate existing profiles" \
  "$(Q -c "select count(*) from profiles;")" "$(Q -c "select count(*) from auth.users;")"

if [ "$fails" -eq 0 ]; then echo; echo "All schema checks passed."; else echo; echo "$fails schema check(s) FAILED."; fi
exit $([ "$fails" -eq 0 ] && echo 0 || echo 1)
