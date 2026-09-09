"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlanEditor, type PlanDraft } from "@/components/PlanEditor";
import { useAppHref } from "@/components/AppShell";
import { localDateISO } from "@/lib/time";

import {
  Banner, Button, Card, EmptyState, Field, Input, Segmented, Dropdown, Sheet, cx,
} from "@/components/ui";
import { packLanes } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import {
  formatMinutes, parseTime, toTimeString, WEEK_ORDER, WEEKDAY_NAMES, WEEKDAY_SHORT,
} from "@/lib/time";
import type { SlotKind, Subject, TimetableSlot } from "@/lib/types";
import { Icon } from "@/components/icons";

const PALETTE = [
  "#497563", "#527d91", "#8a8a4c", "#b38a42", "#a65d4e",
  "#a2667a", "#6f718f", "#417f7c", "#a57448", "#65756c",
];

const KINDS: { value: SlotKind; label: string }[] = [
  { value: "lecture", label: "Lecture" },
  { value: "lab", label: "Lab" },
  { value: "tutorial", label: "Tutorial" },
  { value: "other", label: "Other" },
];

export default function TimetablePage() {
  const { data, subjectsById } = useApp();
  const href = useAppHref();
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [slotSheet, setSlotSheet] = useState<{ open: boolean; slot: TimetableSlot | null; weekday: number }>(
    { open: false, slot: null, weekday: 1 },
  );
  const [subjectSheet, setSubjectSheet] = useState(false);

  const byDay = useMemo(() => {
    const m = new Map<number, TimetableSlot[]>();
    for (let d = 0; d < 7; d++) m.set(d, []);
    for (const s of data.slots) m.get(s.weekday)?.push(s);
    for (const list of m.values()) list.sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    return m;
  }, [data.slots]);

  // Days with nothing on them are hidden from the list so the page stays short.
  const activeDays = [1, 2, 3, 4, 5, 6, 0].map((day) => [day, byDay.get(day)!] as const).filter(([, list]) => list.length > 0);

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-heading">Your week, in rhythm.</h1>
          <p className="page-subtitle">
            {data.slots.length} weekly {data.slots.length === 1 ? "class" : "classes"} ·{" "}
            {data.subjects.length} {data.subjects.length === 1 ? "subject" : "subjects"}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setSubjectSheet(true)}>
          <Icon name="book" size={16} />Subjects
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3"><div className="min-w-[220px] flex-1 sm:max-w-md"><Segmented
        value={view}
        onChange={setView}
        options={[{ value: "list", label: "By day" }, { value: "grid", label: "Whole week" }]}
      /></div><Button variant="primary" className="sm:ml-auto" onClick={() => data.subjects.length === 0 ? setSubjectSheet(true) : setSlotSheet({ open: true, slot: null, weekday: 1 })}><Icon name="plus" size={17} />Add a class</Button></div>

      {data.subjects.length === 0 && (
        <Banner tone="info">Start by adding your subjects, then place them on the week.</Banner>
      )}

      <section className="timetable-personal"><div><h2>There’s more to your week than classes.</h2><p>Schedule an activity or meeting on a specific date. Find it in Planning and Calendar.</p></div><div><Button onClick={() => setPlanDraft({ kind: "activity", on_date: localDateISO() })}><Icon name="activity" size={17} />Activity</Button><Button onClick={() => setPlanDraft({ kind: "meeting", on_date: localDateISO() })}><Icon name="people" size={17} />Meeting</Button><Link className="section-link" href={href("/planning")}>Day plan <Icon name="arrow" size={16} /></Link></div></section>
      {planDraft && <PlanEditor key={planDraft.kind} initial={planDraft} onClose={() => setPlanDraft(null)} />}

      {data.slots.length === 0 ? (
        <Card>
          <EmptyState
            title="Your week is empty"
            body="Add each class once and it repeats every week. You can cancel or move individual days later from the Today tab."
            action={
              <Button
                variant="primary"
                onClick={() =>
                  data.subjects.length === 0
                    ? setSubjectSheet(true)
                    : setSlotSheet({ open: true, slot: null, weekday: 1 })
                }
              >
                {data.subjects.length === 0 ? "Add a subject" : "Add a class"}
              </Button>
            }
          />
        </Card>
      ) : view === "list" ? (
        <div className="grid gap-5 min-[760px]:grid-cols-2">
          {activeDays.map(([day, list]) => (
            <section key={day} className="panel p-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-bold">{WEEKDAY_NAMES[day]}</h2>
                <span className="text-xs font-semibold text-faint">
                  {formatMinutes(parseTime(list[0].start_time))} –{" "}
                  {formatMinutes(Math.max(...list.map((s) => parseTime(s.end_time))))}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {list.map((slot) => {
                  const subject = slot.subject_id ? subjectsById.get(slot.subject_id) : null;
                  return (
                    <li key={slot.id}>
                      <button
                        onClick={() => setSlotSheet({ open: true, slot, weekday: day })}
                        className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition hover:bg-surface-2/50 active:scale-[0.99]"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: subject?.color ?? "#94a3b8" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">
                            {subject?.name ?? "Unassigned"}
                          </span>
                          <span className="block truncate text-sm text-dim">
                            {formatMinutes(parseTime(slot.start_time))} –{" "}
                            {formatMinutes(parseTime(slot.end_time))}
                            {slot.room ? ` · ${slot.room}` : ""}
                            {slot.kind !== "lecture" ? ` · ${slot.kind}` : ""}
                          </span>
                        </span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-faint">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <WeekGrid slots={data.slots} subjects={data.subjects} onPick={(slot) =>
          setSlotSheet({ open: true, slot, weekday: slot.weekday })} />
      )}

      <p className="text-xs text-dim">Classes repeat weekly. For holidays or a single-day change, use Edit day on Today.</p>

      <SlotSheet
        state={slotSheet}
        onClose={() => setSlotSheet((s) => ({ ...s, open: false }))}
      />
      <SubjectSheet open={subjectSheet} onClose={() => setSubjectSheet(false)} />
    </div>
  );
}

/** The whole week at a glance: days as columns, time running down. */
function WeekGrid({
  slots, subjects, onPick,
}: { slots: TimetableSlot[]; subjects: Subject[]; onPick: (s: TimetableSlot) => void }) {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const now = useNow(60_000);

  // A timetable is read as a whole week. Showing only the days that happen to
  // have classes made the columns jump around and hid the free days.
  const ROW = 56;               // px per hour
  const starts = slots.map((s) => parseTime(s.start_time));
  const ends = slots.map((s) => parseTime(s.end_time));
  const from = slots.length ? Math.floor(Math.min(...starts) / 60) * 60 : 8 * 60;
  const to = slots.length ? Math.ceil(Math.max(...ends) / 60) * 60 : 17 * 60;
  const hours = Math.max(1, (to - from) / 60);
  const y = (minutes: number) => ((minutes - from) / 60) * ROW;

  const showNow = now.minutes >= from && now.minutes <= to;

  return (
    <div className="panel p-0">
      <div className="week-scroll">
        <div className="week-grid" style={{ ["--week-rows" as string]: hours }}>
          {/* header */}
          <div className="week-corner" />
          {WEEK_ORDER.map((day) => (
            <div key={`h${day}`} className={cx("week-head", day === now.weekday && "is-today")}>
              <span className="week-head-day">{WEEKDAY_SHORT[day]}</span>
            </div>
          ))}

          {/* hour gutter — labels sit centred on their own line */}
          <div className="week-axis" style={{ height: hours * ROW }}>
            {Array.from({ length: hours + 1 }, (_, i) => (
              <span key={i} className="week-hour" style={{ top: i * ROW }}>
                {formatMinutes(from + i * 60)}
              </span>
            ))}
          </div>

          {/* day columns */}
          {WEEK_ORDER.map((day) => {
            const dayClasses = slots
              .filter((s) => s.weekday === day)
              .map((s) => ({ slot: s, startMin: parseTime(s.start_time), endMin: parseTime(s.end_time) }));
            return (
              <div
                key={day}
                className={cx("week-col", day === now.weekday && "is-today")}
                style={{ height: hours * ROW }}
              >
                {Array.from({ length: hours }, (_, i) => (
                  <div key={i} className="week-line" style={{ top: (i + 1) * ROW }} />
                ))}

                {day === now.weekday && showNow && (
                  <div className="week-now" style={{ top: y(now.minutes) }} aria-hidden />
                )}

                {dayClasses.length === 0 && <span className="week-empty">—</span>}

                {packLanes(dayClasses).map(({ item, lane, lanes }) => {
                  const s = item.slot;
                  const subject = s.subject_id ? byId.get(s.subject_id) : null;
                  const top = y(item.startMin);
                  const height = Math.max(26, y(item.endMin) - top - 3);
                  const width = 100 / lanes;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPick(s)}
                      className="week-block"
                      title={`${subject?.name ?? "Class"} · ${formatMinutes(item.startMin)}–${formatMinutes(item.endMin)}`}
                      style={{
                        top: top + 2, height,
                        left: `calc(${lane * width}% + 3px)`,
                        width: `calc(${width}% - 6px)`,
                        // Tint from the subject colour so the block stays
                        // readable in both themes rather than being flooded.
                        background: `color-mix(in srgb, ${subject?.color ?? "var(--brand)"} 20%, var(--surface))`,
                        borderInlineStart: `3px solid ${subject?.color ?? "var(--brand)"}`,
                      }}
                    >
                      <span className="week-block-name">
                        {subject?.short_name || subject?.name || "Class"}
                      </span>
                      {height > 34 && (
                        <span className="week-block-time">
                          {formatMinutes(item.startMin)}–{formatMinutes(item.endMin)}
                        </span>
                      )}
                      {height > 58 && (s.room || subject?.room) && (
                        <span className="week-block-room">{s.room || subject?.room}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * One subject can meet at different times on different days — Physics on Monday
 * morning and again Thursday afternoon. So the sheet collects a list of
 * (days + time) rows rather than applying a single time across a set of days.
 */
type SlotRow = {
  key: string;
  weekdays: number[];
  start: string;
  end: string;
  room: string;
  kind: SlotKind;
};

const newRow = (weekday: number, from?: SlotRow): SlotRow => ({
  key: crypto.randomUUID(),
  weekdays: [weekday],
  start: from?.end ?? "09:00",
  end: from ? addHour(from.end) : "10:00",
  room: from?.room ?? "",
  kind: from?.kind ?? "lecture",
});

function addHour(hhmm: string): string {
  return toTimeString(parseTime(hhmm) + 60);
}

function SlotSheet({
  state, onClose,
}: {
  state: { open: boolean; slot: TimetableSlot | null; weekday: number };
  onClose: () => void;
}) {
  const { data, addSlot, updateSlot, removeSlot } = useApp();
  const editing = state.slot;

  const [form, setForm] = useState(() => blank(state));
  const [key, setKey] = useState("");
  const signature = `${state.open}:${editing?.id ?? "new"}:${state.weekday}`;
  if (key !== signature) {
    setKey(signature);
    setForm(blank(state));
  }

  const setRow = (rowKey: string, patch: Partial<SlotRow>) =>
    setForm({ ...form, rows: form.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) });

  const rowValid = (r: SlotRow) => r.weekdays.length > 0 && r.start && r.end > r.start;
  const valid = Boolean(form.subject_id) && form.rows.length > 0 && form.rows.every(rowValid);
  const totalClasses = form.rows.reduce((n, r) => n + r.weekdays.length, 0);

  // Clashes are per row and per day: the same subject at two different times
  // is normal, two things at once is not.
  const clashes = form.rows.flatMap((r) =>
    rowValid(r)
      ? r.weekdays.filter((day) => data.slots.some((slot) =>
          slot.id !== editing?.id && slot.weekday === day
          && parseTime(slot.start_time) < parseTime(r.end)
          && parseTime(slot.end_time) > parseTime(r.start)))
      : []);
  const clashDays = [...new Set(clashes)].sort((a, b) => a - b);

  const save = () => {
    const rows = form.rows;
    if (editing) {
      const r = rows[0];
      void updateSlot(editing.id, {
        subject_id: form.subject_id, weekday: r.weekdays[0],
        start_time: r.start, end_time: r.end, room: r.room || null, kind: r.kind,
      });
    } else {
      void (async () => {
        for (const r of rows) {
          for (const day of [...r.weekdays].sort((a, b) => a - b)) {
            await addSlot({
              subject_id: form.subject_id, weekday: day,
              start_time: r.start, end_time: r.end, room: r.room || null, kind: r.kind,
            } as Parameters<typeof addSlot>[0]);
          }
        }
      })();
    }
    onClose();
  };

  return (
    <Sheet
      open={state.open}
      onClose={onClose}
      title={editing ? "Edit class" : "Add a class"}
      footer={
        <div className="flex gap-2">
          {editing && (
            <Button variant="danger" onClick={() => { void removeSlot(editing.id); onClose(); }}>
              Delete
            </Button>
          )}
          <Button variant="primary" className="flex-1" disabled={!valid} onClick={save}>
            {editing
              ? "Save changes"
              : totalClasses > 1 ? `Add ${totalClasses} classes` : "Add class"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label="Subject">
          <Dropdown
            aria-label="Subject"
            placeholder="Choose…"
            value={form.subject_id}
            onChange={(v) => setForm({ ...form, subject_id: v })}
            options={data.subjects.map((s) => ({ value: s.id, label: s.name, swatch: s.color }))}
          />
        </Field>

        {form.rows.map((row, index) => (
          <div key={row.key} className="slot-row">
            {!editing && (
              <div className="slot-row-head">
                <span>{index === 0 ? "When it meets" : `Also meets`}</span>
                {form.rows.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove time ${index + 1}`}
                    onClick={() => setForm({ ...form, rows: form.rows.filter((r) => r.key !== row.key) })}
                  >
                    <Icon name="close" size={15} />
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-7 gap-1">
              {WEEK_ORDER.map((d) => {
                const on = row.weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${WEEKDAY_NAMES[d]}${editing ? "" : ` for time ${index + 1}`}`}
                    onClick={() => setRow(row.key, {
                      weekdays: editing
                        ? [d]
                        : on ? row.weekdays.filter((x) => x !== d) : [...row.weekdays, d],
                    })}
                    className={cx(
                      "min-h-11 rounded-lg text-xs font-bold transition",
                      on ? "bg-brand text-bg" : "bg-surface-2 text-dim hover:text-ink",
                    )}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Field label="Starts">
                <Input type="time" value={row.start}
                       onChange={(e) => setRow(row.key, { start: e.target.value })} />
              </Field>
              <Field label="Ends">
                <Input type="time" value={row.end}
                       onChange={(e) => setRow(row.key, { end: e.target.value })} />
              </Field>
            </div>
            {row.end <= row.start && (
              <Banner tone="danger">The end time has to be after the start time.</Banner>
            )}

            <div className="flex flex-wrap gap-3">
              <Field label="Room" hint="Optional">
                <Input value={row.room} placeholder="e.g. LT-3"
                       onChange={(e) => setRow(row.key, { room: e.target.value })} />
              </Field>
              <Field label="Type">
                <Dropdown
                  aria-label={`Class type${editing ? "" : ` for time ${index + 1}`}`}
                  value={row.kind}
                  onChange={(v) => setRow(row.key, { kind: v as SlotKind })}
                  options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
                />
              </Field>
            </div>
          </div>
        ))}

        {!editing && (
          <Button
            variant="secondary"
            onClick={() => setForm({
              ...form,
              rows: [...form.rows, newRow(state.weekday, form.rows[form.rows.length - 1])],
            })}
          >
            <Icon name="plus" size={16} />Add another day and time
          </Button>
        )}

        {valid && clashDays.length > 0 && (
          <Banner tone="warn">
            Overlaps an existing class on {clashDays.map((d) => WEEKDAY_NAMES[d]).join(", ")}.
            You can still save if that is intentional.
          </Banner>
        )}
      </div>
    </Sheet>
  );
}


function blank(state: { slot: TimetableSlot | null; weekday: number }) {
  const s = state.slot;
  return {
    subject_id: s?.subject_id ?? "",
    rows: [
      s
        ? {
            key: s.id,
            weekdays: [s.weekday],
            start: toTimeString(parseTime(s.start_time)),
            end: toTimeString(parseTime(s.end_time)),
            room: s.room ?? "",
            kind: (s.kind ?? "lecture") as SlotKind,
          }
        : newRow(state.weekday),
    ] as SlotRow[],
  };
}

function SubjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addSubject, updateSubject, removeSubject } = useApp();
  const [name, setName] = useState("");
  const [colour, setColour] = useState(PALETTE[0]);
  const [editing, setEditing] = useState<Subject | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title="Subjects">
      <div className="flex flex-col gap-5">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            void addSubject({ name: trimmed, color: colour });
            setName("");
            setColour(PALETTE[(PALETTE.indexOf(colour) + 1) % PALETTE.length]);
          }}
        >
          <Field label="Add a subject">
            <Input value={name} placeholder="e.g. Data Structures"
                   onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColour(c)}
                aria-label={`Colour ${c}`}
                aria-pressed={colour === c}
                className={cx(
                  "h-8 w-8 rounded-full transition",
                  colour === c ? "ring-2 ring-brand ring-offset-2 ring-offset-[var(--surface)]" : "",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <Button type="submit" variant="primary" disabled={!name.trim()}>Add subject</Button>
        </form>

        {data.subjects.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-faint">
              Your subjects
            </h3>
            <ul className="flex flex-col gap-1.5">
              {data.subjects.map((s) => (
                <li key={s.id} className="rounded-xl bg-surface-2 p-2.5">
                  {editing?.id === s.id ? (
                    <div className="flex flex-col gap-2.5">
                      <Input
                        aria-label="Subject name"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Input
                          aria-label="Default room"
                          value={editing.room ?? ""} placeholder="Default room"
                          onChange={(e) => setEditing({ ...editing, room: e.target.value })}
                        />
                        <Input
                          aria-label="Minimum attendance percentage"
                          type="number" min={0} max={100}
                          value={editing.min_attendance}
                          onChange={(e) =>
                            setEditing({ ...editing, min_attendance: Number(e.target.value) })}
                        />
                      </div>
                      <Input value={editing.teacher ?? ""} aria-label="Teacher" placeholder="Teacher (optional)" onChange={(event) => setEditing({ ...editing, teacher: event.target.value })} />
                      <Input value={editing.short_name ?? ""} aria-label="Short name" placeholder="Short name, e.g. DSA" onChange={(event) => setEditing({ ...editing, short_name: event.target.value })} />
                      <p className="text-xs text-faint">
                        Name, default room, and the attendance % you must keep.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {PALETTE.map((c) => (
                          <button
                            key={c} type="button"
                            onClick={() => setEditing({ ...editing, color: c })}
                            aria-label={`Colour ${c}`}
                            className={cx("h-7 w-7 rounded-full",
                              editing.color === c ? "ring-2 ring-brand ring-offset-2 ring-offset-[var(--surface-2)]" : "")}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" className="flex-1" disabled={!editing.name.trim() || !Number.isFinite(editing.min_attendance) || editing.min_attendance < 0 || editing.min_attendance > 100} onClick={() => {
                          void updateSubject(s.id, {
                            name: editing.name.trim() || s.name,
                            color: editing.color,
                            room: editing.room || null,
                            teacher: editing.teacher || null,
                            short_name: editing.short_name || null,
                            min_attendance: editing.min_attendance,
                          });
                          setEditing(null);
                        }}>Save</Button>
                        <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button size="sm" variant="danger" onClick={() => {
                          void removeSubject(s.id);
                          setEditing(null);
                        }}>Delete</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(s)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                      <span className="shrink-0 text-xs text-faint">{s.min_attendance}% min</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}
