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
    url     := 'https://getklasso.vercel.app/api/cron/dispatch',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', 'd92bc0a7f9ab59075902f4a52950776eb0d8d645aed04fba8b7f631c1e728277'
               ),
    body        := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ── Guard: fail loudly if the placeholders were not replaced ────────────
-- Without this the job schedules happily and then fails silently every minute,
-- which is indistinguishable from "notifications just don't work".
do $guard$
declare cmd text;
begin
  select command into cmd from cron.job where jobname = 'klasso-dispatch';
  if cmd is null then
    raise exception 'klasso-dispatch was not created. Did cron.schedule() run?';
  end if;
  if cmd like '%' || 'YOUR_APP' || '_URL%' then
    raise exception 'The app URL is still a placeholder. Replace it above and re-run this file.';
  end if;
  if cmd like '%' || 'YOUR_CRON' || '_SECRET%' then
    raise exception 'The cron secret is still a placeholder. Replace it above and re-run this file.';
  end if;
  if cmd like '%//api/cron/dispatch%' then
    raise exception 'Your app URL has a trailing slash. Remove it and re-run this file.';
  end if;
  raise notice 'klasso-dispatch scheduled. Firing one now so you do not have to wait.';
end
$guard$;

-- Fire once immediately, so the result lands in net._http_response within
-- seconds instead of on the next minute boundary.
select net.http_post(
  url     := 'YOUR_APP_URL/api/cron/dispatch',
  headers := jsonb_build_object(
               'Content-Type',  'application/json',
               'x-cron-secret', 'YOUR_CRON_SECRET'
             ),
  body        := '{}'::jsonb,
  timeout_milliseconds := 20000
);

-- Now wait ~5 seconds and run THIS. It is the only check that tells the truth:
-- cron.job_run_details reports "succeeded" as soon as the request is queued,
-- even when the app answers 401 or the host does not resolve.
--
--   200 => working. You are done.
--   401 => CRON_SECRET in Vercel does not match the one you pasted above.
--   404 => the app URL is wrong.
--   no rows => pg_net could not reach the app at all.
--
-- select id, status_code, left(content::text, 300) as response, created
-- from net._http_response order by created desc limit 5;

-- Other useful queries:
-- Verify:            select * from cron.job;
-- Recent run status: select * from cron.job_run_details order by start_time desc limit 20;
-- Stop the job:      select cron.unschedule('klasso-dispatch');
