const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Weekday indexes in the order a timetable is read: Monday first, Sunday last.
 * The stored values stay JS-native (0 = Sunday) so date maths is unchanged.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Postgres `time` ("HH:MM:SS" or "HH:MM") -> minutes since midnight. */
export function parseTime(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

/** minutes since midnight -> "HH:MM", the shape Postgres `time` accepts. */
export function toTimeString(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** minutes since midnight -> "9:05 am" (or "09:05" when hour12 is false). */
export function formatMinutes(minutes: number, hour12 = true): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  if (!hour12) return `${String(h).padStart(2, "0")}:${mm}`;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${suffix}`;
}

/** "1h 20m", "45m", "30s" — for countdowns and gap lengths. */
export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 1) return "under a minute";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Local calendar date of a JS Date as "YYYY-MM-DD" (no UTC shifting). */
export function localDateISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0=Sunday .. 6=Saturday for a "YYYY-MM-DD" string. */
export function weekdayOfISO(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Whole days from `a` to `b` (b - a). Both "YYYY-MM-DD". */
export function daysBetweenISO(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Sunday-anchored week containing `iso`, as seven date strings. */
export function weekOf(iso: string): string[] {
  const start = addDaysISO(iso, -weekdayOfISO(iso));
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

/**
 * Wall-clock reading of `at` in an IANA timezone. This is the one piece the
 * server dispatcher cannot get from a plain Date: it runs in UTC on Vercel but
 * must decide "is it 07:30 where the user actually is?".
 */
export function zonedNow(tz: string, at: Date = new Date()): {
  dateISO: string;
  minutes: number;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    dateISO,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? weekdayOfISO(dateISO),
  };
}

/** "Mon 9 Sep" / "Monday, 9 September" for headings. */
export function formatDateISO(iso: string, style: "short" | "long" = "short"): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
  });
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The device's IANA zone, or null if the browser reports something Intl cannot
 * resolve. Reminders fire on this, so a bad value is worse than no value.
 */
export function deviceTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimezone(tz) ? tz : null;
  } catch {
    return null;
  }
}

/**
 * Which zone, if any, the profile should be rewritten to. Pure so the loop
 * guard is testable: the write updates the profile, which re-runs the effect,
 * so refusing a zone already attempted this session is what stops a failed
 * write turning into an endless retry.
 */
export function timezoneToSync(
  stored: string | null | undefined,
  device: string | null,
  attempted: string | null,
): string | null {
  if (!device) return null;
  if (device === stored) return null;
  if (device === attempted) return null;
  return device;
}
