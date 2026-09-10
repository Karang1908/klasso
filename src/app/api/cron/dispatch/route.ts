import { NextResponse } from "next/server";

import { planNotifications, type PlannedNotification } from "@/lib/notifications";
import { sendPush, vapidReady, type StoredSubscription } from "@/lib/push-server";
import { adminClient } from "@/lib/supabase/admin";
import { addDaysISO, localDateISO } from "@/lib/time";
import type {
  CalendarEvent,
  NotificationPrefs,
  Profile,
  ScheduleOverride,
  StudyBlock,
  Subject,
  Task,
  TimetableSlot,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The 07:30 summary lands for every user in the same tick, so one invocation
// can carry hundreds of pushes. The platform default of 10s cuts that off
// mid-flight; see the claim/deliver protocol below for why that used to lose
// notifications permanently.
export const maxDuration = 60;

/** PostgREST puts `in.(...)` filters in the URL — ~39 bytes per uuid. Past a
 *  few hundred users a single query exceeds common 8KB/16KB gateway limits, so
 *  every by-user read is chunked. */
const USER_CHUNK = 100;
/** Pushes are independent HTTPS calls; sending them one at a time was the
 *  throughput ceiling. Bounded so we never open hundreds of sockets at once. */
const SEND_BATCH = 20;
/** A claim with no delivery this old is treated as abandoned (crash, timeout)
 *  and released, so the next tick can retry inside the catch-up window. */
const ABANDONED_MS = 90_000;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * Fired every minute by Supabase pg_cron (see supabase/cron.sql). Vercel's
 * Hobby plan only allows one cron run per day, which cannot express "10 minutes
 * before class", so the schedule lives in Postgres and calls in here.
 */
async function dispatch() {
  const startedAt = Date.now();
  const db = adminClient();

  // Doubles as the keep-alive that stops a Supabase free project pausing.
  await db.from("cron_heartbeat").update({ beat_at: new Date().toISOString() }).eq("id", 1);

  if (!vapidReady()) {
    return { ok: false as const, error: "VAPID keys not configured", sent: 0 };
  }

  // Release claims from a run that died before it could deliver. Without this
  // the unique index on dedupe_key means those reminders are never retried.
  const { data: released } = await db
    .from("notification_log")
    .delete()
    .is("delivered_at", null)
    .lt("sent_at", new Date(Date.now() - ABANDONED_MS).toISOString())
    .select("dedupe_key");

  // Only users who could actually receive something are worth planning for.
  const { data: subRows, error: subErr } = await db
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  if (subErr) throw new Error(`push_subscriptions: ${subErr.message}`);
  if (!subRows?.length) {
    return { ok: true as const, users: 0, planned: 0, sent: 0, ms: Date.now() - startedAt };
  }

  const subsByUser = new Map<string, StoredSubscription[]>();
  for (const r of subRows as (StoredSubscription & { user_id: string })[]) {
    const list = subsByUser.get(r.user_id) ?? [];
    list.push({ id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
    subsByUser.set(r.user_id, list);
  }
  const userIds = [...subsByUser.keys()];

  // Chunked so the `in.(...)` filter never outgrows the URL.
  type Filtered = ReturnType<ReturnType<typeof db.from>["select"]>;
  const byUser = async <T,>(
    table: string,
    key: string,
    refine?: (q: Filtered) => Filtered,
  ): Promise<T[]> => {
    const pages = await Promise.all(chunk(userIds, USER_CHUNK).map(async (ids) => {
      const base = db.from(table).select("*").in(key, ids) as unknown as Filtered;
      const { data, error } = await (refine ? refine(base) : base);
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as T[];
    }));
    return pages.flat();
  };

  const today = localDateISO();
  const from = addDaysISO(today, -2);

  // Preferences first: they decide how far ahead anything can possibly fire,
  // and every window below was previously a flat 400 days for every user.
  const [profileRows, prefRows] = await Promise.all([
    byUser<Profile>("profiles", "id"),
    byUser<NotificationPrefs>("notification_prefs", "user_id"),
  ]);

  const maxOf = (values: number[], fallback: number) =>
    values.length ? Math.max(...values) : fallback;
  const examLeadDays = maxOf(
    prefRows.flatMap((p) => (p.exam_enabled ? p.exam_lead_days ?? [] : [])),
    0,
  );
  const taskLeadDays = Math.ceil(
    maxOf(prefRows.flatMap((p) => (p.task_enabled ? p.task_lead_minutes ?? [] : [])), 0) / 1440,
  );
  // +1 day of slack absorbs timezone spread between users and the server.
  const eventTo = addDaysISO(today, Math.min(365, examLeadDays) + 1);
  const taskTo = addDaysISO(today, Math.min(365, taskLeadDays) + 1);
  const nearTo = addDaysISO(today, 2);

  const [subjects, slots, overrides, events, tasks, blocks] = await Promise.all([
    byUser<Subject>("subjects", "user_id"),
    byUser<TimetableSlot>("timetable_slots", "user_id"),
    byUser<ScheduleOverride>("schedule_overrides", "user_id",
      (q) => q.gte("on_date", from).lte("on_date", nearTo)),
    byUser<CalendarEvent>("events", "user_id",
      (q) => q.gte("on_date", from).lte("on_date", eventTo)),
    byUser<Task>("tasks", "user_id",
      (q) => q.eq("done", false).gte("due_date", from).lte("due_date", taskTo)),
    byUser<StudyBlock>("study_blocks", "user_id",
      (q) => q.eq("done", false).gte("on_date", from).lte("on_date", nearTo)),
  ]);

  const groupBy = <T,>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = key(r);
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    }
    return m;
  };

  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  const prefsByUser = new Map(prefRows.map((p) => [p.user_id, p]));
  const subjectsByUser = groupBy(subjects, (r) => r.user_id);
  const slotsByUser = groupBy(slots, (r) => r.user_id);
  const overridesByUser = groupBy(overrides, (r) => r.user_id);
  const eventsByUser = groupBy(events, (r) => r.user_id);
  const tasksByUser = groupBy(tasks, (r) => r.user_id);
  const blocksByUser = groupBy(blocks, (r) => r.user_id);

  const now = new Date();
  let plannedCount = 0;
  const errors: string[] = [];
  type Job = { key: string; sub: StoredSubscription; notification: PlannedNotification };
  const jobs: Job[] = [];

  for (const userId of userIds) {
    const userPrefs = prefsByUser.get(userId);
    if (!userPrefs) continue; // no prefs row yet — nothing enabled

    const planned = planNotifications({
      now,
      timezone: profileById.get(userId)?.timezone || "UTC",
      prefs: userPrefs,
      subjects: subjectsByUser.get(userId) ?? [],
      slots: slotsByUser.get(userId) ?? [],
      overrides: overridesByUser.get(userId) ?? [],
      events: eventsByUser.get(userId) ?? [],
      tasks: tasksByUser.get(userId) ?? [],
      blocks: blocksByUser.get(userId) ?? [],
    });
    if (planned.length === 0) continue;
    plannedCount += planned.length;

    // Claim first. The unique index on dedupe_key is what guarantees a
    // reminder is delivered once even if two cron ticks overlap. delivered_at
    // stays null until a push actually lands, so a claim we fail to deliver is
    // released rather than silently swallowed.
    const { data: claimed, error: claimErr } = await db
      .from("notification_log")
      .upsert(
        planned.map((n) => ({
          user_id: userId,
          dedupe_key: `${userId}:${n.dedupeKey}`,
          title: n.title,
          body: n.suppressed ? `[quiet hours] ${n.body}` : n.body,
          delivered_at: n.suppressed ? new Date().toISOString() : null,
        })),
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      )
      .select("dedupe_key");

    if (claimErr) {
      errors.push(`claim ${userId}: ${claimErr.message}`);
      continue;
    }

    const won = new Set((claimed ?? []).map((r) => r.dedupe_key as string));
    const targets = subsByUser.get(userId) ?? [];
    for (const notification of planned) {
      const key = `${userId}:${notification.dedupeKey}`;
      if (notification.suppressed || !won.has(key)) continue;
      for (const sub of targets) jobs.push({ key, sub, notification });
    }
  }

  // Send in bounded parallel batches rather than one at a time.
  const deliveredKeys = new Set<string>();
  const attemptedKeys = new Set<string>();
  const deadSubscriptionIds: string[] = [];
  let sentCount = 0;

  for (const batch of chunk(jobs, SEND_BATCH)) {
    const results = await Promise.allSettled(
      batch.map((job) => sendPush(job.sub, {
        title: job.notification.title,
        body: job.notification.body,
        url: job.notification.url,
        tag: job.notification.tag,
      })),
    );
    results.forEach((settled, i) => {
      const job = batch[i];
      attemptedKeys.add(job.key);
      if (settled.status === "rejected") {
        errors.push(`push ${job.sub.id}: ${String(settled.reason).slice(0, 80)}`);
        return;
      }
      const result = settled.value;
      if (result.ok) { sentCount++; deliveredKeys.add(job.key); }
      else if (result.gone) deadSubscriptionIds.push(job.sub.id);
      else errors.push(`push ${job.sub.id}: ${result.status ?? "?"} ${result.error}`);
    });
  }

  // Confirm what landed; release what did not so the next tick retries it.
  const stamp = new Date().toISOString();
  await Promise.all(chunk([...deliveredKeys], USER_CHUNK).map((keys) =>
    db.from("notification_log").update({ delivered_at: stamp }).in("dedupe_key", keys)));

  const failedKeys = [...attemptedKeys].filter((k) => !deliveredKeys.has(k));
  await Promise.all(chunk(failedKeys, USER_CHUNK).map((keys) =>
    db.from("notification_log").delete().is("delivered_at", null).in("dedupe_key", keys)));

  if (deadSubscriptionIds.length) {
    await db.from("push_subscriptions").delete().in("id", [...new Set(deadSubscriptionIds)]);
  }

  return {
    ok: true as const,
    users: userIds.length,
    planned: plannedCount,
    sent: sentCount,
    released: (released ?? []).length,
    retryable: failedKeys.length,
    pruned: new Set(deadSubscriptionIds).size,
    windows: { events: eventTo, tasks: taskTo },
    errors: errors.slice(0, 10),
    ms: Date.now() - startedAt,
  };
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  // Length-independent compare is unnecessary here; the secret is 256-bit random.
  return header === secret;
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  try {
    return NextResponse.json(await dispatch());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[klasso] dispatch failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET is allowed too so you can trigger a run by hand while debugging.
export const GET = POST;
