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
  Subject,
  Task,
  TimetableSlot,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // A generous date window around "now" in every timezone the users live in.
  // Server-local today ±1 day always contains each user's local today.
  const today = localDateISO();
  const from = addDaysISO(today, -2);
  const to = addDaysISO(today, 400);

  const [profiles, prefs, subjects, slots, overrides, events, tasks] = await Promise.all([
    db.from("profiles").select("*").in("id", userIds),
    db.from("notification_prefs").select("*").in("user_id", userIds),
    db.from("subjects").select("*").in("user_id", userIds),
    db.from("timetable_slots").select("*").in("user_id", userIds),
    db.from("schedule_overrides").select("*").in("user_id", userIds)
      .gte("on_date", from).lte("on_date", addDaysISO(today, 2)),
    db.from("events").select("*").in("user_id", userIds).gte("on_date", from).lte("on_date", to),
    db.from("tasks").select("*").in("user_id", userIds).eq("done", false)
      .gte("due_date", from).lte("due_date", to),
  ]);

  for (const [name, res] of Object.entries({ profiles, prefs, subjects, slots, overrides, events, tasks })) {
    if (res.error) throw new Error(`${name}: ${res.error.message}`);
  }

  const groupBy = <T,>(rows: T[] | null, key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) {
      const k = key(r);
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    }
    return m;
  };

  const profileById = new Map((profiles.data as Profile[] ?? []).map((p) => [p.id, p]));
  const prefsByUser = new Map((prefs.data as NotificationPrefs[] ?? []).map((p) => [p.user_id, p]));
  const subjectsByUser = groupBy(subjects.data as Subject[], (r) => r.user_id);
  const slotsByUser = groupBy(slots.data as TimetableSlot[], (r) => r.user_id);
  const overridesByUser = groupBy(overrides.data as ScheduleOverride[], (r) => r.user_id);
  const eventsByUser = groupBy(events.data as CalendarEvent[], (r) => r.user_id);
  const tasksByUser = groupBy(tasks.data as Task[], (r) => r.user_id);

  const now = new Date();
  let plannedCount = 0;
  let sentCount = 0;
  const deadSubscriptionIds: string[] = [];
  const errors: string[] = [];

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
    });
    if (planned.length === 0) continue;
    plannedCount += planned.length;

    // Claim first. The unique index on dedupe_key is what guarantees a
    // reminder is delivered once even if two cron ticks overlap.
    const { data: claimed, error: claimErr } = await db
      .from("notification_log")
      .upsert(
        planned.map((n) => ({
          user_id: userId,
          dedupe_key: `${userId}:${n.dedupeKey}`,
          title: n.title,
          body: n.suppressed ? `[quiet hours] ${n.body}` : n.body,
        })),
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      )
      .select("dedupe_key");

    if (claimErr) {
      errors.push(`claim ${userId}: ${claimErr.message}`);
      continue;
    }

    const won = new Set((claimed ?? []).map((r) => r.dedupe_key as string));
    const toSend = planned.filter(
      (n: PlannedNotification) => !n.suppressed && won.has(`${userId}:${n.dedupeKey}`),
    );
    if (toSend.length === 0) continue;

    const targets = subsByUser.get(userId) ?? [];
    for (const notification of toSend) {
      for (const sub of targets) {
        const result = await sendPush(sub, {
          title: notification.title,
          body: notification.body,
          url: notification.url,
          tag: notification.tag,
        });
        if (result.ok) sentCount++;
        else if (result.gone) deadSubscriptionIds.push(sub.id);
        else errors.push(`push ${sub.id}: ${result.status ?? "?"} ${result.error}`);
      }
    }
  }

  if (deadSubscriptionIds.length) {
    await db.from("push_subscriptions").delete().in("id", [...new Set(deadSubscriptionIds)]);
  }

  return {
    ok: true as const,
    users: userIds.length,
    planned: plannedCount,
    sent: sentCount,
    pruned: new Set(deadSubscriptionIds).size,
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
