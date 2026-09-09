import type {
  Attendance,
  ClassOccurrence,
  Gap,
  ScheduleOverride,
  SlotKind,
  Subject,
  TimetableSlot,
} from "./types";
import { parseTime, weekdayOfISO } from "./time";

/**
 * The single source of truth for "what classes do I actually have on this date".
 * Every view (today, week, attendance, the push dispatcher) goes through here so
 * overrides can never be applied inconsistently in one place and not another.
 *
 * Precedence: cancel_day drops the whole recurring grid, cancel_slot drops one
 * slot, and `extra` classes are always added on top — a one-off class scheduled
 * on a holiday still shows.
 */
export function resolveDay(
  dateISO: string,
  slots: TimetableSlot[],
  overrides: ScheduleOverride[],
  subjectsById: Map<string, Subject>,
): ClassOccurrence[] {
  const weekday = weekdayOfISO(dateISO);
  const today = overrides.filter((o) => o.on_date === dateISO);

  const dayCancelled = today.some((o) => o.kind === "cancel_day");
  const cancelledSlots = new Set(
    today.filter((o) => o.kind === "cancel_slot" && o.slot_id).map((o) => o.slot_id as string),
  );
  const dayNote = today.find((o) => o.kind === "cancel_day")?.note ?? null;

  const out: ClassOccurrence[] = [];

  if (!dayCancelled) {
    for (const slot of slots) {
      if (slot.weekday !== weekday) continue;
      if (cancelledSlots.has(slot.id)) continue;
      out.push({
        key: `${dateISO}:${slot.id}`,
        occKey: `slot:${slot.id}`,
        slotId: slot.id,
        overrideId: null,
        subjectId: slot.subject_id,
        subject: slot.subject_id ? subjectsById.get(slot.subject_id) ?? null : null,
        startMin: parseTime(slot.start_time),
        endMin: parseTime(slot.end_time),
        room: slot.room,
        kind: slot.kind,
        isExtra: false,
        note: null,
      });
    }
  }

  for (const o of today) {
    if (o.kind !== "extra" || !o.start_time || !o.end_time) continue;
    out.push({
      key: `${dateISO}:extra:${o.id}`,
      occKey: `extra:${o.id}`,
      slotId: null,
      overrideId: o.id,
      subjectId: o.subject_id,
      subject: o.subject_id ? subjectsById.get(o.subject_id) ?? null : null,
      startMin: parseTime(o.start_time),
      endMin: parseTime(o.end_time),
      room: o.room,
      kind: "other" as SlotKind,
      isExtra: true,
      note: o.note,
    });
  }

  out.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  if (dayCancelled && out.length === 0 && dayNote) {
    // Nothing to render, but callers want the reason ("Eid holiday").
  }
  return out;
}

export function dayCancelledNote(
  dateISO: string,
  overrides: ScheduleOverride[],
): string | null {
  const o = overrides.find((x) => x.on_date === dateISO && x.kind === "cancel_day");
  return o ? o.note ?? "No classes" : null;
}

/** Where the day stands right now. `nowMin` is minutes since local midnight. */
export type DayStatus = {
  current: ClassOccurrence | null;
  /** Minutes remaining in `current`. */
  currentRemaining: number;
  next: ClassOccurrence | null;
  /** Minutes until `next` starts. */
  untilNext: number;
  /** End of the last class of the day, or null if there are none. */
  endsAtMin: number | null;
  /** Minutes until the last class ends; negative once the day is over. */
  untilEnd: number;
  finished: boolean;
  notStarted: boolean;
};

export function dayStatus(classes: ClassOccurrence[], nowMin: number): DayStatus {
  const current = classes.find((c) => nowMin >= c.startMin && nowMin < c.endMin) ?? null;
  const next = classes.find((c) => c.startMin > nowMin) ?? null;
  const endsAtMin = classes.length ? Math.max(...classes.map((c) => c.endMin)) : null;

  return {
    current,
    currentRemaining: current ? current.endMin - nowMin : 0,
    next,
    untilNext: next ? next.startMin - nowMin : 0,
    endsAtMin,
    untilEnd: endsAtMin === null ? 0 : endsAtMin - nowMin,
    finished: endsAtMin !== null && nowMin >= endsAtMin,
    notStarted: classes.length > 0 && nowMin < classes[0].startMin,
  };
}

/**
 * Free windows between classes. Back-to-back classes and sub-`minGap` slivers
 * are not gaps — a 5 minute corridor walk is not a study window.
 */
export function findGaps(classes: ClassOccurrence[], minGap = 20): Gap[] {
  const gaps: Gap[] = [];
  // Walk a running "latest end so far" so overlapping classes can't fake a gap.
  let cursor = classes.length ? classes[0].endMin : 0;
  let afterSubject = classes.length ? classes[0].subject?.name ?? "class" : null;

  for (let i = 1; i < classes.length; i++) {
    const c = classes[i];
    if (c.startMin - cursor >= minGap) {
      gaps.push({
        startMin: cursor,
        endMin: c.startMin,
        afterSubject,
        beforeSubject: c.subject?.name ?? "class",
      });
    }
    if (c.endMin > cursor) {
      cursor = c.endMin;
      afterSubject = c.subject?.name ?? "class";
    }
  }
  return gaps;
}

export type SubjectAttendance = {
  subject: Subject;
  present: number;
  absent: number;
  /** Classes that were held (present + absent). Cancelled ones don't count. */
  held: number;
  percent: number | null;
  /** How many more you can miss and stay at/above the subject's minimum. */
  canSkip: number;
  /** How many you must attend in a row to climb back to the minimum. */
  mustAttend: number;
  meetsMinimum: boolean;
};

/**
 * Attendance maths against each subject's own minimum.
 *
 *   canSkip     = largest k where present / (held + k) >= min
 *   mustAttend  = smallest k where (present + k) / (held + k) >= min
 */
export function attendanceBySubject(
  records: Attendance[],
  subjects: Subject[],
): SubjectAttendance[] {
  const byId = new Map<string, { present: number; absent: number }>();
  for (const r of records) {
    if (r.status === "cancelled") continue;
    const acc = byId.get(r.subject_id) ?? { present: 0, absent: 0 };
    if (r.status === "present") acc.present++;
    else acc.absent++;
    byId.set(r.subject_id, acc);
  }

  return subjects.map((subject) => {
    const { present, absent } = byId.get(subject.id) ?? { present: 0, absent: 0 };
    const held = present + absent;
    const min = subject.min_attendance / 100;
    const percent = held === 0 ? null : (present / held) * 100;

    // present / (held + k) >= min  ->  k <= present/min - held
    const canSkip =
      min <= 0 ? Infinity : Math.max(0, Math.floor(present / min - held + 1e-9));

    // (present + k) / (held + k) >= min  ->  k >= (min*held - present) / (1 - min)
    let mustAttend = 0;
    if (held > 0 && percent !== null && percent < subject.min_attendance) {
      mustAttend = min >= 1 ? Infinity : Math.ceil((min * held - present) / (1 - min) - 1e-9);
      mustAttend = Math.max(0, mustAttend);
    }

    return {
      subject,
      present,
      absent,
      held,
      percent,
      canSkip: Number.isFinite(canSkip) ? canSkip : 0,
      mustAttend: Number.isFinite(mustAttend) ? mustAttend : 0,
      meetsMinimum: percent === null || percent >= subject.min_attendance,
    };
  });
}

export type Lane<T> = { item: T; lane: number; lanes: number };

/**
 * Lay overlapping intervals into side-by-side lanes, the way a calendar shows
 * two classes booked at the same time. Without this they stack and hide each
 * other.
 *
 * Items are grouped into clusters of transitively-overlapping intervals; every
 * item in a cluster reports the same `lanes` total so their widths match.
 */
export function packLanes<T extends { startMin: number; endMin: number }>(items: T[]): Lane<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out: Lane<T>[] = [];
  let cluster: Lane<T>[] = [];
  let clusterEnd = -Infinity;
  let laneEnds: number[] = [];

  const flush = () => {
    const lanes = laneEnds.length || 1;
    for (const entry of cluster) entry.lanes = lanes;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    // A gap with everything so far ends the cluster, so unrelated blocks are
    // not narrowed by an overlap elsewhere in the day.
    if (item.startMin >= clusterEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.endMin); }
    else laneEnds[lane] = item.endMin;

    cluster.push({ item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return out;
}
