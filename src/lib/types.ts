export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  short_name: string | null;
  color: string;
  teacher: string | null;
  room: string | null;
  min_attendance: number;
  created_at: string;
};

export type SlotKind = "lecture" | "lab" | "tutorial" | "other";

export type TimetableSlot = {
  id: string;
  user_id: string;
  subject_id: string | null;
  weekday: number;
  /** "HH:MM:SS" as returned by Postgres `time` */
  start_time: string;
  end_time: string;
  room: string | null;
  kind: SlotKind;
  created_at: string;
};

export type OverrideKind = "cancel_slot" | "cancel_day" | "extra";

export type ScheduleOverride = {
  id: string;
  user_id: string;
  on_date: string;
  kind: OverrideKind;
  slot_id: string | null;
  subject_id: string | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  note: string | null;
  created_at: string;
};

export type EventKind = "exam" | "assignment" | "event" | "holiday";

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  kind: EventKind;
  subject_id: string | null;
  on_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  /** Free text, one topic per line. Planning splits it into schedulable items. */
  syllabus?: string | null;
  created_at: string;
};

/** A piece of work placed on a date — "what to do, and when". */
export type BlockKind = "study" | "activity" | "meeting";

export type StudyBlock = {
  id: string;
  user_id: string;
  title: string;
  /** Missing on caches written before activities and meetings existed. */
  kind?: BlockKind;
  location?: string | null;
  people?: string | null;
  on_date: string;
  start_time: string | null;
  end_time: string | null;
  subject_id: string | null;
  /** The exam this revision block belongs to, if it came from a syllabus. */
  event_id: string | null;
  notes: string | null;
  done: boolean;
  done_at: string | null;
  position: number;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  subject_id: string | null;
  due_date: string | null;
  due_time: string | null;
  /** Missing on old offline caches; treat as master. */
  list_kind?: "daily" | "master";
  planned_date?: string | null;
  priority: number;
  done: boolean;
  done_at: string | null;
  position: number;
  created_at: string;
};

export type TaskScope = { kind: "master" } | { kind: "daily"; date: string };

export type AttendanceStatus = "present" | "absent" | "cancelled";

export type Attendance = {
  id: string;
  user_id: string;
  subject_id: string;
  slot_id: string | null;
  /** Identity of one class on one day: "slot:<id>" or "extra:<overrideId>". */
  occurrence_key: string;
  on_date: string;
  status: AttendanceStatus;
  created_at: string;
};

export type NotificationPrefs = {
  user_id: string;
  class_enabled: boolean;
  class_lead_minutes: number[];
  day_summary_enabled: boolean;
  day_summary_time: string;
  task_enabled: boolean;
  task_lead_minutes: number[];
  task_allday_time: string;
  exam_enabled: boolean;
  exam_lead_days: number[];
  exam_lead_minutes: number[];
  quiet_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  created_at: string;
};

/** One concrete class on one concrete date, after overrides are applied. */
export type ClassOccurrence = {
  /** Stable per date+slot; synthesised overrides use the override id. */
  key: string;
  /**
   * Date-independent identity of this class, used to key attendance rows:
   * "slot:<id>" for a recurring class, "extra:<overrideId>" for a one-off.
   */
  occKey: string;
  slotId: string | null;
  overrideId: string | null;
  subjectId: string | null;
  subject: Subject | null;
  startMin: number;
  endMin: number;
  room: string | null;
  kind: SlotKind;
  /** True when this class only exists because of a date override. */
  isExtra: boolean;
  note: string | null;
};

/** A free gap between two classes on the same day. */
export type Gap = {
  startMin: number;
  endMin: number;
  afterSubject: string | null;
  beforeSubject: string | null;
};
