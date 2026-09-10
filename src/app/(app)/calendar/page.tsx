"use client";

import { useMemo, useState } from "react";

import {
  Button, Card, EmptyState, Field, Input, Segmented, Dropdown, Sheet, Textarea, cx,
} from "@/components/ui";
import { resolveDay } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import {
  addDaysISO, daysBetweenISO, formatDateISO, formatMinutes, parseTime, weekdayOfISO,
  WEEKDAY_SHORT,
} from "@/lib/time";
import { useNow } from "@/lib/useNow";
import type { CalendarEvent, EventKind } from "@/lib/types";
import { Icon } from "@/components/icons";
import { PlanEditor, type PlanDraft } from "@/components/PlanEditor";
import { blockKind, blocksForDay } from "@/lib/planning";

const KINDS: { value: EventKind; label: string; tone: string }[] = [
  { value: "exam", label: "Exam", tone: "bg-danger-soft text-danger" },
  { value: "assignment", label: "Assignment", tone: "bg-warn-soft text-warn" },
  { value: "event", label: "Event", tone: "bg-brand-soft text-brand" },
  { value: "holiday", label: "Holiday", tone: "bg-success-soft text-success" },
];
const toneFor = (k: EventKind) => KINDS.find((x) => x.value === k)?.tone ?? "";

export default function CalendarPage() {
  const { data, subjectsById } = useApp();
  const now = useNow(60_000);
  const [view, setView] = useState<"month" | "list">("month");
  const [cursor, setCursor] = useState(() => now.dateISO.slice(0, 7)); // "YYYY-MM"
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | "new" | null>(null);
  // Which date a NEW entry should default to. Separate from `selected`,
  // which means "the day sheet is open" — overloading one state for both
  // made closing the editor pop open a day sheet the user never asked for.
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of data.events) {
      const list = m.get(e.on_date) ?? [];
      list.push(e);
      m.set(e.on_date, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
    }
    return m;
  }, [data.events]);

  const upcoming = useMemo(
    () => data.events.filter((e) => e.on_date >= now.dateISO)
                     .sort((a, b) => a.on_date.localeCompare(b.on_date)),
    [data.events, now.dateISO],
  );

  const grid = useMemo(() => buildMonth(cursor), [cursor]);
  const monthLabel = new Date(`${cursor}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC", month: "long", year: "numeric",
  });

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-heading">Room for what’s next.</h1>
          <p className="page-subtitle">
            {upcoming.length} upcoming
            {upcoming[0] && ` · ${describeGap(daysBetweenISO(now.dateISO, upcoming[0].on_date))}`}
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => { setDraftDate(now.dateISO); setEditing("new"); }}>
          <Icon name="plus" size={17} />Add entry
        </Button>
      </header>

      <Segmented
        value={view}
        onChange={setView}
        options={[{ value: "month", label: "Month" }, { value: "list", label: "Upcoming" }]}
      />

      {view === "month" ? (
        <Card className="p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <Button size="sm" variant="ghost" aria-label="Previous month"
                    onClick={() => setCursor(shiftMonth(cursor, -1))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
            </Button>
            <button className="min-h-11 font-bold" title="Return to the current month" onClick={() => setCursor(now.dateISO.slice(0, 7))}>{monthLabel}</button>
            <Button size="sm" variant="ghost" aria-label="Next month"
                    onClick={() => setCursor(shiftMonth(cursor, 1))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase text-faint">
                {d}
              </div>
            ))}
            {grid.map((dateISO) => {
              const inMonth = dateISO.slice(0, 7) === cursor;
              const events = eventsByDate.get(dateISO) ?? [];
              const plans = blocksForDay(data.blocks, dateISO);
              const isToday = dateISO === now.dateISO;
              return (
                <button
                  key={dateISO}
                  aria-label={`${formatDateISO(dateISO, "long")}${events.length ? `, ${events.length} ${events.length === 1 ? "entry" : "entries"}` : ""}${plans.length ? `, ${plans.length} plans` : ""}`}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => setSelected(dateISO)}
                  className={cx(
                    "calendar-cell flex flex-col items-center justify-center gap-2 rounded-xl text-sm transition",
                    !inMonth && "text-faint",
                    isToday ? "bg-brand font-bold text-bg"
                            : selected === dateISO ? "bg-brand-soft font-bold text-brand"
                            : "hover:bg-surface-2",
                  )}
                >
                  <span className="tabular-nums leading-none">{Number(dateISO.slice(8))}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {events.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cx(
                          "h-1.5 w-1.5 rounded-full",
                          isToday ? "bg-white"
                          : e.kind === "exam" ? "bg-[var(--danger)]"
                          : e.kind === "assignment" ? "bg-[var(--warn)]"
                          : e.kind === "holiday" ? "bg-[var(--success)]"
                          : "bg-[var(--brand)]",
                        )}
                      />
                    ))}
                    {plans.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : "bg-brand"}`} />}
                  </span>
                  {events[0] && <span className="hidden max-w-full truncate px-1 text-[9px] font-medium lg:block">{events[0].title}</span>}
                  {!events.length && plans[0] && <span className="hidden max-w-full truncate px-1 text-[10px] lg:block">{plans[0].title}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">{KINDS.map((kind) => <span key={kind.value} className={`tag ${kind.tone}`}>{kind.label}</span>)}</div>
        </Card>
      ) : upcoming.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing coming up"
            body="Add your exams and deadlines here and you'll be reminded ahead of each one."
            action={<Button variant="primary" onClick={() => { setDraftDate(now.dateISO); setEditing("new"); }}>Add an exam</Button>}
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {upcoming.map((e) => {
            const away = daysBetweenISO(now.dateISO, e.on_date);
            return (
              <li key={e.id}>
                <Card className="flex w-full items-center gap-3 p-3">
                  <button onClick={() => setEditing(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={cx("shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold uppercase", toneFor(e.kind))}>
                      {e.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{e.title}</span>
                      <span className="block truncate text-sm text-dim">
                        {formatDateISO(e.on_date)}
                        {e.start_time ? ` · ${formatMinutes(parseTime(e.start_time))}` : ""}
                        {e.location ? ` · ${e.location}` : ""}
                      </span>
                    </span>
                    <span className={cx(
                      "shrink-0 text-right text-xs font-bold tabular-nums",
                      away <= 1 ? "text-danger" : away <= 7 ? "text-warn" : "text-faint",
                    )}>
                      {away === 0 ? "today" : away === 1 ? "tomorrow" : `${away}d`}
                    </span>
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {view === "month" && upcoming.length > 0 && <section><h2 className="section-heading mb-3">Coming up</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{upcoming.slice(0, 3).map((event) => <button key={event.id} onClick={() => setEditing(event)} className="panel p-5 text-left"><span className={`tag ${toneFor(event.kind)}`}>{event.kind}</span><span className="mt-3 block font-semibold">{event.title}</span><span className="mt-2 block text-xs text-dim">{formatDateISO(event.on_date)}{event.start_time ? ` · ${formatMinutes(parseTime(event.start_time))}` : ""}</span></button>)}</div></section>}

      {/* ------------------------------------------------------ day detail */}
      <Sheet
        open={Boolean(selected) && editing === null && !planDraft}
        onClose={() => setSelected(null)}
        title={selected ? formatDateISO(selected, "long") : ""}
        footer={
          <div className="flex gap-2"><Button className="flex-1" onClick={() => { setDraftDate(selected); setEditing("new"); }}>Add event</Button><Button variant="primary" className="flex-1" onClick={() => setPlanDraft({ kind: "activity", on_date: selected ?? now.dateISO })}><Icon name="plus" size={17} />Add plan</Button></div>
        }
      >
        {selected && <DayDetail dateISO={selected} onEdit={setEditing} />}
      </Sheet>

      <EventSheet
        key={editing === null ? "closed" : editing === "new" ? `new:${draftDate ?? selected}` : editing.id}
        target={editing}
        dateISO={draftDate ?? selected ?? now.dateISO}
        onClose={() => { setEditing(null); setDraftDate(null); setSelected(null); }}
      />
      {planDraft && <PlanEditor key={planDraft.id ?? `new:${planDraft.on_date}`} initial={planDraft} onClose={() => setPlanDraft(null)} />}
    </div>
  );

  function DayDetail({ dateISO, onEdit }: { dateISO: string; onEdit: (e: CalendarEvent) => void }) {
    const events = eventsByDate.get(dateISO) ?? [];
    const classes = resolveDay(dateISO, data.slots, data.overrides, subjectsById);
    const plans = blocksForDay(data.blocks, dateISO);

    return (
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-dim">Events & deadlines</h3>
          {events.length === 0 ? (
            <p className="text-sm text-dim">Nothing on this day yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {events.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onEdit(e)}
                    className="calendar-detail-row"
                  >
                    <span className={cx("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase", toneFor(e.kind))}>
                      {e.kind}
                    </span>
                    <span className="min-w-0 flex-1 font-semibold">{e.title}</span>
                    {e.start_time && (
                      <span className="shrink-0 text-xs text-dim">{formatMinutes(parseTime(e.start_time))}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-dim">Classes</h3>
          {classes.length === 0 ? (
            <p className="text-sm text-dim">No classes scheduled.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {classes.map((c) => (
                <li key={c.key} className="calendar-detail-row">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.subject?.color ?? "#94a3b8" }} />
                  <span className="min-w-0 flex-1 font-semibold">{c.subject?.name ?? "Class"}{c.room && <small className="mt-1 block font-normal text-dim">{c.room}</small>}</span>
                  <span className="calendar-detail-time">{formatMinutes(c.startMin)}<small>{formatMinutes(c.endMin)}</small></span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {plans.length > 0 && <section><h3 className="mb-2 text-sm font-semibold text-dim">Your plans</h3><ul>{plans.map((plan) => <li key={plan.id}><button className="calendar-detail-row" onClick={() => setPlanDraft(plan)} aria-label={`Edit plan ${plan.title}`}><Icon name={blockKind(plan) === "meeting" ? "people" : blockKind(plan) === "activity" ? "activity" : "book"} size={18} /><span className="min-w-0 flex-1"><strong className={cx("task-title", plan.done && "is-done")}>{plan.title}</strong><small className="text-dim capitalize">{blockKind(plan)}{plan.location ? ` · ${plan.location}` : ""}</small></span><span className="calendar-detail-time">{plan.start_time ? formatMinutes(parseTime(plan.start_time)) : "Anytime"}<Icon name="chevron" size={14} /></span></button></li>)}</ul></section>}
      </div>
    );
  }
}

function EventSheet({
  target, dateISO, onClose,
}: { target: CalendarEvent | "new" | null; dateISO: string; onClose: () => void }) {
  const { data, addEvent, updateEvent, removeEvent } = useApp();
  const existing = target && target !== "new" ? target : null;

  const [form, setForm] = useState(() => shape(existing, dateISO));
  const [key, setKey] = useState<string | null>(null);
  const signature = target === null ? null : existing ? existing.id : `new:${dateISO}`;
  if (signature !== null && key !== signature) {
    setKey(signature);
    setForm(shape(existing, dateISO));
  }

  return (
    <Sheet
      open={Boolean(target)}
      onClose={onClose}
      title={existing ? "Edit" : "New entry"}
      footer={
        <div className="flex gap-2">
          {existing && (
            <Button variant="danger" onClick={() => { void removeEvent(existing.id); onClose(); }}>
              Delete
            </Button>
          )}
          <Button
            variant="primary"
            className="flex-1"
            disabled={!form.title.trim() || !form.on_date || Boolean(form.start_time && form.end_time && form.end_time <= form.start_time)}
            onClick={() => {
              const payload = {
                title: form.title.trim(),
                kind: form.kind,
                on_date: form.on_date,
                subject_id: form.subject_id || null,
                start_time: form.start_time || null,
                end_time: form.start_time && form.end_time ? form.end_time : null,
                location: form.location || null,
                syllabus: form.syllabus.trim() || null,
                notes: form.notes || null,
              };
              if (existing) void updateEvent(existing.id, payload);
              else void addEvent(payload);
              onClose();
            }}
          >
            {existing ? "Save" : "Add"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title">
          <Input value={form.title} placeholder="e.g. Physics Midterm"
                 onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>

        <Field label="Type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KINDS.map((k) => (
              <button
                key={k.value}
                onClick={() => setForm({ ...form, kind: k.value })}
                aria-pressed={form.kind === k.value}
                className={cx(
                  "min-h-11 rounded-xl px-2 py-2 text-sm font-semibold transition",
                  form.kind === k.value ? "bg-brand text-bg" : "bg-surface-2 text-dim",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Date">
          <Input type="date" value={form.on_date}
                 onChange={(e) => setForm({ ...form, on_date: e.target.value })} />
        </Field>

        <div className="flex gap-3">
          <Field label="Starts" hint="Leave blank for all day">
            <Input type="time" value={form.start_time}
                   onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label="Ends">
            <Input type="time" value={form.end_time} disabled={!form.start_time}
                   onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </Field>
        </div>

        {form.start_time && form.end_time && form.end_time <= form.start_time && <p role="alert" className="text-sm text-danger">The end time must be after the start time.</p>}

        <Field label="Subject">
          <Dropdown
            aria-label="Subject"
            value={form.subject_id}
            onChange={(v) => setForm({ ...form, subject_id: v })}
            options={[{ value: "", label: "No subject" }, ...data.subjects.map((s) => ({ value: s.id, label: s.name, swatch: s.color }))]}
          />
        </Field>

        <Field label="Location">
          <Input value={form.location} placeholder="e.g. Exam Hall B"
                 onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>

        {(form.kind === "exam" || form.kind === "assignment") && (
          <Field
            label="Syllabus"
            hint="One topic per line. You can schedule these on the Planning tab."
          >
            <Textarea
              rows={5}
              value={form.syllabus}
              placeholder={"Kinematics\nNewton's laws\nWork, energy and power"}
              onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
            />
          </Field>
        )}

        <Field label="Notes">
          <Textarea value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}

function shape(e: CalendarEvent | null, fallbackDate: string) {
  return {
    title: e?.title ?? "",
    kind: (e?.kind ?? "exam") as EventKind,
    on_date: e?.on_date ?? fallbackDate,
    subject_id: e?.subject_id ?? "",
    start_time: e?.start_time ? e.start_time.slice(0, 5) : "",
    end_time: e?.end_time ? e.end_time.slice(0, 5) : "",
    location: e?.location ?? "",
    syllabus: e?.syllabus ?? "",
    notes: e?.notes ?? "",
  };
}

function describeGap(days: number): string {
  if (days <= 0) return "next one today";
  if (days === 1) return "next one tomorrow";
  return `next one in ${days} days`;
}

/** Six Sunday-anchored weeks covering the month — a stable 42-cell grid. */
function buildMonth(yyyymm: string): string[] {
  const first = `${yyyymm}-01`;
  const start = addDaysISO(first, -weekdayOfISO(first));
  return Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
}

function shiftMonth(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
