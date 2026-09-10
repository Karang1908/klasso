-- Klasso — why didn't my scheduled notification arrive?
--
-- Paste this whole file into the Supabase SQL editor and run it. Everything is
-- read-only. Work down the results; the first ❌ or ⚠️ is your answer.
--
-- A working "Send a test notification" already proves the VAPID keys, the phone
-- subscription and the service worker are all fine. Every check below is about
-- the *scheduler*, which is the only other link in the chain.
--
-- Blocks A–D never error. Block E reads pg_cron/pg_net tables and will error if
-- those extensions were never installed — which is itself the answer, and is
-- why it is last, so an error there cannot hide the results above it.

-- ═══ A ─ Are the scheduler's own extensions even present? ═══════════════
select
  case when to_regclass('cron.job') is null
       then '❌ pg_cron missing — supabase/cron.sql was never run. That is the problem.'
       else '✅ pg_cron installed' end as pg_cron,
  case when to_regclass('net._http_response') is null
       then '❌ pg_net missing — supabase/cron.sql was never run.'
       else '✅ pg_net installed' end as pg_net;

-- ═══ B ─ Did the dispatcher run and claim anything? ═════════════════════
-- Rows here => the scheduler works and the fault is in push delivery.
-- No rows    => the scheduler never ran, or it planned nothing.
select count(*) as claimed_last_24h, max(sent_at) as most_recent
from notification_log where sent_at > now() - interval '1 day';

select dedupe_key, title, sent_at
from notification_log order by sent_at desc limit 10;

-- ═══ C ─ Which clock are reminders on? ═════════════════════════════════
-- profiles.timezone defaults to Asia/Dubai. If it was never changed, the
-- 07:30 summary fires at 07:30 *Dubai* time — 09:00 in India, for example.
select p.timezone,
       (now() at time zone p.timezone)::time(0) as time_now_in_that_zone,
       (now() at time zone 'utc')::time(0)      as utc_now,
       n.day_summary_enabled,
       n.day_summary_time,
       case when p.timezone = 'Asia/Dubai'
            then '⚠️ still the default — change it in Settings if that is not your timezone'
            else '✅ set' end as timezone_check
from profiles p join notification_prefs n on n.user_id = p.id;

-- ═══ D ─ Is there anything to send, and to send it to? ═════════════════
select (select count(*) from push_subscriptions) as subscriptions,
       (select count(*) from timetable_slots)    as classes,
       (select count(*) from cron_heartbeat
          where beat_at > now() - interval '10 minutes') as heartbeat_last_10_min;
-- subscriptions = 0 => the phone is not subscribed; re-enable it in Settings.
-- heartbeat     = 0 => nothing has reached the dispatch endpoint. See block E.

-- ═══ E ─ The cron job itself (errors here mean block A said ❌) ═════════

-- Is the job installed, and were the two placeholders actually replaced?
select jobname, schedule, active,
       case
         when command like '%YOUR_APP_URL%'     then '❌ YOUR_APP_URL was never replaced'
         when command like '%YOUR_CRON_SECRET%' then '❌ YOUR_CRON_SECRET was never replaced'
         else '✅ placeholders substituted'
       end as placeholders
from cron.job where jobname = 'klasso-dispatch';
-- No rows => the job does not exist. Run supabase/cron.sql.

-- Has it been firing?
select d.status, count(*) as runs, max(d.start_time) as latest
from cron.job_run_details d
join cron.job j using (jobid)
where j.jobname = 'klasso-dispatch' and d.start_time > now() - interval '2 hours'
group by d.status;

-- THE ONE PEOPLE MISS. net.http_post is asynchronous, so the query above
-- reports "succeeded" the moment the request is queued — even when the app
-- replies 401 or the hostname does not resolve. This is the real HTTP result:
--   200 => the dispatch actually ran
--   401 => CRON_SECRET in Vercel does not match the one in cron.sql
--   404 => the URL in cron.sql is wrong
--   no rows => pg_net never reached the app at all
select id, status_code, left(content::text, 300) as response, created
from net._http_response order by created desc limit 10;
