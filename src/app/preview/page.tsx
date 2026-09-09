"use client";
/* Visual harness — renders every screen against mock data so layout and dark
   mode can be checked without a Supabase project. Used by scripts/shoot.mjs and
   scripts/verify-ui.mjs. Returns 404 in production; it exists for development. */

import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell, PreviewContext } from "@/components/AppShell";
import { inTaskScope } from "@/lib/tasks";

import AttendancePage from "../(app)/attendance/page";
import CalendarPage from "../(app)/calendar/page";
import SettingsPage from "../(app)/settings/page";
import TasksPage from "../(app)/tasks/page";
import PlanningPage from "../(app)/planning/page";
import { LaunchScreen } from "@/components/LaunchScreen";
import TimetablePage from "../(app)/timetable/page";
import TodayPage from "../(app)/today/page";
import { AppContext, type AppContextValue } from "@/lib/store";
import { localDateISO, toTimeString, addDaysISO } from "@/lib/time";
import type { Subject, TimetableSlot } from "@/lib/types";

const now = new Date();
const nowMin = now.getHours() * 60 + now.getMinutes();
const today = localDateISO(now);
const weekday = now.getDay();

const subjects: Subject[] = [
  ["Data Structures", "DSA", "#497563", "Dr. Rao", "LT-3"],
  ["Digital Electronics", "DE", "#527d91", "Prof. Iyer", "B-12"],
  ["Discrete Maths", "DM", "#8a8a4c", "Dr. Menon", "LT-1"],
  ["Physics Lab", "LAB", "#b38a42", "Ms. Fernandes", "Lab 4"],
].map(([name, short, color, teacher, room], i) => ({
  id: `s${i}`, user_id: "u", name, short_name: short, color, teacher, room,
  min_attendance: 75, created_at: "",
}));

// Anchor the day around the real clock so the "now / next" hero has something
// to show whenever the screenshot is taken.
const base = Math.max(0, Math.min(1054, nowMin - 95));
const mk = (i: number, day: number, offset: number, len: number, subj: number): TimetableSlot => ({
  id: `slot${i}`, user_id: "u", subject_id: subjects[subj].id, weekday: day,
  start_time: toTimeString(base + offset), end_time: toTimeString(base + offset + len),
  room: subjects[subj].room, kind: subj === 3 ? "lab" : "lecture", created_at: "",
});

const slots: TimetableSlot[] = [
  mk(0, weekday, 0, 55, 0),
  mk(1, weekday, 60, 55, 1),
  mk(2, weekday, 210, 55, 2),
  mk(3, weekday, 275, 110, 3),
  mk(4, (weekday + 1) % 7, 0, 55, 2),
  mk(5, (weekday + 1) % 7, 120, 55, 0),
  mk(6, (weekday + 2) % 7, 30, 55, 1),
  mk(7, (weekday + 2) % 7, 95, 110, 3),
  mk(8, (weekday + 3) % 7, 0, 55, 0),
];

/** Mock attendance rows, keyed the way resolveDay keys real occurrences. */
const att = (p: string, subject: string, slot: string, status: string, n: number, from: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${p}${i}`, user_id: "u", subject_id: subject, slot_id: slot,
    occurrence_key: `slot:${slot}`, on_date: addDaysISO(today, -i - from),
    status, created_at: "",
  }));

const value = {
  session: { user: { id: "u" } },
  userId: "u",
  ready: true,
  loading: false,
  stale: false,
  error: null,
  subjectsById: new Map(subjects.map((s) => [s.id, s])),
  data: {
    subjects,
    slots,
    overrides: [],
    events: [
      { id: "e1", user_id: "u", title: "Digital Electronics Midterm", kind: "exam",
        subject_id: "s1", on_date: addDaysISO(today, 4), start_time: "10:00:00",
        end_time: "12:00:00", location: "Exam Hall B", notes: null, created_at: "",
        syllabus: "Logic gates and Boolean algebra\nKarnaugh maps\nCombinational circuits\nFlip-flops and latches\nCounters and registers" },
      { id: "e2", user_id: "u", title: "DSA Assignment 3", kind: "assignment",
        subject_id: "s0", on_date: addDaysISO(today, 1), start_time: null,
        end_time: null, location: null, notes: null, created_at: "",
        syllabus: "Balanced BSTs\nGraph traversal\nShortest paths" },
      { id: "e3", user_id: "u", title: "Founders Day", kind: "holiday", subject_id: null,
        on_date: addDaysISO(today, 9), start_time: null, end_time: null,
        location: null, notes: null, created_at: "" },
    ],
    tasks: [
      { id: "daily1", user_id: "u", title: "Review notes before the electronics lab", notes: null,
        list_kind: "daily", planned_date: today, subject_id: "s1", due_date: today, due_time: null,
        priority: 1, done: false, done_at: null, position: 0, created_at: "" },
      { id: "daily2", user_id: "u", title: "Work through the practice problems", notes: null,
        list_kind: "daily", planned_date: today, subject_id: "s2", due_date: today, due_time: null,
        priority: 2, done: false, done_at: null, position: 1, created_at: "" },
      { id: "daily3", user_id: "u", title: "Read chapter 6 for Data Structures", notes: null,
        list_kind: "daily", planned_date: today, subject_id: "s0", due_date: today, due_time: null,
        priority: 0, done: true, done_at: "", position: 2, created_at: "" },
      { id: "t1", user_id: "u", title: "Finish linked-list assignment", notes: "Sections 3 and 4",
        subject_id: "s0", due_date: today, due_time: "18:00:00", priority: 2, done: false,
        done_at: null, position: 0, created_at: "" },
      { id: "t2", user_id: "u", title: "Read chapter 7 before the lab", notes: null,
        subject_id: "s3", due_date: addDaysISO(today, 1), due_time: null, priority: 1,
        done: false, done_at: null, position: 1, created_at: "" },
      { id: "t3", user_id: "u", title: "Submit fee receipt", notes: null, subject_id: null,
        due_date: addDaysISO(today, -1), due_time: null, priority: 1, done: false,
        done_at: null, position: 2, created_at: "" },
      { id: "t4", user_id: "u", title: "Email Dr. Rao about the lab slot", notes: null,
        subject_id: null, due_date: null, due_time: null, priority: 0, done: true,
        done_at: "", position: 3, created_at: "" },
    ],
    blocks: [
      { id: "pb1", user_id: "u", title: "Karnaugh maps", on_date: today,
        start_time: "17:00:00", end_time: "18:00:00", subject_id: "s1", event_id: "e1",
        notes: null, done: false, done_at: null, position: 0, created_at: "" },
      { id: "pb2", user_id: "u", title: "Logic gates and Boolean algebra", on_date: today,
        start_time: "19:30:00", end_time: "20:30:00", subject_id: "s1", event_id: "e1",
        notes: null, done: true, done_at: "", position: 1, created_at: "" },
      { id: "pb3", user_id: "u", title: "Balanced BSTs", on_date: addDaysISO(today, 1),
        start_time: "16:00:00", end_time: "17:30:00", subject_id: "s0", event_id: "e2",
        notes: null, done: false, done_at: null, position: 2, created_at: "" },
      { id: "pb4", user_id: "u", title: "Rewrite lab notes", on_date: addDaysISO(today, 2),
        start_time: null, end_time: null, subject_id: "s3", event_id: null,
        notes: null, done: false, done_at: null, position: 3, created_at: "" },
      { id: "pb5", user_id: "u", title: "Project group sync", kind: "meeting", on_date: today,
        start_time: "16:00:00", end_time: "16:45:00", subject_id: "s0", event_id: null,
        location: "Library room 2", people: "Aditi, Rohan", notes: null,
        done: false, done_at: null, position: 4, created_at: "" },
      { id: "pb6", user_id: "u", title: "Football practice", kind: "activity", on_date: today,
        start_time: "21:00:00", end_time: "22:30:00", subject_id: null, event_id: null,
        location: "Sports complex", people: null, notes: null,
        done: false, done_at: null, position: 5, created_at: "" },
    ],
    attendance: [
      ...att("a", "s0", "slot0", "present", 9, 1),
      { id: "ax", user_id: "u", subject_id: "s0", slot_id: "slot0",
        occurrence_key: "slot:slot0", on_date: addDaysISO(today, -11),
        status: "absent", created_at: "" },
      ...att("b", "s1", "slot1", "present", 6, 1),
      ...att("c", "s1", "slot1", "absent", 4, 8),
      ...att("d", "s2", "slot2", "present", 7, 1),
    ],
    profile: { id: "u", display_name: "Karan", timezone: "Asia/Dubai", created_at: "" },
    prefs: {
      user_id: "u", class_enabled: true, class_lead_minutes: [10],
      day_summary_enabled: true, day_summary_time: "07:30:00",
      task_enabled: true, task_lead_minutes: [60], task_allday_time: "09:00:00",
      exam_enabled: true, exam_lead_days: [7, 3, 1], exam_lead_minutes: [60],
      study_enabled: true, study_lead_minutes: 10,
      activity_enabled: true, activity_lead_minutes: 30,
      meeting_enabled: true, meeting_lead_minutes: 15,
      quiet_enabled: false, quiet_start: "23:00:00", quiet_end: "07:00:00", updated_at: "",
    },
  },
  refresh: async () => {}, signOut: async () => {},
  addSubject: async () => null, updateSubject: async () => {}, removeSubject: async () => {},
  addSlot: async () => {}, updateSlot: async () => {}, removeSlot: async () => {},
  addOverride: async () => {}, removeOverride: async () => {},
  addEvent: async () => {}, updateEvent: async () => {}, removeEvent: async () => {},
  addTask: async () => {}, updateTask: async () => {}, toggleTask: async () => {},
  removeTask: async () => {}, clearCompletedTasks: async () => 0,
  setAttendance: async () => {}, clearAttendance: async () => {},
  updatePrefs: async () => {}, updateProfile: async () => {},
} as unknown as AppContextValue;

const SCREENS: Record<string, () => React.ReactElement> = {
  today: TodayPage, timetable: TimetablePage, calendar: CalendarPage,
  tasks: TasksPage, attendance: AttendancePage, settings: SettingsPage,
  planning: PlanningPage,
  loading: () => <LaunchScreen inline />,
};

const PREVIEW_KEY = "klasso-preview-v3";

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const screen = params.get("s") ?? "today";
  const Screen = SCREENS[screen] ?? TodayPage;
  const [data, setData] = useState(value.data);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = sessionStorage.getItem(PREVIEW_KEY);
        // Merge over the fixture rather than replacing it: a snapshot written by
        // an older build has no key for a field added since, and a missing array
        // would blow up the first consumer that filters it.
        if (saved) { const parsed = JSON.parse(saved); if (parsed.date === today) setData({ ...value.data, ...parsed.data }); }
      } catch {}
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify({ date: today, data })); } catch {}
  }, [data, loaded]);

  // The clock-anchored fixture is browser-only. Rendering it on the server would
  // differ from a later client module load, especially across a minute boundary.
  if (!loaded) return <LaunchScreen label="Opening the preview" />;

  type ListKey = "subjects" | "slots" | "overrides" | "events" | "tasks" | "blocks" | "attendance";
  const insert = (key: ListKey, row: object) => setData((d) => ({ ...d, [key]: [...d[key], { id: crypto.randomUUID(), user_id: "u", created_at: new Date().toISOString(), ...row }] }));
  const update = (key: ListKey, id: string, changes: object) => setData((d) => ({ ...d, [key]: d[key].map((row) => row.id === id ? { ...row, ...changes } : row) }));
  const remove = (key: ListKey, id: string) => setData((d) => ({ ...d, [key]: d[key].filter((row) => row.id !== id) }));
  const interactive: AppContextValue = {
    ...value, data, subjectsById: new Map(data.subjects.map((s) => [s.id, s])),
    addTask: async (changes) => { insert("tasks", { notes: null, subject_id: null, due_date: null, due_time: null, list_kind: "master", planned_date: null, priority: 1, done: false, done_at: null, position: -Date.now(), ...changes }); return true; },
    updateTask: async (id, changes) => update("tasks", id, changes),
    toggleTask: async (id) => { const task = data.tasks.find((t) => t.id === id); if (task) update("tasks", id, { done: !task.done, done_at: task.done ? null : new Date().toISOString() }); },
    removeTask: async (id) => remove("tasks", id),
    addBlock: async (changes) => { insert("blocks", { id: crypto.randomUUID(), user_id: "u", created_at: "", start_time: null, end_time: null, subject_id: null, event_id: null, notes: null, done: false, done_at: null, position: 0, ...changes }); return true; },
    updateBlock: async (id, changes) => { setData((d) => ({ ...d, blocks: d.blocks.map((b) => b.id === id ? { ...b, ...changes } : b) })); return true; },
    toggleBlock: async (id) => setData((d) => ({ ...d, blocks: d.blocks.map((b) => b.id === id ? { ...b, done: !b.done } : b) })),
    removeBlock: async (id) => { setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) })); return true; },
    clearCompletedTasks: async (scope = { kind: "master" }) => { const ids = data.tasks.filter((t) => t.done && inTaskScope(t, scope)).map((t) => t.id); setData((d) => ({ ...d, tasks: d.tasks.filter((t) => !ids.includes(t.id)) })); return ids.length; },
    addSubject: async (changes) => { const row = { id: crypto.randomUUID(), user_id: "u", created_at: "", short_name: null, color: "#497563", teacher: null, room: null, min_attendance: 75, ...changes }; insert("subjects", row); return row; },
    updateSubject: async (id, changes) => update("subjects", id, changes),
    removeSubject: async (id) => setData((d) => ({ ...d, subjects: d.subjects.filter((s) => s.id !== id), slots: d.slots.filter((s) => s.subject_id !== id), attendance: d.attendance.filter((a) => a.subject_id !== id), tasks: d.tasks.map((t) => t.subject_id === id ? { ...t, subject_id: null } : t), events: d.events.map((e) => e.subject_id === id ? { ...e, subject_id: null } : e), blocks: d.blocks.map((b) => b.subject_id === id ? { ...b, subject_id: null } : b) })),
    addSlot: async (row) => insert("slots", row), updateSlot: async (id, changes) => update("slots", id, changes), removeSlot: async (id) => remove("slots", id),
    addOverride: async (row) => insert("overrides", { slot_id: null, subject_id: null, start_time: null, end_time: null, room: null, note: null, ...row }), removeOverride: async (id) => remove("overrides", id),
    addEvent: async (row) => insert("events", { kind: "event", subject_id: null, start_time: null, end_time: null, location: null, notes: null, ...row }), updateEvent: async (id, changes) => update("events", id, changes), removeEvent: async (id) => setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id), blocks: d.blocks.filter((b) => b.event_id !== id) })),
    setAttendance: async ({ subjectId, slotId, occKey, date, status }) => { const existing = data.attendance.find((a) => a.on_date === date && a.occurrence_key === occKey); if (existing) { if (existing.status === status) remove("attendance", existing.id); else update("attendance", existing.id, { status }); } else insert("attendance", { subject_id: subjectId, slot_id: slotId, occurrence_key: occKey, on_date: date, status }); },
    clearAttendance: async (id) => remove("attendance", id),
    updatePrefs: async (changes) => setData((d) => ({ ...d, prefs: d.prefs ? { ...d.prefs, ...changes } : d.prefs })),
    updateProfile: async (changes) => setData((d) => ({ ...d, profile: d.profile ? { ...d.profile, ...changes } : d.profile })),
    signOut: async () => { sessionStorage.removeItem("klasso-preview-v2"); router.replace("/login"); },
  };
  return (
    <PreviewContext.Provider value={true}><AppContext.Provider value={interactive}>
      <AppShell screen={screen}><Screen /></AppShell>
    </AppContext.Provider></PreviewContext.Provider>
  );
}

export default function Preview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Suspense><Inner /></Suspense>;
}
