"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { isSupabaseConfigured, supabase } from "./supabase/client";
import { inTaskScope } from "./tasks";
import type {
  Attendance,
  AttendanceStatus,
  CalendarEvent,
  NotificationPrefs,
  Profile,
  ScheduleOverride,
  StudyBlock,
  Subject,
  Task,
  TaskScope,
  TimetableSlot,
} from "./types";

type Data = {
  subjects: Subject[];
  slots: TimetableSlot[];
  overrides: ScheduleOverride[];
  events: CalendarEvent[];
  tasks: Task[];
  blocks: StudyBlock[];
  attendance: Attendance[];
  profile: Profile | null;
  prefs: NotificationPrefs | null;
};

const EMPTY: Data = {
  subjects: [], slots: [], overrides: [], events: [],
  tasks: [], blocks: [], attendance: [], profile: null, prefs: null,
};

const CACHE_KEY = "klasso-cache-v2";

/** The keys of `Data` that hold arrays of rows — the generic CRUD helpers only apply to these. */
type ListKey = "subjects" | "slots" | "overrides" | "events" | "tasks" | "blocks" | "attendance";

type Ctx = {
  session: Session | null;
  userId: string | null;
  ready: boolean;
  loading: boolean;
  /** Rendering data from the local cache because the network failed. */
  stale: boolean;
  error: string | null;
  data: Data;
  subjectsById: Map<string, Subject>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;

  addSubject: (v: Partial<Subject> & { name: string }) => Promise<Subject | null>;
  updateSubject: (id: string, v: Partial<Subject>) => Promise<void>;
  removeSubject: (id: string) => Promise<void>;

  addSlot: (v: Omit<TimetableSlot, "id" | "user_id" | "created_at">) => Promise<void>;
  updateSlot: (id: string, v: Partial<TimetableSlot>) => Promise<void>;
  removeSlot: (id: string) => Promise<void>;

  addOverride: (v: Partial<ScheduleOverride> & { on_date: string; kind: ScheduleOverride["kind"] }) => Promise<void>;
  removeOverride: (id: string) => Promise<void>;

  addEvent: (v: Partial<CalendarEvent> & { title: string; on_date: string }) => Promise<void>;
  updateEvent: (id: string, v: Partial<CalendarEvent>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;

  addTask: (v: Partial<Task> & { title: string }) => Promise<boolean>;
  updateTask: (id: string, v: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  clearCompletedTasks: (scope?: TaskScope) => Promise<number>;

  addBlock: (v: Partial<StudyBlock> & { title: string; on_date: string }) => Promise<boolean>;
  updateBlock: (id: string, v: Partial<StudyBlock>) => Promise<boolean>;
  toggleBlock: (id: string) => Promise<void>;
  removeBlock: (id: string) => Promise<boolean>;

  setAttendance: (
    v: {
      subjectId: string;
      slotId: string | null;
      /** "slot:<id>" or "extra:<overrideId>" — see ClassOccurrence.occKey. */
      occKey: string;
      date: string;
      status: AttendanceStatus;
    },
  ) => Promise<void>;
  clearAttendance: (id: string) => Promise<void>;

  updatePrefs: (v: Partial<NotificationPrefs>) => Promise<void>;
  updateProfile: (v: Partial<Profile>) => Promise<void>;
};

export const AppContext = createContext<Ctx | null>(null);
export type AppContextValue = Ctx;

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Data>(EMPTY);
  const [pendingMutations, setPendingMutations] = useState(0);
  const userId = session?.user.id ?? null;
  const loadSeq = useRef(0);

  useEffect(() => {
    if (!userId || !data.profile || loading || stale || error || pendingMutations > 0) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, next: data })); } catch {}
  }, [data, userId, loading, stale, error, pendingMutations]);

  // ------------------------------------------------------------- auth
  useEffect(() => {
    if (!isSupabaseConfigured()) { queueMicrotask(() => setReady(true)); return; }
    const db = supabase();
    db.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setReady(true);
    }).catch(() => { setError("Could not restore your session. Check your connection and try again."); setReady(true); });
    const { data: sub } = db.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
      if (!next) {
        loadSeq.current++;
        setData(EMPTY);
        try { localStorage.removeItem(CACHE_KEY); } catch {}
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ------------------------------------------------------------- load
  const refresh = useCallback(async () => {
    if (!userId) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    const db = supabase();

    try {
      const [subjects, slots, overrides, events, tasks, blocks, attendance, profile, prefs] =
        await Promise.all([
          db.from("subjects").select("*").order("name"),
          db.from("timetable_slots").select("*").order("weekday").order("start_time"),
          db.from("schedule_overrides").select("*").order("on_date"),
          db.from("events").select("*").order("on_date"),
          db.from("tasks").select("*").order("position").order("created_at"),
          db.from("study_blocks").select("*").order("on_date").order("start_time", { nullsFirst: false }),
          db.from("attendance").select("*").order("on_date"),
          db.from("profiles").select("*").maybeSingle(),
          db.from("notification_prefs").select("*").maybeSingle(),
        ]);

      const first = [subjects, slots, overrides, events, tasks, blocks, attendance, profile, prefs]
        .find((r) => r.error);
      if (first?.error) throw new Error(first.error.message);
      if (seq !== loadSeq.current) return; // a newer load already won

      const next: Data = {
        subjects: (subjects.data ?? []) as Subject[],
        slots: (slots.data ?? []) as TimetableSlot[],
        overrides: (overrides.data ?? []) as ScheduleOverride[],
        events: (events.data ?? []) as CalendarEvent[],
        tasks: (tasks.data ?? []) as Task[],
        blocks: (blocks.data ?? []) as StudyBlock[],
        attendance: (attendance.data ?? []) as Attendance[],
        profile: (profile.data ?? null) as Profile | null,
        prefs: (prefs.data ?? null) as NotificationPrefs | null,
      };
      setData(next);
      setStale(false);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, next })); } catch {}
    } catch (err) {
      if (seq !== loadSeq.current) return;
      // Offline or Supabase unreachable: show the last known good data rather
      // than an empty timetable, and say so.
      let recovered = false;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { userId: string; next: Partial<Data> };
          if (parsed.userId === userId) {
            // Spread over EMPTY so a cache written before a field existed still
            // yields a complete shape — a missing array crashes its first reader.
            setData({ ...EMPTY, ...parsed.next });
            recovered = true;
          }
        }
      } catch {}
      setStale(recovered);
      setError(
        recovered
          ? "Offline — showing your last synced data."
          : err instanceof Error ? err.message : "Could not load your data.",
      );
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [userId]);

  // Load-on-mount. `refresh` reads an external system (Supabase) and owns its
  // own staleness guard via loadSeq, so the cascading-render warning does not
  // apply — there is no cheaper place to start this fetch in a client-only app.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  // Re-sync when the PWA comes back to the foreground or regains signal.
  useEffect(() => {
    if (!userId) return;
    const onWake = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [userId, refresh]);

  // -------------------------------------------------------- mutations
  const fail = useCallback((message: string) => {
    const notice = `Could not save your change. ${message}`;
    setError(notice);
    // Reconcile optimistic/cascading changes, then retain the failure notice.
    // refresh() clears errors at its start, so setting only before it hid failures.
    void refresh().finally(() => setError(notice));
  }, [refresh]);

  function makeInsert<T extends { id: string }>(table: string, key: ListKey) {
    return async (values: Record<string, unknown>): Promise<T | null> => {
      if (!userId) return null;
      const { data: row, error: err } = await supabase()
        .from(table).insert({ ...values, user_id: userId }).select().single();
      if (err) { fail(err.message); return null; }
      setData((d) => ({ ...d, [key]: [...(d[key] as unknown as T[]), row as T] }));
      return row as T;
    };
  }
  function makeUpdate<T extends { id: string }>(table: string, key: ListKey) {
    return async (id: string, values: Record<string, unknown>) => {
      const before = data[key] as unknown as T[];
      setData((d) => ({
        ...d,
        [key]: (d[key] as unknown as T[]).map((r) => (r.id === id ? { ...r, ...values } : r)),
      }));
      const { data: row, error: err } = await supabase()
        .from(table).update(values).eq("id", id).select().single();
      if (err) { setData((d) => ({ ...d, [key]: before })); fail(err.message); return; }
      setData((d) => ({
        ...d, [key]: (d[key] as unknown as T[]).map((r) => (r.id === id ? (row as T) : r)),
      }));
    };
  }
  function makeDelete<T extends { id: string }>(table: string, key: ListKey) {
    return async (id: string) => {
      const before = data[key] as unknown as T[];
      setData((d) => ({ ...d, [key]: (d[key] as unknown as T[]).filter((r) => r.id !== id) }));
      const { error: err } = await supabase().from(table).delete().eq("id", id);
      if (err) { setData((d) => ({ ...d, [key]: before })); fail(err.message); }
    };
  }

  const value = useMemo<Ctx>(() => {
    const insertSubject = makeInsert<Subject>("subjects", "subjects");
    const insertSlot = makeInsert<TimetableSlot>("timetable_slots", "slots");
    const insertOverride = makeInsert<ScheduleOverride>("schedule_overrides", "overrides");
    const insertEvent = makeInsert<CalendarEvent>("events", "events");
    const insertTask = makeInsert<Task>("tasks", "tasks");
    const insertBlock = makeInsert<StudyBlock>("study_blocks", "blocks");

    const actions: Ctx = {
      session, userId, ready, loading, stale, error, data,
      subjectsById: new Map(data.subjects.map((s) => [s.id, s])),
      refresh,
      signOut: async () => { await supabase().auth.signOut(); },

      addSubject: (v) => insertSubject(v as Record<string, unknown>),
      updateSubject: makeUpdate<Subject>("subjects", "subjects"),
      removeSubject: async (id) => {
        // Cascades in Postgres; mirror it locally so the UI matches at once.
        setData((d) => ({
          ...d,
          subjects: d.subjects.filter((s) => s.id !== id),
          slots: d.slots.filter((s) => s.subject_id !== id),
          attendance: d.attendance.filter((a) => a.subject_id !== id),
          tasks: d.tasks.map((task) => task.subject_id === id ? { ...task, subject_id: null } : task),
          events: d.events.map((event) => event.subject_id === id ? { ...event, subject_id: null } : event),
          blocks: d.blocks.map((block) => block.subject_id === id ? { ...block, subject_id: null } : block),
        }));
        const { error: err } = await supabase().from("subjects").delete().eq("id", id);
        if (err) fail(err.message);
      },

      addSlot: async (v) => { await insertSlot(v as Record<string, unknown>); },
      updateSlot: makeUpdate<TimetableSlot>("timetable_slots", "slots"),
      removeSlot: makeDelete<TimetableSlot>("timetable_slots", "slots"),

      addOverride: async (v) => { await insertOverride(v as Record<string, unknown>); },
      removeOverride: makeDelete<ScheduleOverride>("schedule_overrides", "overrides"),

      addEvent: async (v) => { await insertEvent(v as Record<string, unknown>); },
      updateEvent: makeUpdate<CalendarEvent>("events", "events"),
      removeEvent: async (id) => {
        const { error: err } = await supabase().from("events").delete().eq("id", id);
        if (err) { fail(err.message); return; }
        setData((d) => ({ ...d, events: d.events.filter((event) => event.id !== id), blocks: d.blocks.filter((block) => block.event_id !== id) }));
      },

      addTask: async (v) => {
        const top = Math.min(0, ...data.tasks.map((t) => t.position)) - 1;
        return Boolean(await insertTask({ position: top, ...v } as Record<string, unknown>));
      },
      updateTask: makeUpdate<Task>("tasks", "tasks"),
      toggleTask: async (id) => {
        const task = data.tasks.find((t) => t.id === id);
        if (!task) return;
        const done = !task.done;
        await makeUpdate<Task>("tasks", "tasks")(id, {
          done, done_at: done ? new Date().toISOString() : null,
        });
      },
      removeTask: makeDelete<Task>("tasks", "tasks"),
      clearCompletedTasks: async (scope = { kind: "master" }) => {
        const ids = data.tasks.filter((t) => t.done && inTaskScope(t, scope)).map((t) => t.id);
        if (ids.length === 0) return 0;
        const removed = data.tasks.filter((t) => ids.includes(t.id));
        setData((d) => ({ ...d, tasks: d.tasks.filter((t) => !ids.includes(t.id)) }));
        const { error: err } = await supabase().from("tasks").delete().in("id", ids);
        if (err) { setData((d) => ({ ...d, tasks: [...d.tasks, ...removed] })); fail(err.message); return 0; }
        return ids.length;
      },

      addBlock: async (v) => Boolean(await insertBlock(v as Record<string, unknown>)),
      updateBlock: async (id, v) => {
        if (!userId) return false;
        const { data: row, error: err } = await supabase().from("study_blocks").update(v).eq("id", id).eq("user_id", userId).select().single();
        if (err) { fail(err.message); return false; }
        setData((d) => ({ ...d, blocks: d.blocks.map((block) => block.id === id ? row as StudyBlock : block) }));
        return true;
      },
      toggleBlock: async (id) => {
        const block = data.blocks.find((b) => b.id === id);
        if (!block) return;
        const done = !block.done;
        await makeUpdate<StudyBlock>("study_blocks", "blocks")(id, {
          done, done_at: done ? new Date().toISOString() : null,
        });
      },
      removeBlock: async (id) => {
        if (!userId) return false;
        const { error: err } = await supabase().from("study_blocks").delete().eq("id", id).eq("user_id", userId).select("id").single();
        if (err) { fail(err.message); return false; }
        setData((d) => ({ ...d, blocks: d.blocks.filter((block) => block.id !== id) }));
        return true;
      },

      setAttendance: async ({ subjectId, slotId, occKey, date, status }) => {
        if (!userId) return;
        const existing = data.attendance.find(
          (a) => a.on_date === date && a.occurrence_key === occKey,
        );
        if (existing) {
          if (existing.status === status) {
            // Tapping the active state again clears the mark.
            await makeDelete<Attendance>("attendance", "attendance")(existing.id);
            return;
          }
          await makeUpdate<Attendance>("attendance", "attendance")(existing.id, { status });
          return;
        }
        const { data: row, error: err } = await supabase()
          .from("attendance")
          .upsert(
            {
              user_id: userId, subject_id: subjectId, slot_id: slotId,
              occurrence_key: occKey, on_date: date, status,
            },
            { onConflict: "user_id,on_date,occurrence_key" },
          )
          .select().single();
        if (err) { fail(err.message); return; }
        setData((d) => ({ ...d, attendance: [...d.attendance, row as Attendance] }));
      },
      clearAttendance: makeDelete<Attendance>("attendance", "attendance"),

      updatePrefs: async (v) => {
        if (!userId) return;
        const before = data.prefs;
        setData((d) => ({ ...d, prefs: d.prefs ? { ...d.prefs, ...v } : d.prefs }));
        const { data: row, error: err } = await supabase()
          .from("notification_prefs")
          .upsert({ user_id: userId, ...v, updated_at: new Date().toISOString() },
                  { onConflict: "user_id" })
          .select().single();
        if (err) { setData((d) => ({ ...d, prefs: before })); fail(err.message); return; }
        setData((d) => ({ ...d, prefs: row as NotificationPrefs }));
      },
      updateProfile: async (v) => {
        if (!userId) return;
        const before = data.profile;
        setData((d) => ({ ...d, profile: d.profile ? { ...d.profile, ...v } : d.profile }));
        const { data: row, error: err } = await supabase()
          .from("profiles").upsert({ id: userId, ...v }, { onConflict: "id" }).select().single();
        if (err) { setData((d) => ({ ...d, profile: before })); fail(err.message); return; }
        setData((d) => ({ ...d, profile: row as Profile }));
      },
    };
    async function tracked<Result>(operation: () => Promise<Result>): Promise<Result> {
      setPendingMutations((count) => count + 1);
      try { return await operation(); }
      finally { setPendingMutations((count) => count - 1); }
    }
    return {
      ...actions,
      addTask: (v) => tracked(() => actions.addTask(v)), updateTask: (id, v) => tracked(() => actions.updateTask(id, v)), toggleTask: (id) => tracked(() => actions.toggleTask(id)), removeTask: (id) => tracked(() => actions.removeTask(id)), clearCompletedTasks: (scope) => tracked(() => actions.clearCompletedTasks(scope)),
      addBlock: (v) => tracked(() => actions.addBlock(v)), updateBlock: (id, v) => tracked(() => actions.updateBlock(id, v)), toggleBlock: (id) => tracked(() => actions.toggleBlock(id)), removeBlock: (id) => tracked(() => actions.removeBlock(id)),
      addSubject: (v) => tracked(() => actions.addSubject(v)), updateSubject: (id, v) => tracked(() => actions.updateSubject(id, v)), removeSubject: (id) => tracked(() => actions.removeSubject(id)),
      addSlot: (v) => tracked(() => actions.addSlot(v)), updateSlot: (id, v) => tracked(() => actions.updateSlot(id, v)), removeSlot: (id) => tracked(() => actions.removeSlot(id)),
      addOverride: (v) => tracked(() => actions.addOverride(v)), removeOverride: (id) => tracked(() => actions.removeOverride(id)),
      addEvent: (v) => tracked(() => actions.addEvent(v)), updateEvent: (id, v) => tracked(() => actions.updateEvent(id, v)), removeEvent: (id) => tracked(() => actions.removeEvent(id)),
      setAttendance: (v) => tracked(() => actions.setAttendance(v)), clearAttendance: (id) => tracked(() => actions.clearAttendance(id)),
      updatePrefs: (v) => tracked(() => actions.updatePrefs(v)), updateProfile: (v) => tracked(() => actions.updateProfile(v)),
    };
    // `data` drives every closure above, so it must stay in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userId, ready, loading, stale, error, data, refresh, fail]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
