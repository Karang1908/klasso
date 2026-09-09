-- Klasso — per-minute notification dispatcher.
--
-- Run this in the Supabase SQL editor AFTER you have deployed to Vercel,
-- replacing the two placeholders below. Vercel's Hobby plan caps cron at ONE
-- run per day, which cannot drive "10 minutes before class" — so the schedule
-- lives here in Postgres instead, where the free plan allows every minute.
--
--   YOUR_APP_URL   e.g. https://klasso-xyz.vercel.app   (no trailing slash)
--   YOUR_CRON_SECRET  the CRON_SECRET value from your Vercel env vars

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove a previous version of the job before re-creating it.
select cron.unschedule('klasso-dispatch')
where exists (select 1 from cron.job where jobname = 'klasso-dispatch');

-- Older installs used a different job name; drop it so the two cannot both run.
select cron.unschedule('cadence-dispatch')
where exists (select 1 from cron.job where jobname = 'cadence-dispatch');

select cron.schedule(
  'klasso-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'YOUR_APP_URL/api/cron/dispatch',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', 'YOUR_CRON_SECRET'
               ),
    body        := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Verify:            select * from cron.job;
-- Recent run status: select * from cron.job_run_details order by start_time desc limit 20;
-- Stop the job:      select cron.unschedule('klasso-dispatch');
