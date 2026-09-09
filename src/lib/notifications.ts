import { resolveDay } from "./schedule";
import type {
  CalendarEvent,
  NotificationPrefs,
  ScheduleOverride,
  Subject,
  Task,
  TimetableSlot,
} from "./types";
import {
  addDaysISO,
  daysBetweenISO,
  formatMinutes,
  parseTime,
  zonedNow,
} from "./time";

const EPOCH = "1970-01-01";

/**
 * A single comparable number for a local wall-clock instant, so a reminder that
 * lands on the previous day (a long lead time before a 9am class) still sorts
 * and compares correctly against "now".
 */
function stamp(dateISO: string, minutes: number): number {
  return daysBetweenISO(EPOCH, dateISO) * 1440 + minutes;
}

export type PlannedNotification = {
  /** Unique per user; the DB's unique index on it is what makes delivery exactly-once. */
  dedupeKey: string;
  title: string;
  body: string;
  /** Deep link opened when the notification is tapped. */
  url: string;
  /** Collapse key — a newer notification with the same tag replaces the old one. */
  tag: string;
  /** Claimed in the ledger but not delivered, because of quiet hours. */
  suppressed: boolean;
};

export type PlanInput = {
  now: Date;
  timezone: string;
  prefs: NotificationPrefs;
  subjects: Subject[];
  slots: TimetableSlot[];
  overrides: ScheduleOverride[];
  events: CalendarEvent[];
  tasks: Task[];
  /**
   * How far back to look for reminders whose minute we may have missed. The
   * dispatcher runs every minute, but a late or skipped cron tick would
   * otherwise drop a notification permanently.
   */
  catchUpMinutes?: number;
};

function inQuietHours(prefs: NotificationPrefs, minutes: number): boolean {
  if (!prefs.quiet_enabled) return false;
  const start = parseTime(prefs.quiet_start);
  const end = parseTime(prefs.quiet_end);
  // A window like 23:00 -> 07:00 wraps past midnight.
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function subjectLabel(s: Subject | null | undefined, fallback = "Class"): string {
  return s?.name ?? fallback;
}

/**
 * Pure: given the world and an instant, return every notification that became
 * due in the catch-up window ending now. No I/O, so it is directly testable.
 */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, timezone, prefs, subjects, slots, overrides, events, tasks } = input;
  const catchUp = input.catchUpMinutes ?? 3;

  const local = zonedNow(timezone, now);
  const nowStamp = stamp(local.dateISO, local.minutes);
  const quiet = inQuietHours(prefs, local.minutes);

  // Inclusive of now, exclusive of the far edge: (now - catchUp, now]
  const isDue = (fire: number) => fire <= nowStamp && fire > nowStamp - catchUp;

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const planned: PlannedNotification[] = [];
  const push = (n: Omit<PlannedNotification, "suppressed">) =>
    planned.push({ ...n, suppressed: quiet });

  // ------------------------------------------------------------- classes
  if (prefs.class_enabled && prefs.class_lead_minutes.length > 0) {
    // Yesterday and tomorrow are scanned too, so a lead time that crosses
    // midnight in either direction still resolves to the right class.
    for (const offset of [-1, 0, 1]) {
      const dateISO = addDaysISO(local.dateISO, offset);
      const classes = resolveDay(dateISO, slots, overrides, subjectsById);

      for (const c of classes) {
        for (const lead of prefs.class_lead_minutes) {
          if (!isDue(stamp(dateISO, c.startMin) - lead)) continue;

          const name = subjectLabel(c.subject);
          const where = c.room ?? c.subject?.room ?? null;
          const when = `${formatMinutes(c.startMin)} – ${formatMinutes(c.endMin)}`;
          push({
            dedupeKey: `class:${c.slotId ?? c.overrideId}:${dateISO}:${lead}`,
            title: lead === 0 ? `${name} starting now` : `${name} in ${lead} min`,
            body: [when, where].filter(Boolean).join(" · "),
            url: "/today",
            tag: `class-${c.key}`,
          });
        }
      }
    }
  }

  // --------------------------------------------------------- day summary
  if (prefs.day_summary_enabled && isDue(stamp(local.dateISO, parseTime(prefs.day_summary_time)))) {
    const classes = resolveDay(local.dateISO, slots, overrides, subjectsById);
    const dueToday = tasks.filter((t) => !t.done && t.due_date === local.dateISO).length;
    const examsToday = events.filter(
      (e) => e.on_date === local.dateISO && (e.kind === "exam" || e.kind === "assignment"),
    );

    let body: string;
    if (classes.length === 0) {
      body = "No classes today.";
    } else {
      const first = classes[0];
      const endsAt = Math.max(...classes.map((c) => c.endMin));
      body =
        `${classes.length} ${classes.length === 1 ? "class" : "classes"} · ` +
        `${subjectLabel(first.subject)} at ${formatMinutes(first.startMin)} · ` +
        `ends ${formatMinutes(endsAt)}`;
    }
    if (examsToday.length) body += ` · ${examsToday.map((e) => e.title).join(", ")}`;
    if (dueToday) body += ` · ${dueToday} task${dueToday === 1 ? "" : "s"} due`;

    push({
      dedupeKey: `daysummary:${local.dateISO}`,
      title: "Today",
      body,
      url: "/today",
      tag: "day-summary",
    });
  }

  // --------------------------------------------------------------- tasks
  if (prefs.task_enabled) {
    for (const t of tasks) {
      if (t.done || !t.due_date) continue;
      const subject = t.subject_id ? subjectsById.get(t.subject_id) : null;
      const suffix = subject ? ` · ${subject.name}` : "";
      const taskUrl = t.list_kind === "daily" && t.planned_date
        ? `/tasks?list=daily&date=${t.planned_date}` : "/tasks?list=master";

      if (t.due_time) {
        for (const lead of prefs.task_lead_minutes) {
          if (!isDue(stamp(t.due_date, parseTime(t.due_time)) - lead)) continue;
          push({
            dedupeKey: `task:${t.id}:${t.due_date}:m${lead}`,
            title: lead === 0 ? `Due now: ${t.title}` : `Due in ${lead} min: ${t.title}`,
            body: `${formatMinutes(parseTime(t.due_time))}${suffix}`,
            url: taskUrl,
            tag: `task-${t.id}`,
          });
        }
      } else if (isDue(stamp(t.due_date, parseTime(prefs.task_allday_time)))) {
        push({
          dedupeKey: `task:${t.id}:${t.due_date}:allday`,
          title: `Due today: ${t.title}`,
          body: `On your list for today${suffix}`,
          url: taskUrl,
          tag: `task-${t.id}`,
        });
      }
    }
  }

  // ------------------------------------------------------- exams & events
  if (prefs.exam_enabled) {
    for (const e of events) {
      if (e.kind === "holiday") continue;
      const subject = e.subject_id ? subjectsById.get(e.subject_id) : null;
      const noun = e.kind === "exam" ? "Exam" : e.kind === "assignment" ? "Assignment" : "Event";

      // N days out, announced with the morning summary.
      for (const days of prefs.exam_lead_days) {
        const fireDate = addDaysISO(e.on_date, -days);
        if (!isDue(stamp(fireDate, parseTime(prefs.day_summary_time)))) continue;
        push({
          dedupeKey: `event:${e.id}:d${days}`,
          title: `${noun} in ${days} day${days === 1 ? "" : "s"}: ${e.title}`,
          body: [
            subject?.name,
            e.start_time ? formatMinutes(parseTime(e.start_time)) : null,
            e.location,
          ]
            .filter(Boolean)
            .join(" · ") || "Tap to see details",
          url: "/calendar",
          tag: `event-${e.id}`,
        });
      }

      // Minutes before it actually starts.
      if (!e.start_time) continue;
      for (const lead of prefs.exam_lead_minutes) {
        if (!isDue(stamp(e.on_date, parseTime(e.start_time)) - lead)) continue;
        push({
          dedupeKey: `event:${e.id}:m${lead}`,
          title: lead === 0 ? `${e.title} starting now` : `${e.title} in ${lead} min`,
          body: [
            formatMinutes(parseTime(e.start_time)),
            e.location,
            subject?.name,
          ]
            .filter(Boolean)
            .join(" · "),
          url: "/calendar",
          tag: `event-${e.id}`,
        });
      }
    }
  }

  return planned;
}
