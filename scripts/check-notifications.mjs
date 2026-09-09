// Verifies the push planner fires the right thing at the right minute, exactly once.
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "klasso-notif-"));
execSync(
  `npx tsc src/lib/notifications.ts --outDir ${out} --module commonjs --target es2022 ` +
    `--moduleResolution node --skipLibCheck`,
  { stdio: "inherit" },
);
writeFileSync(join(out, "package.json"), JSON.stringify({ type: "commonjs" }));
const require = createRequire(import.meta.url);
const { planNotifications } = require(join(out, "notifications.js"));

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

const TZ = "Asia/Dubai"; // UTC+4, no DST
const subjects = [
  { id: "s1", user_id: "u", name: "Physics", short_name: "PHY", color: "#000",
    teacher: null, room: "B12", min_attendance: 75, created_at: "" },
  { id: "s2", user_id: "u", name: "Maths", short_name: "MAT", color: "#111",
    teacher: null, room: null, min_attendance: 75, created_at: "" },
];
// 2026-09-09 is a Wednesday -> weekday 3
const slots = [
  { id: "slotA", user_id: "u", subject_id: "s1", weekday: 3, start_time: "09:00:00",
    end_time: "10:00:00", room: "B12", kind: "lecture", created_at: "" },
  { id: "slotB", user_id: "u", subject_id: "s2", weekday: 3, start_time: "14:00:00",
    end_time: "15:00:00", room: null, kind: "lecture", created_at: "" },
];
const prefs = {
  user_id: "u", class_enabled: true, class_lead_minutes: [10],
  day_summary_enabled: true, day_summary_time: "07:30:00",
  task_enabled: true, task_lead_minutes: [60], task_allday_time: "09:00:00",
  exam_enabled: true, exam_lead_days: [7, 1], exam_lead_minutes: [60],
  study_enabled: true, study_lead_minutes: 10,
  activity_enabled: true, activity_lead_minutes: 30,
  meeting_enabled: true, meeting_lead_minutes: 15,
  quiet_enabled: false, quiet_start: "23:00:00", quiet_end: "07:00:00",
  updated_at: "",
};
// Dubai local -> UTC is minus 4 hours.
const atDubai = (iso, hh, mm) =>
  new Date(`${iso}T${String(hh - 4).padStart(2, "0")}:${String(mm).padStart(2, "0")}:30Z`);

const plan = (o = {}) =>
  planNotifications({
    now: o.now, timezone: TZ, prefs: { ...prefs, ...(o.prefs || {}) },
    subjects, slots: o.slots ?? slots, overrides: o.overrides ?? [],
    events: o.events ?? [], tasks: o.tasks ?? [], blocks: o.blocks ?? [],
  });
const keys = (r) => r.map((n) => n.dedupeKey).sort();

// ------------------------------------------------------------- class leads
eq("10 min before the 09:00 class fires once",
  plan({ now: atDubai("2026-09-09", 8, 50) }).map((n) => [n.dedupeKey, n.title, n.body]),
  [["class:slotA:2026-09-09:10", "Physics in 10 min", "9:00 am – 10:00 am · B12"]]);
eq("a minute early fires nothing", keys(plan({ now: atDubai("2026-09-09", 8, 49) })), []);
eq("a minute late still fires (catch-up window)",
  keys(plan({ now: atDubai("2026-09-09", 8, 52) })), ["class:slotA:2026-09-09:10"]);
eq("four minutes late is outside the catch-up window",
  keys(plan({ now: atDubai("2026-09-09", 8, 54) })), []);
eq("second class of the day",
  keys(plan({ now: atDubai("2026-09-09", 13, 50) })), ["class:slotB:2026-09-09:10"]);
eq("Thursday has no Wednesday classes",
  keys(plan({ now: atDubai("2026-09-10", 8, 50) })), []);

// multiple configured leads
eq("three configured leads each get their own key",
  keys(plan({ now: atDubai("2026-09-09", 8, 30), prefs: { class_lead_minutes: [30, 10, 0] } })),
  ["class:slotA:2026-09-09:30"]);
eq("lead of 0 fires at start time",
  keys(plan({ now: atDubai("2026-09-09", 9, 0), prefs: { class_lead_minutes: [0] } })),
  ["class:slotA:2026-09-09:0"]);
eq("class reminders off", keys(plan({ now: atDubai("2026-09-09", 8, 50), prefs: { class_enabled: false } })), []);

// a lead long enough to cross back over midnight
eq("a 10-hour lead fires the previous evening",
  keys(plan({ now: atDubai("2026-09-08", 23, 0), prefs: { class_lead_minutes: [600] } })),
  ["class:slotA:2026-09-09:600"]);

// overrides feed through
const cancel = [{ id: "o1", user_id: "u", on_date: "2026-09-09", kind: "cancel_slot",
  slot_id: "slotA", subject_id: null, start_time: null, end_time: null, room: null, note: null, created_at: "" }];
eq("a cancelled class sends no reminder",
  keys(plan({ now: atDubai("2026-09-09", 8, 50), overrides: cancel })), []);
const extra = [{ id: "o2", user_id: "u", on_date: "2026-09-09", kind: "extra",
  slot_id: null, subject_id: "s2", start_time: "16:00:00", end_time: "17:00:00",
  room: "Lab 3", note: null, created_at: "" }];
eq("an extra class does send one",
  keys(plan({ now: atDubai("2026-09-09", 15, 50), overrides: extra })), ["class:o2:2026-09-09:10"]);

// ------------------------------------------------------------- day summary
const summary = plan({ now: atDubai("2026-09-09", 7, 30) });
eq("morning summary counts the day", summary.map((n) => [n.title, n.body]),
  [["Today", "2 classes · Physics at 9:00 am · ends 3:00 pm"]]);
eq("summary on an empty day",
  plan({ now: atDubai("2026-09-10", 7, 30) }).map((n) => n.body), ["No classes today."]);

// ------------------------------------------------------------------ tasks
const timedTask = [{ id: "t1", user_id: "u", title: "Lab report", notes: null, subject_id: "s1",
  due_date: "2026-09-09", due_time: "18:00:00", priority: 1, done: false, done_at: null,
  position: 0, created_at: "" }];
eq("timed task fires 60 min before",
  plan({ now: atDubai("2026-09-09", 17, 0), tasks: timedTask }).map((n) => [n.dedupeKey, n.title, n.body]),
  [["task:t1:2026-09-09:m60", "Due in 60 min: Lab report", "6:00 pm · Physics"]]);
eq("a completed task never fires",
  keys(plan({ now: atDubai("2026-09-09", 17, 0), tasks: [{ ...timedTask[0], done: true }] })), []);
eq("legacy task reminders open the permanent Master list",
  plan({ now: atDubai("2026-09-09", 17, 0), tasks: timedTask }).map((n) => n.url), ["/tasks?list=master"]);
eq("daily task reminders open the task's planned date",
  plan({ now: atDubai("2026-09-09", 17, 0), tasks: [{ ...timedTask[0], list_kind: "daily", planned_date: "2026-09-08" }] }).map((n) => n.url), ["/tasks?list=daily&date=2026-09-08"]);
const allDayTask = [{ ...timedTask[0], id: "t2", due_time: null }];
eq("all-day task fires at the configured hour",
  plan({ now: atDubai("2026-09-09", 9, 0), tasks: allDayTask }).map((n) => n.dedupeKey),
  ["task:t2:2026-09-09:allday"]);
eq("a task with no due date never fires",
  keys(plan({ now: atDubai("2026-09-09", 9, 0), tasks: [{ ...allDayTask[0], due_date: null }] })), []);

// ------------------------------------------------------------------ exams
const exam = [{ id: "e1", user_id: "u", title: "Physics Midterm", kind: "exam", subject_id: "s1",
  on_date: "2026-09-16", start_time: "10:00:00", end_time: "12:00:00", location: "Hall A",
  notes: null, created_at: "" }];
eq("exam 7 days out fires with the morning summary",
  plan({ now: atDubai("2026-09-09", 7, 30), events: exam })
    .filter((n) => n.dedupeKey.startsWith("event")).map((n) => [n.dedupeKey, n.title]),
  [["event:e1:d7", "Exam in 7 days: Physics Midterm"]]);
eq("exam 1 day out",
  plan({ now: atDubai("2026-09-15", 7, 30), events: exam })
    .filter((n) => n.dedupeKey.startsWith("event")).map((n) => n.dedupeKey), ["event:e1:d1"]);
eq("exam 60 min before it starts",
  plan({ now: atDubai("2026-09-16", 9, 0), events: exam }).map((n) => [n.dedupeKey, n.body]),
  [["event:e1:m60", "10:00 am · Hall A · Physics"]]);
eq("holidays never notify",
  keys(plan({ now: atDubai("2026-09-09", 7, 30),
    events: [{ ...exam[0], kind: "holiday", on_date: "2026-09-16" }] }))
    .filter((k) => k.startsWith("event")), []);

// ------------------------------------------------------------ quiet hours
const quietPrefs = { quiet_enabled: true, quiet_start: "23:00:00", quiet_end: "07:00:00" };
eq("quiet hours suppress but still claim",
  plan({ now: atDubai("2026-09-09", 6, 0), prefs: { ...quietPrefs, class_lead_minutes: [180] } })
    .map((n) => [n.dedupeKey, n.suppressed]),
  [["class:slotA:2026-09-09:180", true]]);
eq("outside quiet hours nothing is suppressed",
  plan({ now: atDubai("2026-09-09", 8, 50), prefs: quietPrefs }).map((n) => n.suppressed), [false]);
eq("quiet window wrapping midnight covers 23:30",
  plan({ now: atDubai("2026-09-08", 23, 30), prefs: { ...quietPrefs, class_lead_minutes: [570] } })
    .map((n) => n.suppressed), [true]);

// ------------------------------------------------------- dedupe key stability
const a = plan({ now: atDubai("2026-09-09", 8, 50) })[0].dedupeKey;
const b = plan({ now: atDubai("2026-09-09", 8, 51) })[0].dedupeKey;
eq("same reminder keeps one dedupe key across catch-up ticks", a === b, true);
eq("next week's same class gets a different key",
  plan({ now: atDubai("2026-09-16", 8, 50) })[0].dedupeKey !== a, true);

// ------------------------------------- study / activity / meeting reminders
const blk = (id, kind, start, extra = {}) => ({
  id, user_id: "u", title: `${kind} block`, kind, on_date: "2026-09-09",
  start_time: start, end_time: null, subject_id: null, event_id: null,
  location: null, people: null, notes: null, done: false, done_at: null,
  position: 0, created_at: "", ...extra,
});

eq("a study block fires at its own lead time",
  keys(plan({ now: atDubai("2026-09-09", 16, 50), blocks: [blk("b1", "study", "17:00:00")] })),
  ["block:b1:2026-09-09:m10"]);
eq("a study block does not fire at the activity lead",
  keys(plan({ now: atDubai("2026-09-09", 16, 30), blocks: [blk("b1", "study", "17:00:00")] })), []);
eq("an activity uses the longer activity lead",
  keys(plan({ now: atDubai("2026-09-09", 16, 30), blocks: [blk("b2", "activity", "17:00:00")] })),
  ["block:b2:2026-09-09:m30"]);
eq("a meeting uses the meeting lead",
  keys(plan({ now: atDubai("2026-09-09", 16, 45), blocks: [blk("b3", "meeting", "17:00:00")] })),
  ["block:b3:2026-09-09:m15"]);
eq("a completed block never fires",
  keys(plan({ now: atDubai("2026-09-09", 16, 50), blocks: [blk("b1", "study", "17:00:00", { done: true })] })), []);
eq("an untimed block never fires",
  keys(plan({ now: atDubai("2026-09-09", 16, 50), blocks: [blk("b1", "study", null)] })), []);
eq("turning study reminders off silences the study block",
  keys(plan({ now: atDubai("2026-09-09", 16, 50), prefs: { study_enabled: false },
    blocks: [blk("b1", "study", "17:00:00"), blk("b4", "meeting", "19:00:00")] })), []);
eq("a meeting still fires when study is off",
  keys(plan({ now: atDubai("2026-09-09", 16, 45), prefs: { study_enabled: false },
    blocks: [blk("b3", "meeting", "17:00:00")] })), ["block:b3:2026-09-09:m15"]);
eq("a block with no kind is treated as study",
  keys(plan({ now: atDubai("2026-09-09", 16, 50), blocks: [{ ...blk("b5", "study", "17:00:00"), kind: undefined }] })),
  ["block:b5:2026-09-09:m10"]);
eq("a meeting body carries where and who",
  plan({ now: atDubai("2026-09-09", 16, 45),
    blocks: [blk("b6", "meeting", "17:00:00", { location: "Library room 2", people: "Aditi" })] })[0].body,
  "5:00 pm · Library room 2 · Aditi");

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
