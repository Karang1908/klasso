// Sanity checks for the pure logic in src/lib. Run: node scripts/check-logic.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "klasso-test-"));
execSync(
  `npx tsc src/lib/schedule.ts src/lib/time.ts src/lib/types.ts src/lib/tasks.ts src/lib/planning.ts ` +
    `--outDir ${out} --module commonjs --target es2022 --moduleResolution node --skipLibCheck`,
  { stdio: "inherit" },
);
writeFileSync(join(out, "package.json"), JSON.stringify({ type: "commonjs" }));

const require = createRequire(import.meta.url);
const { attendanceBySubject, findGaps, resolveDay, dayStatus } = require(join(out, "schedule.js"));
const { parseTime, weekdayOfISO, zonedNow, daysBetweenISO, toTimeString } = require(join(out, "time.js"));
const { inTaskScope, tasksForDay, sortTasks } = require(join(out, "tasks.js"));
const { syllabusTopics, blocksForDay, blockForTopic, examPlans, plannedMinutes, findClashes, blockKind, validatePlan, weekStart } = require(join(out, "planning.js"));

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

// Old caches have no list_kind. Daily identity is independent of due date.
const taskFixture = (id, changes = {}) => ({ id, title: id, done: false, priority: 1, position: 0,
  due_date: null, planned_date: null, ...changes });
const taskCases = [
  taskFixture("legacy", { due_date: "2026-09-08" }),
  taskFixture("permanent", { list_kind: "master" }),
  taskFixture("daily", { list_kind: "daily", planned_date: "2026-09-09" }),
  taskFixture("yesterday", { list_kind: "daily", planned_date: "2026-09-08", due_date: "2026-09-08" }),
  taskFixture("done", { list_kind: "daily", planned_date: "2026-09-09", done: true }),
];
eq("legacy tasks stay in Master", inTaskScope(taskCases[0], { kind: "master" }), true);
eq("Master never expires", inTaskScope(taskCases[1], { kind: "master" }), true);
eq("Daily contains only the selected date", taskCases.filter((t) => inTaskScope(t, { kind: "daily", date: "2026-09-09" })).map((t) => t.id), ["daily", "done"]);
eq("previous Daily lists remain accessible", taskCases.filter((t) => inTaskScope(t, { kind: "daily", date: "2026-09-08" })).map((t) => t.id), ["yesterday"]);
eq("Today combines current Daily and due Master tasks", tasksForDay(taskCases, "2026-09-09").map((t) => t.id), ["legacy", "daily"]);
eq("sorting prioritizes deadlines then importance", sortTasks([
  taskFixture("normal"), taskFixture("high", { priority: 2 }), taskFixture("due", { due_date: "2026-09-10" }),
]).map((t) => t.id), ["due", "high", "normal"]);
eq("clearing a Daily list selects no Master or other dates", taskCases.filter((t) => t.done && inTaskScope(t, { kind: "daily", date: "2026-09-09" })).map((t) => t.id), ["done"]);
eq("reading lists does not delete or mutate tasks", taskCases.length, 5);

// ---------------------------------------------------------------- time
eq("parseTime 09:30:00", parseTime("09:30:00"), 570);
eq("toTimeString 570", toTimeString(570), "09:30");
eq("weekday 2026-09-09 is Wednesday", weekdayOfISO("2026-09-09"), 3);
eq("daysBetween", daysBetweenISO("2026-09-09", "2026-09-16"), 7);

// A fixed instant: 2026-09-09T20:30:00Z == 2026-09-10 00:30 in Asia/Dubai (+4)
const at = new Date("2026-09-09T20:30:00Z");
eq("zonedNow Dubai rolls past midnight", zonedNow("Asia/Dubai", at), {
  dateISO: "2026-09-10",
  minutes: 30,
  weekday: 4,
});
eq("zonedNow UTC same instant", zonedNow("UTC", at), {
  dateISO: "2026-09-09",
  minutes: 20 * 60 + 30,
  weekday: 3,
});

// ------------------------------------------------------------ attendance
const subj = (id, min = 75) => ({
  id, user_id: "u", name: id, short_name: null, color: "#000",
  teacher: null, room: null, min_attendance: min, created_at: "",
});
const rec = (subject_id, status, n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${subject_id}-${status}-${i}`, user_id: "u", subject_id,
    slot_id: null, on_date: "2026-01-01", status, created_at: "",
  }));

const att = attendanceBySubject(
  [
    ...rec("a", "present", 9), ...rec("a", "absent", 1),
    ...rec("b", "present", 6), ...rec("b", "absent", 4),
    ...rec("c", "present", 8), ...rec("c", "absent", 2),
    ...rec("d", "cancelled", 5),
  ],
  [subj("a"), subj("b"), subj("c"), subj("d"), subj("e")],
);
const pick = (id) => {
  const r = att.find((x) => x.subject.id === id);
  return { held: r.held, pct: r.percent === null ? null : Math.round(r.percent * 10) / 10,
           canSkip: r.canSkip, mustAttend: r.mustAttend, ok: r.meetsMinimum };
};
// 9/10 = 90%: 9/12 is exactly 75%, 9/13 is not -> can skip 2 more
eq("attendance 9P/1A @75", pick("a"), { held: 10, pct: 90, canSkip: 2, mustAttend: 0, ok: true });
// 6/10 = 60%: (6+6)/(10+6) = 75% -> must attend 6
eq("attendance 6P/4A @75", pick("b"), { held: 10, pct: 60, canSkip: 0, mustAttend: 6, ok: false });
// 8/10 = 80%: 8/11 = 72.7% -> cannot skip any
eq("attendance 8P/2A @75", pick("c"), { held: 10, pct: 80, canSkip: 0, mustAttend: 0, ok: true });
// cancelled classes are not "held"
eq("attendance all-cancelled", pick("d"), { held: 0, pct: null, canSkip: 0, mustAttend: 0, ok: true });
eq("attendance no records", pick("e"), { held: 0, pct: null, canSkip: 0, mustAttend: 0, ok: true });

// -------------------------------------------------------------- schedule
const subjects = new Map([["s1", subj("s1")], ["s2", subj("s2")]]);
const slot = (id, weekday, start, end, subject_id = "s1") => ({
  id, user_id: "u", subject_id, weekday, start_time: start, end_time: end,
  room: null, kind: "lecture", created_at: "",
});
// 2026-09-09 is a Wednesday (weekday 3)
const slots = [
  slot("x", 3, "09:00:00", "10:00:00"),
  slot("y", 3, "12:00:00", "13:00:00", "s2"),
  slot("z", 4, "09:00:00", "10:00:00"),
];

eq("resolveDay picks only that weekday",
  resolveDay("2026-09-09", slots, [], subjects).map((c) => c.slotId), ["x", "y"]);

const ovCancelSlot = [{ id: "o1", user_id: "u", on_date: "2026-09-09", kind: "cancel_slot",
  slot_id: "x", subject_id: null, start_time: null, end_time: null, room: null, note: null, created_at: "" }];
eq("cancel_slot removes one class",
  resolveDay("2026-09-09", slots, ovCancelSlot, subjects).map((c) => c.slotId), ["y"]);

const ovHoliday = [{ id: "o2", user_id: "u", on_date: "2026-09-09", kind: "cancel_day",
  slot_id: null, subject_id: null, start_time: null, end_time: null, room: null, note: "Eid", created_at: "" }];
eq("cancel_day clears the grid",
  resolveDay("2026-09-09", slots, ovHoliday, subjects).length, 0);

const ovExtra = [...ovHoliday, { id: "o3", user_id: "u", on_date: "2026-09-09", kind: "extra",
  slot_id: null, subject_id: "s2", start_time: "15:00:00", end_time: "16:00:00",
  room: "B12", note: "makeup", created_at: "" }];
eq("extra class survives a cancelled day",
  resolveDay("2026-09-09", slots, ovExtra, subjects).map((c) => [c.isExtra, c.startMin]), [[true, 900]]);

eq("override on another date is ignored",
  resolveDay("2026-09-09", slots,
    [{ ...ovHoliday[0], on_date: "2026-09-10" }], subjects).map((c) => c.slotId), ["x", "y"]);

// ------------------------------------------------- attendance identity keys
// occKey is what attendance rows are keyed on in the database. It must be
// stable across dates and distinct per class, or marks land on the wrong row.
eq("recurring classes get slot: keys",
  resolveDay("2026-09-09", slots, [], subjects).map((c) => c.occKey),
  ["slot:x", "slot:y"]);
eq("the same class keeps its key on another date",
  resolveDay("2026-09-16", slots, [], subjects).map((c) => c.occKey),
  ["slot:x", "slot:y"]);
eq("a one-off class is keyed by its override, not null",
  resolveDay("2026-09-09", slots, ovExtra, subjects).map((c) => c.occKey), ["extra:o3"]);
eq("every class on a day has a distinct key", (() => {
  const keys = resolveDay("2026-09-09", slots, ovExtra.slice(1), subjects).map((c) => c.occKey);
  return keys.length === new Set(keys).size;
})(), true);

// ------------------------------------------------------------------ gaps
const day = resolveDay("2026-09-09", slots, [], subjects);
eq("gap between 10:00 and 12:00", findGaps(day).map((g) => [g.startMin, g.endMin]), [[600, 720]]);
eq("back-to-back classes make no gap",
  findGaps(resolveDay("2026-09-09",
    [slot("p", 3, "09:00:00", "10:00:00"), slot("q", 3, "10:00:00", "11:00:00")], [], subjects)), []);
eq("sub-threshold sliver is not a gap",
  findGaps(resolveDay("2026-09-09",
    [slot("p", 3, "09:00:00", "10:00:00"), slot("q", 3, "10:10:00", "11:00:00")], [], subjects)), []);
eq("overlapping classes cannot fake a gap",
  findGaps(resolveDay("2026-09-09",
    [slot("p", 3, "09:00:00", "13:00:00"), slot("q", 3, "10:00:00", "11:00:00"),
     slot("r", 3, "13:30:00", "14:30:00")], [], subjects)).map((g) => [g.startMin, g.endMin]),
  [[780, 810]]);

// ------------------------------------------------------------- day status
const s1 = dayStatus(day, 9 * 60 + 30); // mid-first-class
eq("dayStatus during a class", [s1.current?.slotId, s1.currentRemaining, s1.next?.slotId, s1.untilNext], ["x", 30, "y", 150]);
const s2 = dayStatus(day, 8 * 60);
eq("dayStatus before the day starts", [s2.current, s2.next?.slotId, s2.notStarted, s2.finished], [null, "x", true, false]);
const s3 = dayStatus(day, 14 * 60);
eq("dayStatus after the day ends", [s3.current, s3.next, s3.finished, s3.endsAtMin], [null, null, true, 780]);
eq("dayStatus on an empty day", dayStatus([], 600).finished, false);

// ------------------------------------------------------------- planning
eq("syllabus splits on newlines", syllabusTopics("Kinematics\nNewton's laws"), ["Kinematics", "Newton's laws"]);
eq("syllabus strips list markers and blanks",
  syllabusTopics("- Alpha\n\n2. Beta\n  * Gamma  \n"), ["Alpha", "Beta", "Gamma"]);
eq("syllabus drops duplicate topics", syllabusTopics("Alpha\nalpha\nBeta"), ["Alpha", "Beta"]);
eq("empty syllabus is no topics", [syllabusTopics(null), syllabusTopics(""), syllabusTopics("   ")], [[], [], []]);

const blk = (id, date, start, extra = {}) => ({
  id, user_id: "u", title: id, on_date: date, start_time: start, end_time: null,
  subject_id: null, event_id: null, notes: null, done: false, done_at: null,
  position: 0, created_at: "", ...extra,
});
const blocks = [
  blk("late", "2026-09-09", "18:00:00"),
  blk("none", "2026-09-09", null),
  blk("early", "2026-09-09", "09:00:00"),
  blk("other", "2026-09-10", "08:00:00"),
];
eq("blocks for a day are time-ordered, untimed last",
  blocksForDay(blocks, "2026-09-09").map((b) => b.id), ["early", "late", "none"]);
eq("blocks on another day are excluded",
  blocksForDay(blocks, "2026-09-10").map((b) => b.id), ["other"]);

const topicBlocks = [
  blk("t1", "2026-09-09", null, { title: "Karnaugh maps", event_id: "e1" }),
  blk("t2", "2026-09-09", null, { title: "Logic gates", event_id: "e1", done: true }),
  blk("t3", "2026-09-09", null, { title: "Karnaugh maps", event_id: "e2" }),
];
eq("a topic matches its own exam's block",
  blockForTopic(topicBlocks, "e1", "Karnaugh maps")?.id, "t1");
eq("topic matching ignores case and padding",
  blockForTopic(topicBlocks, "e1", "  karnaugh MAPS ")?.id, "t1");
eq("an unscheduled topic has no block",
  blockForTopic(topicBlocks, "e1", "Counters"), undefined);

const ev = (id, kind, syllabus, date) => ({
  id, user_id: "u", title: id, kind, subject_id: null, on_date: date,
  start_time: null, end_time: null, location: null, notes: null, syllabus, created_at: "",
});
const plans = examPlans([
  ev("e1", "exam", "Karnaugh maps\nLogic gates\nCounters", "2026-09-20"),
  ev("e2", "assignment", "Karnaugh maps", "2026-09-12"),
  ev("e3", "exam", null, "2026-09-15"),
  ev("e4", "event", "Ignored", "2026-09-14"),
], topicBlocks);
eq("only exams and assignments with a syllabus get a plan",
  plans.map((p) => p.event.id), ["e2", "e1"]);
eq("plans are ordered by exam date", plans[0].event.id, "e2");
eq("coverage counts scheduled topics",
  plans.map((p) => [p.event.id, p.topics.length, p.scheduled, p.done]),
  [["e2", 1, 1, 0], ["e1", 3, 2, 1]]);

// ------------------------------------------- plan totals, kinds and clashes
const tb = (id, start, end, extra = {}) => ({
  id, user_id: "u", title: id, on_date: "2026-09-09", start_time: start, end_time: end,
  subject_id: null, event_id: null, notes: null, done: false, done_at: null,
  position: 0, created_at: "", ...extra,
});
eq("planned minutes add up timed blocks",
  plannedMinutes([tb("a", "09:00:00", "10:00:00"), tb("b", "14:00:00", "15:30:00")]), 150);
eq("untimed blocks add no minutes",
  plannedMinutes([tb("a", null, null), tb("b", "09:00:00", "09:45:00")]), 45);
eq("a block defaults to study when the cache predates kinds", blockKind(tb("a", null, null)), "study");
eq("an explicit kind is respected", blockKind(tb("a", null, null, { kind: "meeting" })), "meeting");

const dayClasses = resolveDay("2026-09-09", slots, [], subjects); // x 09:00-10:00, y 12:00-13:00
eq("a block during a class is flagged",
  [...findClashes([tb("k", "09:30:00", "10:30:00")], dayClasses).values()],
  ["Overlaps s1"]);
eq("a block in a free gap is not flagged",
  findClashes([tb("k", "10:15:00", "11:45:00")], dayClasses).size, 0);
eq("a block ending exactly as class starts is not a clash",
  findClashes([tb("k", "08:00:00", "09:00:00")], dayClasses).size, 0);
eq("two overlapping blocks flag each other",
  findClashes([tb("a", "16:00:00", "17:00:00"), tb("b", "16:30:00", "17:30:00")], dayClasses).size, 2);
eq("untimed blocks never clash",
  findClashes([tb("a", null, null), tb("b", "09:30:00", "09:45:00")], dayClasses).size, 1);

eq("same time on different dates is not a conflict", findClashes([tb("a", "16:00", "17:00"), tb("b", "16:00", "17:00", { on_date: "2026-09-10" })], []).size, 0);
eq("meetings do not complete a study topic", blockForTopic([{ ...topicBlocks[0], kind: "meeting" }], "e1", "Karnaugh maps"), undefined);
eq("planning week is Monday anchored", weekStart("2026-09-09"), "2026-09-07");
eq("Sunday stays in its own planning week", weekStart("2026-09-06"), "2026-08-31");
const validPlan = { title: "Project meeting", on_date: "2026-09-09", start_time: "14:00", end_time: "15:00" };
eq("valid meeting can be saved", validatePlan(validPlan), null);
eq("invalid calendar date is rejected", validatePlan({ ...validPlan, on_date: "2026-02-30" }), "Choose a valid date.");
eq("empty plan date is rejected", validatePlan({ ...validPlan, on_date: "" }), "Choose a valid date.");
eq("backward plan time is rejected", validatePlan({ ...validPlan, end_time: "13:00" }), "End time must be after start time.");
eq("invalid clock time is rejected", validatePlan({ ...validPlan, start_time: "25:30" }), "Enter a valid time.");
eq("end without start is rejected", validatePlan({ ...validPlan, start_time: "" }), "Choose a start time first.");
eq("an untimed activity is valid", validatePlan({ ...validPlan, start_time: "", end_time: "" }), null);
eq("blank titles are rejected", validatePlan({ ...validPlan, title: "   " }), "Give your plan a name.");

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
