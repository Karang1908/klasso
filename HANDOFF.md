# Klasso — handoff

Context for a coding agent picking this project up cold. Written 2026-09-09.

## Latest interface refinement — 2026-09-09

This section supersedes older visual descriptions and check counts below. Preserve
the user's intervening Klasso rename, Planning/syllabus work and six-item navigation.

- Fixed the shared modal footer (zero desktop safe-area padding), short-viewport
  scrolling, title/close-button clipping and slow exit blocking the next interaction.
- `Dropdown.tsx` uses unique combobox IDs, keyboard navigation, type-ahead, top-layer
  popovers and viewport-aware positioning. `TemporalInput.tsx` replaces OS date/time
  pickers with app-rendered calendars and exact-time entry.
- Planning now displays classes and personal plans chronologically. `PlanEditor.tsx`
  is shared by Planning, Calendar and Timetable. It supports study/activity/meeting,
  optional location/participants, quick durations, clash warnings, validation,
  confirmed delete/discard and drafts retained after save failure.
- Block mutations report success, participate in pending-write cache tracking, and
  keep event/subject cascades consistent in the preview and client store.
- Mobile nav is a stretched glass pill. Keep the standard `backdrop-filter` source
  declaration: adding a manual vendor duplicate caused the CSS compiler to remove
  the working standard declaration. Verify the computed value, not just source.
- Header and loading states share one animated open-fold K logo. Static geometry
  lives in `assets/logo.svg`, maskable variant and notification badge; regenerate
  with `npm run icons` after editing.
- Visual notes: `.impeccable/planning-polish.md`. Confirmation captures:
  `.impeccable/qa/klasso-round-2/`. The Apple design skill is unavailable; official
  Apple HIG and W3C guidance were used as fallback.
- Checks: `npm run check`, `check:ui`, `check:planning`, `check:zoom`, `build`.
  Zoom checks simulate CSS viewport reflow, separate from 200% text enlargement.
  No assertion of live Supabase auth/storage or real phone push verification.

The old `.impeccable/redesign-notes.md` describes the earlier interrupted design
phase; it is historical, not an active implementation plan.

---

## 1. What this is

**Klasso** is a personal college tracker for a single student, built as an
installable PWA (Progressive Web App) for iPhone. One user, one account, their
own data. It is a Next.js 16 app backed by Supabase, intended to deploy on Vercel.

The owner's original ask, verbatim in substance:

> A personal tracker website where I make my own timetable and timeslots; it shows
> the latest update, what the next class is, when college ends. See the whole
> timetable for any day or the whole week. A calendar for exams and events. An
> active to-do list that doesn't erase itself, with checkboxes that strike through
> the task, and a clear button. Good UX. Deploy on Vercel. A custom logo. Install
> it as a web app on my phone.

Then, on being asked, they additionally chose: cloud sync from day one, a fixed
weekly timetable **plus** per-date overrides, attendance tracking, a free-gap
finder, tasks linked to subjects with due dates, and — emphasised — **real push
notifications, configurable for both classes and tasks**, defaulting to 10 minutes
before class. Target device: **iPhone**.

The name "Klasso" and the logo were chosen by the assistant, not the owner. Both
are open to being changed; the owner was told so.

---

## 2. Status at a glance

| | |
|---|---|
| Builds | ✅ `npm run build` exits 0 |
| Type-check / lint | ✅ clean, `--max-warnings 0` |
| Automated checks | ✅ **102 passing**, `npm run check` exits 0 |
| UI checks | ✅ **33 interaction checks** against real Chrome (`npm run check:ui`, needs `npm run dev`) |
| Database schema | ✅ executed against real PostgreSQL, twice |
| **Auth round-trip** | ❌ **never run** — needs a real Supabase project |
| **Data persistence** | ❌ **never run** — same |
| **Push delivery to a phone** | ❌ **never run** — needs the project + the device |
| Deployed | ❌ not yet |

**Read this carefully:** the app has never talked to a live Supabase instance.
Everything below the "verified" line is reasoned or unit-tested, not observed.
The owner said they will verify auth themselves later. Expect the first real run
to surface something.

---

## 3. Features delivered

### Today (`/today`) — the daily driver
- Live "now / next" hero: current class with a progress bar and minutes
  remaining; otherwise the next class with a countdown; otherwise "College is
  over", with the finish time. Ticks every 15s and re-reads the clock on wake.
- A horizontally scrolling fortnight strip (−7…+7 days) that **auto-scrolls to
  today**; dots mark days that have classes. Tapping a day shows that day.
- The day's classes in order, with room, teacher, type badge, and NOW/EXTRA tags.
- One-tap attendance per class: Present / Absent / Off. Tapping the active state
  again clears the mark.
- **Free-time gaps** between classes (≥20 min, so a corridor walk isn't a "gap").
- Tasks due today or overdue, and any calendar events that day.
- **Edit day** sheet: mark the whole day off (holiday), cancel a single class, or
  add a one-off extra class — all as date overrides that never touch the
  recurring grid.

### Timetable (`/timetable`) — the week
- Two views: **By day** (grouped list, empty days hidden) and **Whole week**
  (day-columns with a time axis, classes positioned and coloured, scrolls
  horizontally inside its own container).
- Add / edit / delete a weekly class: subject, day, start, end, room, and type
  (lecture / lab / tutorial / other). Validates that end > start.
- Subject manager: name, colour from a 10-swatch palette, default room, teacher,
  and the **minimum attendance %** that subject requires (default 75).

### Calendar (`/calendar`)
- Month grid with today highlighted and coloured dots per entry type; six-week
  stable 42-cell layout.
- **Upcoming** list with a "3d / tomorrow / today" countdown, colour-coded by urgency.
- Entry types: **exam**, **assignment**, **event**, **holiday**. Each takes a
  title, date, optional start/end time, subject, location and notes.
- Tapping a day shows both its events and its classes.

### Tasks (`/tasks`)
- Add from a single always-present field at the top.
- Checkbox toggles completion with a **strikethrough**, exactly as asked. Tasks
  persist indefinitely — nothing auto-erases.
- Filters: Open / Today / Done, each with a live count.
- Per task: notes, linked subject, due date, due time, priority (low/normal/high).
- Sorted by due date, then priority, then manual order. Overdue shown in red.
- **Clear** is deliberately two-tier: the primary button clears *completed* tasks
  only; "Clear the whole list" sits below it behind a confirmation sheet. The
  owner asked for "a clear button"; this reading was flagged to them and they can
  have it wipe everything instead if preferred.

### Attendance (`/attendance`)
- Overall percentage plus a per-subject breakdown with a progress bar.
- The useful number: **"can skip N more"** while safe, or **"attend N in a row to
  recover"** when below the subject's minimum. Cancelled classes are not counted
  as held.
- **Fill in a past day**: the last fortnight of class days, showing how many of
  each day's classes are marked, with a sheet to backfill.

### Planning (`/planning`) — added 2026-09-09

Two views behind a segmented control:

- **Schedule** — a 7-day strip and the study blocks placed on the selected day.
  A block is "what to do, and when": a title, a date, an optional time window, an
  optional subject, and an optional link to the exam it is revision for.
- **Syllabus** — every exam/assignment that has a syllabus, with a coverage bar
  and each topic listed. Unscheduled topics offer **Schedule** (which prefills a
  block with that exact topic text); scheduled ones show their date and time and
  offer **Edit**. Completed topics are struck through.

Blocks appear in the day's list on **Today**, mixed in with daily tasks and
counted in its "N of M completed" — that is where the owner expects to see them.

### Calendar syllabus — added 2026-09-09

`events.syllabus` is free text, one topic per line, shown only for **exam** and
**assignment** entries. `syllabusTopics()` in `src/lib/planning.ts` splits it,
strips list markers (`-`, `*`, `1.`) and drops blanks and duplicates, so pasting
a course outline straight in works.

Topics are matched back to their blocks by case-insensitive title **and**
`event_id` (`blockForTopic`). Renaming a block's title therefore detaches it from
its syllabus line — intentional, but worth knowing before "tidying" titles.

### Settings (`/settings`)
- **Push notifications toggle** for the current device, with iOS install
  detection and a "send a test notification" button.
- **Class reminders**: pick any combination of 0 / 5 / 10 / 15 / 20 / 30 / 45 /
  60 minutes before. Multiple selections send multiple notifications.
- **Task reminders**: lead times for tasks that have a due time, plus a
  configurable time-of-day for tasks that only have a date.
- **Exam reminders**: lead *days* (1–30) delivered with the morning summary, plus
  lead *minutes* before the exam starts.
- **Morning rundown** at a configurable time: class count, first class, finish
  time, exams, tasks due.
- **Quiet hours** (wraps past midnight). Anything due inside the window is
  skipped, not queued.
- Time zone (defaults to `Asia/Dubai`), and sign out.

### Cross-cutting
- Email + password auth; session in `localStorage` so an installed PWA stays
  signed in across relaunches.
- Dark mode, following the system, with a full token palette.
- Mobile-first, iPhone safe-area insets, 16px minimum input font (stops iOS
  zooming on focus), thumb-sized tap targets.
- **Offline tolerance**: the last successful sync is cached and re-rendered
  behind an "Offline — showing your last synced data" banner.
- Custom logo (a day's schedule inside a time ring) generated at every icon size
  including iOS touch icon and Android maskable.

---

## 4. Architecture, and why

### The constraint that shaped everything

The owner wanted "10 minutes before class". Two findings, both verified against
current documentation on 2026-09-09:

1. **Vercel's Hobby plan caps cron at one run per day.** Anything more frequent
   is rejected at deploy time. It cannot express this requirement.
2. **Supabase's free plan ships `pg_cron` and permits `* * * * *`.**

So the scheduler lives in Postgres. `pg_cron` fires every minute and `pg_net`
POSTs to `/api/cron/dispatch` on Vercel with a shared secret. That route works
out what is due, claims it, and sends the push.

Side effect worth knowing: the per-minute traffic is database activity, which
also prevents a free Supabase project being auto-paused after 7 idle days.

A per-minute job is ~43k calls/month against a 500k free-tier budget.

### iOS reality

**Web push on iPhone only works from a PWA installed to the Home Screen** (iOS
16.4+, and not in the EU). In an ordinary Safari tab there is no push at all and
the permission prompt will never appear. `src/lib/push-client.ts` detects this
(`display-mode: standalone` **or** `navigator.standalone`, plus an iPadOS check
because iPadOS 13+ reports itself as a Mac) and tells the user to install rather
than failing silently.

### Exactly-once delivery

Every notification is assigned a `dedupe_key`. The dispatcher **claims the key**
in `notification_log` (unique index) *before* sending, so overlapping cron ticks
cannot double-send. It also looks **3 minutes back**, so a late or skipped tick
still delivers instead of dropping the reminder permanently.

### Service worker scope — deliberate

`public/sw.js` handles **push and notification clicks only**. It does not
intercept `fetch` and does not cache pages. Rationale: a cached app shell would
show a *stale timetable*, which is worse than showing none. Offline tolerance is
handled in the data layer instead, which knows how old its data is. **Do not add
fetch caching without reconsidering this.**

### Client-heavy by design

Data loading and mutation happen in the browser via `supabase-js` with RLS, not
in server components. This keeps the app clear of Next 16's server-side caching
churn. The only server routes are the two that need a service-role key or a
secret.

---

## 5. Data model

Twelve tables, all in `supabase/schema.sql`, all with row-level security scoped
to `auth.uid()`:

| Table | Purpose |
|---|---|
| `profiles` | display name, **timezone** (reminders are timed against this) |
| `subjects` | name, colour, teacher, default room, `min_attendance` |
| `timetable_slots` | the recurring weekly grid; `weekday` 0=Sunday (matches JS `getDay()`) |
| `schedule_overrides` | per-date exceptions: `cancel_day`, `cancel_slot`, `extra` |
| `events` | exam / assignment / event / holiday |
| `tasks` | title, notes, subject, due date+time, priority, done |
| `attendance` | present / absent / cancelled, keyed by `occurrence_key` |
| `push_subscriptions` | one row per device endpoint |
| `notification_prefs` | every toggle and lead-time array |
| `notification_log` | the exactly-once ledger (`dedupe_key` unique) |
| `study_blocks` | the plan: what to do, when, optionally tied to an exam |
| `cron_heartbeat` | touched each minute; also the anti-pause keep-alive |

A trigger on `auth.users` auto-creates `profiles` + `notification_prefs` for every
new signup. `schema.sql` is idempotent — safe to re-run, and verified as such.

### `occurrence_key` — do not "simplify" this away

`attendance` is keyed by `occurrence_key` (`slot:<uuid>` for a recurring class,
`extra:<overrideId>` for a one-off), **not** by a nullable `slot_id`. This is
load-bearing:

- `ON CONFLICT` **cannot infer a partial unique index**, and PostgREST cannot send
  the index predicate. An earlier partial index (`where slot_id is not null`) made
  *every* attendance upsert fail with
  `there is no unique or exclusion constraint matching the ON CONFLICT specification`.
- SQL NULLs compare **distinct**, so a nullable key could never de-duplicate
  one-off classes.

The single source of truth for it is `resolveDay()` in `src/lib/schedule.ts`.

---

## 6. File map

```
src/lib/
  schedule.ts        resolveDay() — THE place date overrides are applied.
                     Also dayStatus() (now/next), findGaps(), attendanceBySubject().
                     Every view and the push dispatcher go through this, so
                     overrides can never be applied inconsistently.
  notifications.ts   planNotifications() — pure "what is due right now".
                     No I/O, therefore directly testable. 27 checks cover it.
  time.ts            minute/time-string maths, ISO date helpers, and zonedNow(tz)
                     — the one piece the server needs, since Vercel runs in UTC
                     but must decide "is it 07:30 where the user actually is?"
  store.tsx          React context: auth, all data, optimistic mutations with
                     rollback, and the offline localStorage cache.
  push-client.ts     permission, subscribe/unsubscribe, iOS install detection.
  push-server.ts     web-push wrapper; classifies 404/410 as "subscription gone".
  types.ts           every row type + ClassOccurrence/Gap.
  useNow.ts          ticking clock hook.
  supabase/client.ts browser client (anon key, localStorage session)
  supabase/admin.ts  service-role client — SERVER ONLY, never import in a component

src/app/
  (app)/layout.tsx   auth gate + bottom tab bar
  (app)/today|timetable|calendar|tasks|attendance|settings/page.tsx
  login/page.tsx
  api/cron/dispatch/route.ts   called every minute; x-cron-secret
  api/push/test/route.ts       "send a test"; Bearer access token
  manifest.ts        PWA manifest
  preview/page.tsx   mock-data harness for every screen; 404s in production

src/components/ui.tsx, ClassRow.tsx
public/sw.js, public/icons/*
assets/logo.svg (source; logo-alt-check.svg is an alternate mark)
supabase/schema.sql, supabase/cron.sql
scripts/*   see below
```

~5,600 lines across `src`, `supabase` and `scripts`.

---

## 7. Environment variables

Seven. `.env.example` is the template; `.env.local` holds the working values and
is gitignored.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**, bypasses RLS |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | already generated, in `.env.local` |
| `VAPID_PRIVATE_KEY` | already generated, in `.env.local` |
| `VAPID_SUBJECT` | `mailto:` address |
| `CRON_SECRET` | shared with the scheduler; already generated |

A VAPID keypair and cron secret **already exist** in `.env.local`. Reuse them in
Vercel — regenerating VAPID keys invalidates every existing device subscription.
The three Supabase values are still placeholders and must be filled in.

---

## 8. Commands

```bash
npm run dev            # http://localhost:3000
npm run build
npm run check          # types + lint + logic + notifications + schema  (69 checks)

npm run check:logic          # 28 — schedule resolution, overrides, attendance maths
npm run check:notifications  # 27 — what fires, when, exactly once
npm run check:schema         # 14 — runs schema.sql on a throwaway Postgres
npm run check:ui             #  9 — real Chrome, needs `npm run dev` running
npm run icons                # regenerate all PNG sizes from assets/logo.svg
node scripts/shoot.mjs /tmp/shots   # screenshots, light + dark, needs dev running
```

`check-schema.sh` spins up a temporary PostgreSQL cluster, stubs the Supabase
`auth` schema, applies `schema.sql` **twice** to prove it re-runs, and asserts the
exact statements the app sends. It **skips with exit 0** if Postgres isn't
installed (`brew install postgresql@16`). It exists because the `ON CONFLICT` bug
above was invisible to types, lint and the UI tests.

`scripts/verify-ui.mjs` and `shoot.mjs` drive Chrome via `puppeteer-core` against
`/preview`, at iPhone viewport, in both colour schemes, and assert no console
errors and no horizontal overflow.

---

## 9. What is left to do

**Setup (owner's account required — an agent cannot do these):**

1. Create a Supabase project; run `supabase/schema.sql` in its SQL editor.
2. Optionally turn off *Confirm email* under Authentication → Sign In / Providers.
3. Put the three Supabase values in `.env.local`.
4. `vercel --prod`, then add **all seven** env vars in Vercel settings and redeploy.
   Vercel does not read `.env.local`.
5. Run `supabase/cron.sql` in the SQL editor, replacing the deployed URL and the
   cron secret. Verify with `select * from cron.job_run_details order by start_time desc;`
6. On iPhone: open the Vercel URL **in Safari** → Share → Add to Home Screen →
   open it **from the home screen icon** → Settings → enable notifications →
   "Send a test notification".

`README.md` has this as a fuller step-by-step.

**TODO — Google sign-in: DEFERRED until the custom domain is bought.**

Owner's decision (2026-09-10): the code is shipped and inert; the dashboard
setup below waits for the domain. Doing it against a `*.vercel.app` URL would
mean redoing the Google console redirect URI and the Supabase Site URL a second
time once the domain lands. Nothing in the app breaks meanwhile — the button
simply errors if pressed, and email + password is unaffected.

The login page already calls `signInWithOAuth({ provider: "google" })`. It stays
inert until both consoles are set up. No callback route is needed — the browser
client runs with `detectSessionInUrl`, so it reads the session out of the return
URL itself.

7. **Verify the existing account's email first.** Confirm email is off, so the
   password account is unverified, and Supabase only auto-links an OAuth identity
   to an existing user when the emails match **and are verified**. Skip this and
   Google creates a *second, empty* user. In the SQL editor:
   `update auth.users set email_confirmed_at = now() where email_confirmed_at is null;`
8. **Google Cloud Console** → new project → APIs & Services → OAuth consent
   screen (External, add yourself as a test user) → Credentials → Create OAuth
   client ID → Web application. Authorised redirect URI is Supabase's callback,
   **not** the app's: `https://<project-ref>.supabase.co/auth/v1/callback`.
9. **Supabase** → Authentication → Sign In / Providers → Google → paste the
   client ID and secret, enable.
10. **Supabase** → Authentication → URL Configuration → Site URL is the production
    domain; add `https://<project>-*.vercel.app/**` to Redirect URLs or every
    preview deployment bounces on return.

**Known risk, unverified:** in an installed iOS home-screen PWA the hop to
`accounts.google.com` may be handed to Safari, and Safari's localStorage is a
separate store from the standalone web view — so the return lands signed in *in
Safari* while the PWA still shows the login screen. Believed improved on iOS
17.4+, not tested on a device. Email + password has no cross-origin hop and is
unaffected. Test on the phone before relying on Google there.

**Not built (surfaced to the owner, deliberately not added):**

- **No error boundary.** Any page-level throw white-screens the PWA. Next
  supports `error.tsx` / `global-error.tsx`; roughly 20 lines. This is the most
  worthwhile next addition.
- **No password reset.** A forgotten password can only be fixed from the Supabase
  dashboard.
- **No data export/import.** Cloud sync was chosen instead, but a JSON export
  would be cheap insurance.
- Tasks have a `position` column but no drag-to-reorder UI.
- No bulk timetable entry (e.g. "copy Monday to Wednesday").

---

## 9b. When a scheduled notification does not arrive

Run `supabase/diagnose.sql` in the Supabase SQL editor. It is read-only and
ordered so that the checks which cannot error come first.

The single most useful fact: **a working "Send a test notification" rules out
the VAPID keys, the phone subscription and the service worker.** Those are the
whole delivery half of the chain, so anything still broken is in the scheduler.

Two traps that account for most of these:

1. **`cron.job_run_details` lies.** `net.http_post` is asynchronous, so pg_cron
   records "succeeded" the instant the request is queued — including when the
   app answers `401` or the hostname does not resolve. The real HTTP status is
   in `net._http_response`. Never conclude the job works from job_run_details
   alone.
2. **`profiles.timezone` decides when every push fires, and is invisible.**
   `zonedNow()` is the only timezone-aware function in the codebase and it is
   used in exactly one place — `notifications.ts`, server-side. Everything on
   screen goes through `formatMinutes()`, pure integer→clock maths. So a wrong
   zone shifts every reminder by its offset with no visible symptom whatsoever.
   It is now pinned to the device: `store.tsx` syncs it on load via
   `timezoneToSync()`, and signups send it too (`signup_timezone()`). Settings
   shows it read-only — a dropdown there would be overwritten on next load.
   Note Chrome reports `Asia/Calcutta`, not `Asia/Kolkata`; both are valid IANA
   aliases and Postgres resolves them identically.

## 9c. Scaling: what the dispatcher can carry

Before this pass the ceiling was roughly **40-60 users**, and it failed silently.
Four things caused it, all now fixed:

1. **Sequential pushes.** `await sendPush()` one at a time, while every user's
   summary fires in the same tick. Now batched 20-wide with `Promise.allSettled`:
   50 pushes went 10.0s -> 0.6s, 200 went 40.0s -> 2.0s (measured).
2. **Lost notifications on timeout.** The claim into `notification_log` was
   committed *before* the push, and the unique index on `dedupe_key` then made a
   retry impossible — a timeout mid-loop dropped those reminders permanently and
   silently. `delivered_at` now separates intent from delivery; undelivered
   claims older than 90s are released and retried inside the catch-up window.
3. **URL length.** `.in("user_id", ids)` is a URL filter at ~39 bytes per uuid,
   so one query crossed the 8KB gateway limit at ~205 users. Reads are chunked
   100 users wide; the URL is now a flat 3,975 bytes at any user count.
4. **O(all users) every minute**, including a 400-day events window. Windows are
   now derived from the loaded prefs (`exam_lead_days`, `task_lead_minutes`),
   which is typically 8 days instead of 400.

Also: `maxDuration = 60` (the platform default cut runs off at 10s), the summary
default is jittered across 07:15-07:44 so a cohort no longer lands on one tick,
and `notification_log` — which grows ~1.7 MB per user per year and had no
pruning — is trimmed nightly by the `klasso-prune` pg_cron job.

`scripts/check-scale.mjs` guards 1 and 3; it runs inside `npm run check`.

Expect **500-1,000 users** comfortably now. Past that, the every-minute full scan
has to become a "next due" queue, which is a real rewrite rather than a tune-up.

**Never let `supabase/cron.sql` keep a real secret.** It is a tracked template;
substituting the values in place and committing puts `CRON_SECRET` in git
history. Fill it in, run it, then restore the placeholders.

## 10. Landmines

Things that cost real time here. Read before editing.

1. **Next.js 16 is not the Next.js you may remember.** Its full docs ship inside
   the repo at `node_modules/next/dist/docs/`. Read those rather than relying on
   training data — the PWA, manifest and route-handler guidance there is current.
2. **`create-next-app` and `next dev` overwrite `AGENTS.md` and `CLAUDE.md`** with
   their own, and re-append on every run. `next.config.ts` sets
   `agentRules: false` to stop this. Leave it off unless you want that churn.
3. **`ON CONFLICT` cannot use a partial unique index.** See `occurrence_key` above.
   If you add another upsert, add a matching **non-partial** unique constraint and
   cover it in `check-schema.sh`.
4. **Headless Chrome reports `prefers-reduced-motion: reduce`,** which silently
   skips every entrance animation. The screenshot scripts override it via CDP
   `Emulation.setEmulatedMedia`. Keep that if you add visual tests.
5. **Vercel Hobby cron is daily-only.** Don't "simplify" the scheduler onto
   `vercel.json` crons — it will silently stop working as a reminder system.
6. **Regenerating VAPID keys unsubscribes every device.** Only do it deliberately.
7. **Timezone matters.** The server runs in UTC; reminders are computed against
   `profiles.timezone` via `zonedNow()`. Don't reach for bare `new Date()` in
   `notifications.ts` or the dispatcher.
8. **`.env*` is gitignored** with an explicit `!.env.example` exception. Note that
   `git check-ignore` exits 0 even when the matching pattern is a `!` negation —
   use `git status -uall` to test whether a file is really ignored.
9. The `/preview` harness renders every screen from mock data and **404s in
   production**. Use it for visual work; there's no need for a live database.
10. **Never use a raw `page.click()` in `scripts/verify-ui.mjs`.** Chrome's CDP
    scroll ignores `scroll-padding-bottom` and can park a control underneath the
    docked bottom nav, so the tap lands on a nav tab and the test fails somewhere
    unrelated. Always go through the `click()` helper, which centres first.
11. **A knowledge-base / memory tool was previously wired into this directory.**
    It has been removed and is **no longer in use** — its files, its config and its
    editor hooks are all gone. Do not reinstate it, do not add hooks for it, and
    ignore any reference to it you may find in older notes.

---

## 11. Design direction (changed 2026-09-09)

`PRODUCT.md` still asks for glassmorphism. **That direction was reversed by the
owner** — every `backdrop-filter` panel has been replaced with solid surfaces.
`globals.css` is the single source of the look: `.panel` (was `.glass-panel`) and
`.nav-surface` (was `.glass-nav`) are opaque, the palette steps
`bg → surface → surface-2` are each a visible value change, and borders are
opaque so edges survive over any content. Do not reintroduce translucency.

Page headings are plain nouns ("Tasks", "Calendar"), not slogans. The mobile nav
is docked to the bottom edge, full width, six tabs.

## 12. Conventions

- TypeScript strict; `npm run check` must exit 0 before anything is called done.
- Match the surrounding file's style: comments explain *why*, never *what*.
- Tailwind v4 with CSS custom properties for theming; colours come from tokens
  (`bg-surface`, `text-dim`, `border-line`…), never hard-coded hex, so dark mode
  keeps working.
- Mobile-first. Inputs stay ≥16px or iOS zooms on focus. Tap targets ≥30px, using
  negative margin + padding to keep a small visual box with a large hit area.
- Every date the *user* sees is computed in their local time; every date the
  *server* reasons about goes through `zonedNow(profile.timezone)`.
- No new dependency for something the standard library already does.
