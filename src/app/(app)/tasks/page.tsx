"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Icon } from "@/components/icons";
import { TaskRow } from "@/components/TaskRow";
import { Banner, Button, Card, EmptyState, Field, Input, Segmented, Dropdown, Sheet, Spinner, Textarea } from "@/components/ui";
import { useApp } from "@/lib/store";
import { addDaysISO, formatDateISO, localDateISO } from "@/lib/time";
import { inTaskScope, sortTasks } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";
import type { Task, TaskScope } from "@/lib/types";

export default function TasksPage() { return <Suspense><TaskRoute /></Suspense>; }
function TaskRoute() {
  const params = useSearchParams();
  const date = params.get("date");
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00`));
  return <TaskWorkspace key={`${params.get("list")}:${date}`} initialList={params.get("list") === "master" ? "master" : "daily"} initialDate={validDate ? date : localDateISO()} />;
}

function TaskWorkspace({ initialList, initialDate }: { initialList: "daily" | "master"; initialDate: string }) {
  const { data, addTask, clearCompletedTasks, removeTask } = useApp();
  const now = useNow(30_000);
  const [list, setList] = useState(initialList);
  const [dayOffset, setDayOffset] = useState(() => Math.round((Date.parse(`${initialDate}T12:00:00Z`) - Date.parse(`${now.dateISO}T12:00:00Z`)) / 86400000));
  const date = addDaysISO(now.dateISO, dayOffset);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<"all" | "done" | null>(null);
  const scope: TaskScope = list === "master" ? { kind: "master" } : { kind: "daily", date };
  const scoped = data.tasks.filter((task) => inTaskScope(task, scope));
  const completed = scoped.filter((task) => task.done).length;
  const visible = sortTasks(scoped.filter((task) => (filter === "all" || task.done === (filter === "done")) && `${task.title} ${task.notes ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  const dailyOpen = data.tasks.filter((task) => !task.done && inTaskScope(task, { kind: "daily", date })).length;
  const masterOpen = data.tasks.filter((task) => !task.done && inTaskScope(task, { kind: "master" })).length;
  const clearLabel = list === "master" ? "master list" : `daily list for ${formatDateISO(date)}`;

  return <div className="page-stack">
    <header><h1 className="page-heading">A little less on your mind.</h1><p className="page-subtitle">Plan the day. Keep the bigger picture.</p></header>
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Task lists">
      <button className="task-list-choice panel flex items-center gap-3 px-5 py-4 text-left" aria-pressed={list === "daily"} onClick={() => setList("daily")}><Icon name="sun" size={23} /><span className="flex-1"><strong className="block font-semibold">Daily</strong><span className="text-xs text-dim">One day at a time</span></span><span className="text-xl font-semibold tabular-nums">{dailyOpen}</span></button>
      <button className="task-list-choice panel flex items-center gap-3 px-5 py-4 text-left" aria-pressed={list === "master"} onClick={() => setList("master")}><Icon name="infinity" size={23} /><span className="flex-1"><strong className="block font-semibold">Master</strong><span className="text-xs text-dim">Stays until you clear it</span></span><span className="text-xl font-semibold tabular-nums">{masterOpen}</span></button>
    </div>
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="section-heading">{list === "daily" ? dayOffset === 0 ? "Today’s to-dos" : formatDateISO(date, "long") : "Your master list"}</h2><p className="mt-1 text-xs text-dim">{list === "daily" ? "Every day gets its own list. Previous days are saved." : "No resets. No expiry. Everything stays in your hands."}</p></div>
        {list === "daily" && <div className="flex w-full min-w-0 flex-wrap items-center gap-1"><Button size="sm" variant="ghost" aria-label="Previous day" onClick={() => setDayOffset(dayOffset - 1)}><Icon name="back" size={16} /></Button><Input className="w-full min-w-0 flex-1 basis-28 text-sm" type="date" aria-label="Daily list date" value={date} onChange={(event) => { if (event.target.value) setDayOffset(Math.round((Date.parse(`${event.target.value}T12:00:00Z`) - Date.parse(`${now.dateISO}T12:00:00Z`)) / 86400000)); }} /><Button size="sm" variant="ghost" aria-label="Next day" onClick={() => setDayOffset(dayOffset + 1)}><Icon name="chevron" size={16} /></Button>{dayOffset !== 0 && <Button size="sm" variant="ghost" onClick={() => setDayOffset(0)}>Today</Button>}</div>}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); if (!draft.trim() || busy) return; setBusy(true); try {
        const saved = await addTask({ title: draft.trim(), list_kind: list, planned_date: list === "daily" ? date : null, due_date: list === "daily" ? date : null });
        if (saved) { setDraft(""); setFilter("all"); setQuery(""); }
      } finally { setBusy(false); } }}><Input aria-label="New task" placeholder={list === "daily" ? "Add a task for this day" : "Add to your master list"} value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)} /><Button type="submit" variant="primary" disabled={busy || !draft.trim()}>{busy ? <Spinner /> : <Icon name="plus" size={18} />}<span className="hidden sm:inline">Add task</span><span className="sr-only sm:hidden">Add task</span></Button></form>
      <div className="mb-2 mt-5 flex flex-wrap gap-3"><div className="min-w-0 flex-1 basis-60"><Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: `All (${scoped.length})` }, { value: "open", label: `Open (${scoped.length - completed})` }, { value: "done", label: `Done (${completed})` }]} /></div>{scoped.length > 5 && <Input className="sm:max-w-56" type="search" aria-label="Search tasks" placeholder="Find a task" value={query} onChange={(event) => setQuery(event.target.value)} />}</div>
      {visible.length ? <ul><AnimatePresence initial={false}>{visible.map((task) => <TaskRow key={task.id} task={task} dateISO={now.dateISO} onEdit={() => setEditing(task)} />)}</AnimatePresence></ul> : <EmptyState icon={<Icon name={filter === "done" ? "check" : list === "daily" ? "sun" : "infinity"} size={30} />} title={query ? "No matching tasks" : filter === "done" ? "Your first checkmark is waiting" : filter === "open" ? "Everything is checked off" : list === "daily" ? "Start with one small thing" : "Space for the bigger picture"} body={query ? "Try a shorter search, or clear it to see the list." : list === "daily" ? "Add a task above. You can give it a subject, time or priority afterward." : "Assignments, ideas, errands — add anything you want to keep track of."} />}
      {scoped.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4"><span className="text-xs text-dim" aria-live="polite">{completed} of {scoped.length} completed</span><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" disabled={!completed} onClick={() => setConfirm("done")}>Clear completed</Button><Button size="sm" variant="ghost" onClick={() => setConfirm("all")}>Clear this list</Button></div></div>}
    </Card>
    {editing && <TaskEditor key={editing.id} task={editing} today={now.dateISO} onClose={() => setEditing(null)} />}
    <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === "done" ? "Clear completed tasks?" : "Clear this list?"} footer={<div className="flex gap-2"><Button className="flex-1" onClick={() => setConfirm(null)}>Keep tasks</Button><Button className="flex-1" variant="danger" disabled={busy} onClick={async () => { setBusy(true); try { if (confirm === "done") await clearCompletedTasks(scope); else for (const task of scoped) await removeTask(task.id); setConfirm(null); } finally { setBusy(false); } }}>{busy ? "Clearing…" : `Delete ${confirm === "done" ? completed : scoped.length}`}</Button></div>}><p className="text-sm leading-relaxed text-dim">Permanently delete {confirm === "done" ? "completed tasks" : "all tasks"} from your {clearLabel}? Other lists and dates are untouched. This cannot be undone.</p></Sheet>
  </div>;
}

function TaskEditor({ task, today, onClose }: { task: Task; today: string; onClose: () => void }) {
  const { data, updateTask, removeTask } = useApp();
  const [form, setForm] = useState({ title: task.title, notes: task.notes ?? "", subject_id: task.subject_id ?? "", list_kind: task.list_kind ?? "master", planned_date: task.planned_date ?? today, due_date: task.due_date ?? "", due_time: task.due_time?.slice(0, 5) ?? "", priority: task.priority });
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  return <Sheet open onClose={onClose} title="Task details" footer={<div className="flex gap-2"><Button variant="danger" onClick={() => setDeleting(true)}>Delete</Button><Button variant="primary" className="flex-1" disabled={busy || !form.title.trim() || (form.list_kind === "daily" && !form.planned_date)} onClick={async () => { setBusy(true); try { await updateTask(task.id, { title: form.title.trim(), notes: form.notes || null, subject_id: form.subject_id || null, list_kind: form.list_kind, planned_date: form.list_kind === "daily" ? form.planned_date : null, due_date: form.due_date || null, due_time: form.due_date && form.due_time ? form.due_time : null, priority: form.priority }); onClose(); } finally { setBusy(false); } }}>{busy ? "Saving…" : "Save changes"}</Button></div>}>
    <div className="space-y-4">
      <Field label="Task"><Input value={form.title} maxLength={500} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
      <Field label="List"><Dropdown aria-label="List" value={form.list_kind} onChange={(v) => setForm({ ...form, list_kind: v as "master" | "daily" })} options={[{ value: "daily", label: "Daily — plan for a date" }, { value: "master", label: "Master — keep indefinitely" }]} /></Field>
      {form.list_kind === "daily" && <Field label="Planned for" hint="Moving the date keeps the same task and its completion status."><Input type="date" value={form.planned_date} onChange={(event) => setForm({ ...form, planned_date: event.target.value })} /></Field>}
      <div className="flex gap-3"><Field label="Due date"><Input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></Field><Field label="Due time"><Input type="time" value={form.due_time} disabled={!form.due_date} onChange={(event) => setForm({ ...form, due_time: event.target.value })} /></Field></div>
      <div className="flex gap-3"><Field label="Subject"><Dropdown aria-label="Subject" value={form.subject_id} onChange={(v) => setForm({ ...form, subject_id: v })} options={[{ value: "", label: "No subject" }, ...data.subjects.map((s) => ({ value: s.id, label: s.name, swatch: s.color }))]} /></Field><Field label="Priority"><Dropdown aria-label="Priority" value={String(form.priority)} onChange={(v) => setForm({ ...form, priority: Number(v) })} options={[{ value: "0", label: "Low" }, { value: "1", label: "Normal" }, { value: "2", label: "High" }]} /></Field></div>
      <Field label="Notes"><Textarea placeholder="Details, links, or a reminder to yourself" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
      {deleting && <Banner tone="danger"><p>Delete this task permanently?</p><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => setDeleting(false)}>Keep</Button><Button size="sm" variant="danger" onClick={async () => { await removeTask(task.id); onClose(); }}>Delete task</Button></div></Banner>}
    </div>
  </Sheet>;
}
