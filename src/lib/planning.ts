import type { BlockKind, CalendarEvent, ClassOccurrence, StudyBlock } from "./types";
import { parseTime } from "./time";

/**
 * A syllabus is authored as free text, one topic per line. Blank lines and
 * common list markers ("-", "*", "1.") are stripped so pasting straight from a
 * course outline gives sensible topics.
 */
export function syllabusTopics(syllabus: string | null | undefined): string[] {
  if (!syllabus) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of syllabus.split(/\r?\n/)) {
    const topic = raw.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "").trim();
    if (!topic) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue; // the same topic twice would double the count
    seen.add(key);
    out.push(topic);
  }
  return out;
}

/** Blocks on one date, earliest first; untimed blocks sort after timed ones. */
export function blocksForDay(blocks: StudyBlock[] | undefined, date: string): StudyBlock[] {
  return (blocks ?? [])
    .filter((b) => b.on_date === date)
    .sort((a, b) => {
      const at = a.start_time ? parseTime(a.start_time) : Number.MAX_SAFE_INTEGER;
      const bt = b.start_time ? parseTime(b.start_time) : Number.MAX_SAFE_INTEGER;
      return at - bt || a.position - b.position || a.title.localeCompare(b.title);
    });
}

/** The block that schedules a given syllabus topic, if one exists. */
export function blockForTopic(
  blocks: StudyBlock[] | undefined,
  eventId: string,
  topic: string,
): StudyBlock | undefined {
  const key = topic.trim().toLowerCase();
  return (blocks ?? []).find((b) => blockKind(b) === "study" && b.event_id === eventId && b.title.trim().toLowerCase() === key);
}

export type ExamPlan = {
  event: CalendarEvent;
  topics: string[];
  scheduled: number;
  done: number;
  /** 0–1; how much of the syllabus has a slot in the plan. */
  coverage: number;
};

/** Per-exam planning progress, for the syllabus view. */
export function examPlans(events: CalendarEvent[], blocks: StudyBlock[] = []): ExamPlan[] {
  return events
    .filter((e) => (e.kind === "exam" || e.kind === "assignment") && syllabusTopics(e.syllabus).length > 0)
    .map((event) => {
      const topics = syllabusTopics(event.syllabus);
      let scheduled = 0;
      let done = 0;
      for (const topic of topics) {
        const block = blockForTopic(blocks, event.id, topic);
        if (!block) continue;
        scheduled++;
        if (block.done) done++;
      }
      return {
        event,
        topics,
        scheduled,
        done,
        coverage: topics.length === 0 ? 0 : scheduled / topics.length,
      };
    })
    .sort((a, b) => a.event.on_date.localeCompare(b.event.on_date));
}


export const BLOCK_KINDS: { value: BlockKind; label: string; icon: string; tone: string }[] = [
  { value: "study", label: "Study", icon: "book", tone: "bg-brand-soft text-brand" },
  { value: "activity", label: "Activity", icon: "sun", tone: "bg-warn-soft text-warn" },
  { value: "meeting", label: "Meeting", icon: "clock", tone: "bg-success-soft text-success" },
];

export const blockKind = (b: StudyBlock): BlockKind => b.kind ?? "study";

export function validatePlan(plan: { title: string; on_date: string; start_time: string; end_time: string }): string | null {
  if (!plan.title.trim()) return "Give your plan a name.";
  if (plan.title.trim().length > 200) return "Keep the name under 200 characters.";
  const date = new Date(`${plan.on_date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.on_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== plan.on_date) return "Choose a valid date.";
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/;
  if ((plan.start_time && !time.test(plan.start_time)) || (plan.end_time && !time.test(plan.end_time))) return "Enter a valid time.";
  if (plan.end_time && !plan.start_time) return "Choose a start time first.";
  if (plan.start_time && plan.end_time && parseTime(plan.end_time) <= parseTime(plan.start_time)) return "End time must be after start time.";
  return null;
}

export function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}

/** Total minutes a day's timed blocks account for. Untimed blocks contribute nothing. */
export function plannedMinutes(blocks: StudyBlock[]): number {
  return blocks.reduce((total, b) => {
    if (!b.start_time || !b.end_time) return total;
    return total + Math.max(0, parseTime(b.end_time) - parseTime(b.start_time));
  }, 0);
}

/**
 * Blocks whose time window collides with a class or with another block.
 * Planning revision during a lecture you are meant to attend is the single
 * easiest mistake to make here, so it is worth surfacing rather than hiding.
 */
export function findClashes(blocks: StudyBlock[], classes: ClassOccurrence[]): Map<string, string> {
  const clashes = new Map<string, string>();
  const timed = blocks.filter((b) => b.start_time && b.end_time);

  for (const block of timed) {
    const start = parseTime(block.start_time!);
    const end = parseTime(block.end_time!);

    const clashingClass = classes.find((c) => start < c.endMin && end > c.startMin);
    if (clashingClass) {
      clashes.set(block.id, `Overlaps ${clashingClass.subject?.name ?? "a class"}`);
      continue;
    }
    const other = timed.find((b) =>
      b.id !== block.id && b.on_date === block.on_date && start < parseTime(b.end_time!) && end > parseTime(b.start_time!));
    if (other) clashes.set(block.id, `Overlaps “${other.title}”`);
  }
  return clashes;
}
