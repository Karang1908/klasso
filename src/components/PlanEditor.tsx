"use client";

import { useId, useState } from "react";
import { Banner, Button, Confirm, Dropdown, Field, Input, Sheet, Textarea } from "./ui";
import { Icon } from "./icons";
import { useApp } from "@/lib/store";
import { BLOCK_KINDS, blockKind, blocksForDay, findClashes, validatePlan } from "@/lib/planning";
import { resolveDay } from "@/lib/schedule";
import { formatDateISO, parseTime, toTimeString } from "@/lib/time";
import type { BlockKind, StudyBlock } from "@/lib/types";

export type PlanDraft = Partial<StudyBlock> & { on_date: string };

/** One editor for Planning, Calendar and Timetable, so validation cannot drift. */
export function PlanEditor({ initial, onClose }: { initial: PlanDraft; onClose: () => void }) {
  const { data, subjectsById, addBlock, updateBlock, removeBlock } = useApp();
  const formId = useId();
  const [form, setForm] = useState({
    title: initial.title ?? "", kind: initial.kind ?? "study" as BlockKind, on_date: initial.on_date,
    start_time: initial.start_time?.slice(0, 5) ?? "", end_time: initial.end_time?.slice(0, 5) ?? "",
    subject_id: initial.subject_id ?? "", event_id: initial.event_id ?? "", location: initial.location ?? "",
    people: initial.people ?? "", notes: initial.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const change = (patch: Partial<typeof form>) => { setForm((previous) => ({ ...previous, ...patch })); setDirty(true); setError(null); };
  const validation = validatePlan(form);
  const candidate = { ...initial, ...form, id: initial.id ?? "draft", done: initial.done ?? false, position: 0 } as StudyBlock;
  const classes = !validation?.includes("date") ? resolveDay(form.on_date, data.slots, data.overrides, subjectsById) : [];
  const clash = !validation ? findClashes([...blocksForDay(data.blocks, form.on_date).filter((block) => block.id !== initial.id), candidate], classes).get(candidate.id) : undefined;
  const linkedEvent = data.events.find((event) => event.id === form.event_id);
  const dismiss = () => { if (busy) return; if (dirty) setDiscarding(true); else onClose(); };
  const save = async () => {
    if (busy || validation) return;
    setBusy(true); setError(null);
    const payload = { ...form, title: form.title.trim(), start_time: form.start_time || null, end_time: form.end_time || null,
      subject_id: form.subject_id || null, event_id: form.kind === "study" ? form.event_id || null : null,
      location: form.location.trim() || null, people: form.kind === "meeting" ? form.people.trim() || null : null, notes: form.notes.trim() || null };
    try {
      const saved = initial.id ? await updateBlock(initial.id, payload) : await addBlock(payload);
      if (saved) onClose(); else setError("Your plan wasn’t saved. Your details are still here — check your connection and try again.");
    } catch { setError("Couldn’t reach your workspace. Your details are still here. Try again when you’re connected."); }
    finally { setBusy(false); }
  };
  const confirm = <>
    <Confirm
      open={discarding}
      title="Discard your changes?"
      body="This plan has edits that have not been saved."
      cancelLabel="Keep editing" confirmLabel="Discard changes"
      onCancel={() => setDiscarding(false)} onConfirm={onClose}
    />
    <Confirm
      open={deleting}
      title={`Delete this ${blockKind(candidate)} plan?`}
      body="This cannot be undone."
      cancelLabel="Keep plan" confirmLabel="Delete plan" busy={busy}
      onCancel={() => setDeleting(false)}
      onConfirm={async () => {
        setBusy(true);
        try {
          if (initial.id && await removeBlock(initial.id)) onClose();
          else setError("Couldn’t delete this plan. Please try again.");
        } catch { setError("Couldn’t delete this plan. Please try again."); }
        finally { setBusy(false); }
      }}
    />
  </>;

  return <Sheet open confirm={confirm} title={initial.id ? "Edit your plan" : "Make a little time"} onClose={dismiss} footer={
    <div className="flex items-center gap-2">
      <Button variant={initial.id ? "danger" : "ghost"} disabled={busy} onClick={() => initial.id ? setDeleting(true) : dismiss()}>{initial.id ? "Delete" : "Cancel"}</Button>
      <Button type="submit" form={formId} variant="primary" className="flex-1" disabled={busy || Boolean(validation)}>{busy ? "Saving…" : initial.id ? "Save changes" : "Add to plan"}</Button>
    </div>}>
    <form id={formId} onSubmit={(event) => { event.preventDefault(); void save(); }} className="plan-form">
      {error && <Banner tone="danger">{error}</Banner>}
      <div role="group" aria-label="Plan type" className="plan-types">
        {BLOCK_KINDS.map((kind) => <button key={kind.value} type="button" aria-pressed={form.kind === kind.value}
          onClick={() => change({ kind: kind.value, event_id: kind.value === "study" ? form.event_id : "" })}>
          <Icon name={kind.value === "study" ? "book" : kind.value === "meeting" ? "people" : "activity"} size={21} /><span>{kind.label}</span>
        </button>)}
      </div>
      <Field label={form.kind === "meeting" ? "Meeting name" : form.kind === "activity" ? "Activity" : "What are you studying?"}>
        <Input aria-label="Plan title" required maxLength={200} value={form.title} placeholder={form.kind === "meeting" ? "Project catch-up" : form.kind === "activity" ? "A run before dinner" : "Work through the practice questions"} onChange={(event) => change({ title: event.target.value })} />
      </Field>
      <Field label="Date"><Input type="date" required aria-label="Plan date" value={form.on_date} onChange={(event) => change({ on_date: event.target.value })} /></Field>
      <div className="form-pair">
        <Field label="Start time" hint="Leave both blank for anytime"><Input type="time" aria-label="Plan start time" value={form.start_time} onChange={(event) => change({ start_time: event.target.value, ...(!event.target.value ? { end_time: "" } : {}) })} /></Field>
        <Field label="End time"><Input type="time" aria-label="Plan end time" disabled={!form.start_time} value={form.end_time} onChange={(event) => change({ end_time: event.target.value })} /></Field>
      </div>
      {form.start_time && <div className="duration-options" role="group" aria-label="Quick duration"><span>Make time for</span>{[30, 60, 90].map((minutes) => <button key={minutes} type="button" disabled={parseTime(form.start_time) + minutes >= 1440} onClick={() => change({ end_time: toTimeString(parseTime(form.start_time) + minutes) })} aria-pressed={Boolean(form.end_time && parseTime(form.end_time) - parseTime(form.start_time) === minutes)}>{minutes} min</button>)}</div>}
      {validation && form.title && <p role="status" className="text-sm text-danger">{validation}</p>}
      {clash && <Banner tone="warn"><span className="font-semibold">{clash}.</span> You can still save this time or choose another.</Banner>}
      {form.kind === "study" && linkedEvent && form.on_date > linkedEvent.on_date && <Banner tone="warn">This study session is after {formatDateISO(linkedEvent.on_date)}, the date of your {linkedEvent.kind}.</Banner>}
      <div className="form-pair">
        <Field label="Subject"><Dropdown aria-label="Plan subject" value={form.subject_id} onChange={(value) => change({ subject_id: value })} options={[{ value: "", label: "No subject" }, ...data.subjects.map((subject) => ({ value: subject.id, label: subject.name, swatch: subject.color }))]} /></Field>
        {form.kind === "study" ? <Field label="Exam or assignment"><Dropdown aria-label="Linked exam or assignment" value={form.event_id} onChange={(value) => change({ event_id: value, subject_id: data.events.find((event) => event.id === value)?.subject_id ?? form.subject_id })} options={[{ value: "", label: "Not linked" }, ...data.events.filter((event) => ["exam", "assignment"].includes(event.kind)).map((event) => ({ value: event.id, label: event.title, hint: formatDateISO(event.on_date) }))]} /></Field>
          : <Field label="Location"><Input aria-label="Plan location" value={form.location} maxLength={300} placeholder="A room, place or video link" onChange={(event) => change({ location: event.target.value })} /></Field>}
      </div>
      {form.kind === "meeting" && <Field label="Who’s joining?"><Input aria-label="Meeting participants" value={form.people} maxLength={500} placeholder="Project group, tutor, friends…" onChange={(event) => change({ people: event.target.value })} /></Field>}
      <details className="plan-details" open={form.notes ? true : undefined}><summary>Notes & details <span>Optional</span></summary><Textarea aria-label="Plan notes" value={form.notes} placeholder="Anything you’ll want to remember" onChange={(event) => change({ notes: event.target.value })} /></details>
    </form>
  </Sheet>;
}
