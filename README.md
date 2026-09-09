# Klasso

A personal college tracker: weekly timetable with per-date overrides, an exam and
event calendar, a persistent to-do list, attendance tracking, and push
notifications before every class.

Built as an installable PWA — add it to your iPhone home screen and it behaves
like an app.

## Planning and interface

Planning combines recurring classes with date-specific study sessions, activities
and meetings. Add personal plans from Planning, Calendar or Timetable; edit their
date/time, subject, location and meeting participants. Clash warnings are advisory,
invalid times cannot save, and a failed save keeps the editor and its details open.
Daily tasks belong to a date; previous days are retained. Master tasks never reset.

All dropdowns, including date/time pickers, are drawn by the app and support the
keyboard. Menus render above scrolling sheets. The mobile navigation is a wide
glass pill with spring selection and a moving highlight; reduced motion/transparency
and increased contrast have fallbacks. The animated K mark is shared by branding
and loading screens; its static counterpart is used for installed app icons.

Local interactive preview: <http://localhost:3000/preview?s=planning>. Sample changes
stay in that browser tab. The preview route returns 404 in production.

If your database predates planning, rerun `supabase/schema.sql` before using this
build. Its additive migration preserves existing tasks and plans while adding the
planning fields. Cloud auth, database writes and phone push still need live testing.

Additional checks (start `npm run dev` first):

```bash
npm run check:planning   # planning, custom menus, sheets and validation
npm run check:zoom       # 50–400% zoom-equivalent CSS viewport reflow
npm run check:ui         # cross-app interactions plus 150/200% text scaling
```

---

## Why it is built this way

**Notifications are the constraint that shaped the architecture.**

- Vercel's Hobby plan caps cron at **one run per day**, so it cannot drive
  "10 minutes before class".
- Supabase's free plan ships `pg_cron` and can fire **every minute**.

So the schedule lives in Postgres and calls a Vercel route each minute. That
route decides what is due, claims it in a ledger, and sends the push. The
per-minute call also counts as database activity, which stops a free Supabase
project being paused after 7 idle days.

**On iPhone, web push only works from an installed PWA.** In a normal Safari
tab there is no push at all. Setup step 7 covers this, and the app detects it
and tells you.

---

## Setup

You need a free Supabase account and a free Vercel account.

### 1. Create the database

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region
   near you. Save the database password somewhere.
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql),
   and run it. It creates every table, turns on row-level security so your data
   is private to your account, and sets up new-user defaults. It is safe to
   re-run.

### 2. Turn off email confirmation (optional, but easier)

**Authentication → Sign In / Providers → Email** → turn off **Confirm email**.
For a single-user app this saves a round trip. Leave it on if you prefer, and
just click the link in your inbox after signing up.

### 3. Collect your keys

**Project Settings → API keys** and **→ Data API**:

| Value | Where it goes |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key | `SUPABASE_SERVICE_ROLE_KEY` |

The service-role key bypasses row-level security. It is server-only — never put
it in a `NEXT_PUBLIC_` variable.

### 4. Run it locally

```bash
cp .env.example .env.local     # then fill in the three Supabase values
npm install
npm run dev
```

`.env.local` already contains a VAPID keypair and a cron secret generated for
this project. Reuse the same values in Vercel so existing devices stay
subscribed. To generate fresh ones:

```bash
npx web-push generate-vapid-keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # CRON_SECRET
```

Open <http://localhost:3000>, create your account, and add your subjects and
timetable.

> Push notifications need HTTPS. To test them locally: `npx next dev --experimental-https`.

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel            # link the project
vercel --prod
```

Then in **Vercel → Project → Settings → Environment Variables**, add all seven
values from your `.env.local` and redeploy. Vercel does not read `.env.local`.

### 6. Start the notification scheduler

Back in the Supabase **SQL Editor**, open [`supabase/cron.sql`](supabase/cron.sql),
replace the two placeholders with your deployed URL and your `CRON_SECRET`, and
run it.

Check it is alive:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
```

### 7. Install it on your iPhone

1. Open your Vercel URL in **Safari** (not Chrome — only Safari can install).
2. Tap **Share** → **Add to Home Screen**.
3. Open Klasso **from the home screen icon**, not from Safari.
4. **Settings → Push notifications on this device → on**, then allow when iOS asks.
5. Tap **Send a test notification**. It should arrive within a few seconds.

If the toggle refuses with an install message, you are still in a Safari tab —
go back to step 2.

---

## How the pieces fit

```
src/lib/schedule.ts       resolveDay() — the one place overrides are applied
src/lib/notifications.ts  planNotifications() — pure "what is due right now"
src/lib/store.tsx         auth + all data + optimistic mutations + offline cache
src/lib/push-client.ts    permission, subscribe, iOS install detection
src/app/api/cron/dispatch route pg_cron calls every minute
supabase/schema.sql       tables, RLS, new-user trigger
supabase/cron.sql         the every-minute job
```

**Planning** (`/planning`) turns an exam's syllabus into dated study blocks, which
then show up in that day's task list on Today. Syllabus text lives on the event
(`events.syllabus`, one topic per line); blocks live in `study_blocks`.

Attendance rows are keyed by `occurrence_key` — `slot:<id>` for a recurring
class, `extra:<overrideId>` for a one-off — rather than a nullable `slot_id`.
`ON CONFLICT` cannot infer a *partial* unique index, and SQL NULLs compare
distinct, so a nullable key could neither upsert nor de-duplicate.

Every notification gets a `dedupe_key` with a unique index behind it. The
dispatcher claims the key before sending, so a reminder is delivered exactly
once even if two cron ticks overlap. It also looks 3 minutes back, so a late
cron tick still delivers rather than silently dropping.

### Offline

The service worker handles push only — it deliberately does not cache pages,
because a stale timetable is worse than none. Instead the data layer keeps the
last successful sync in `localStorage` and renders it with an "Offline —
showing your last synced data" banner.

---

## Checks

```bash
npm run check                         # types, lint, logic, notifications, schema

# or individually:
node scripts/check-logic.mjs          # schedule resolution + attendance maths
node scripts/check-notifications.mjs  # what fires, when, and exactly once
./scripts/check-schema.sh             # runs schema.sql on a throwaway Postgres
npm run dev                           # then:
node scripts/verify-ui.mjs            # interaction checks against /preview
node scripts/shoot.mjs /tmp/shots     # screenshots, light + dark
```

`check-schema.sh` spins up a temporary PostgreSQL cluster, applies
`supabase/schema.sql` twice (to prove it is re-runnable), and asserts the exact
statements the app sends. It skips with exit 0 if PostgreSQL is not installed
locally (`brew install postgresql@16`). It exists because a partial unique index
once made **every** attendance mark fail with *"there is no unique or exclusion
constraint matching the ON CONFLICT specification"* — a bug that types, lint and
the UI tests could not see.

`/preview` renders every screen against mock data. It 404s in production.

## Logo

`assets/logo.svg` is the source. `assets/logo-alt-check.svg` is an alternate
mark. After editing either, run `node scripts/build-icons.mjs` to regenerate
every PNG size.
