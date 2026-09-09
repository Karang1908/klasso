"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button, Card, EmptyState, Input, Segmented, cx } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PlanEditor, type PlanDraft } from "@/components/PlanEditor";
import { useAppHref } from "@/components/AppShell";
import { LaunchScreen } from "@/components/LaunchScreen";
import { BLOCK_KINDS, blockForTopic, blockKind, blocksForDay, examPlans, findClashes, plannedMinutes, weekStart } from "@/lib/planning";
import { resolveDay } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { addDaysISO, daysBetweenISO, formatDateISO, formatDuration, formatMinutes, parseTime, WEEKDAY_SHORT } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import type { BlockKind } from "@/lib/types";

export default function PlanningPage() { return <Suspense fallback={<LaunchScreen label="Opening your plan" />}><PlanRoute /></Suspense>; }
function PlanRoute() {
  const query = useSearchParams();
  const { data } = useApp();
  const now = useNow(60_000);
  const supplied = query.get("date");
  const date = supplied && /^\d{4}-\d{2}-\d{2}$/.test(supplied) && Number.isFinite(Date.parse(supplied)) ? supplied : now.dateISO;
  const kind = query.get("new") as BlockKind | null;
  const initial = data.blocks.find((block) => block.id === query.get("edit")) ?? (kind && BLOCK_KINDS.some((item) => item.value === kind) ? { kind, on_date: date } : null);
  return <PlanningWorkspace key={`${date}:${query.get("edit")}:${kind}`} initialDate={date} initialDraft={initial} />;
}

function PlanningWorkspace({ initialDate, initialDraft }: { initialDate: string; initialDraft: PlanDraft | null }) {
  const { data, subjectsById, toggleBlock } = useApp();
  const href = useAppHref();
  const now = useNow(60_000);
  const [view, setView] = useState<"schedule" | "syllabus">("schedule");
  const [date, setDate] = useState(initialDate);
  const [draft, setDraft] = useState<PlanDraft | null>(initialDraft);
  const dayBlocks = blocksForDay(data.blocks, date);
  const dayClasses = resolveDay(date, data.slots, data.overrides, subjectsById);
  const clashes = findClashes(dayBlocks, dayClasses);
  const plans = examPlans(data.events, data.blocks);
  const week = weekStart(date);
  const agenda = [
    ...dayClasses.map((entry) => ({ key: entry.key, start: entry.startMin, class: entry, block: null })),
    ...dayBlocks.map((entry) => ({ key: entry.id, start: entry.start_time ? parseTime(entry.start_time) : 1441, class: null, block: entry })),
  ].sort((a, b) => a.start - b.start);
  const done = dayBlocks.filter((block) => block.done).length;
  const deadlines = data.events.filter((event) => event.on_date >= date && ["exam", "assignment"].includes(event.kind)).sort((a, b) => a.on_date.localeCompare(b.on_date)).slice(0, 4);
  const add = (kind: BlockKind = "study") => setDraft({ kind, on_date: date });

  return <div className="page-stack planning-page">
    <header className="planning-heading"><div><h1 className="page-heading">A plan that makes room.</h1><p className="page-subtitle">Classes, study, and the rest of your life. Together.</p></div><Button variant="primary" onClick={() => add()}><Icon name="plus" size={18} />Add plan</Button></header>
    <div className="planning-toolbar"><Segmented value={view} onChange={setView} options={[{ value: "schedule", label: "Day plan" }, { value: "syllabus", label: "Exam preparation" }]} />
      <div className="date-navigation"><Button variant="ghost" aria-label="Previous week" onClick={() => setDate(addDaysISO(date, -7))}><Icon name="back" size={18} /></Button><Input type="date" aria-label="Planning date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /><Button variant="ghost" aria-label="Next week" onClick={() => setDate(addDaysISO(date, 7))}><Icon name="chevron" size={18} /></Button><Button variant="secondary" onClick={() => setDate(now.dateISO)}>Today</Button></div>
    </div>
    {view === "schedule" ? <>
      <div className="day-strip" aria-label="Planning week">{Array.from({ length: 7 }, (_, i) => {
        const current = addDaysISO(week, i);
        const count = data.blocks.filter((block) => block.on_date === current && !block.done).length;
        return <button className="day-button" key={current} aria-label={formatDateISO(current, "long")} aria-pressed={current === date} aria-current={current === now.dateISO ? "date" : undefined} onClick={() => setDate(current)}><span className="text-xs">{WEEKDAY_SHORT[new Date(`${current}T12:00:00`).getDay()]}</span><strong>{Number(current.slice(8))}</strong><span className={cx("h-1 w-1 rounded-full", count ? "bg-current" : "bg-current/20")} /></button>;
      })}</div>
      <div className="planning-grid">
        <Card className="agenda-panel">
          <header className="agenda-heading"><div><h2 className="section-heading">{date === now.dateISO ? "Today, at a glance" : formatDateISO(date, "long")}</h2><p>{dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"} · {dayBlocks.length} {dayBlocks.length === 1 ? "plan" : "plans"}{plannedMinutes(dayBlocks) > 0 && ` · ${formatDuration(plannedMinutes(dayBlocks))} planned`}</p></div><span className="agenda-date"><strong>{Number(date.slice(8))}</strong><span>{new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { month: "short" })}</span></span></header>
          {!agenda.length ? <EmptyState icon={<Icon name="sun" size={32} />} title="A little space in your day." body="Add a study session, an activity or a meeting. You don’t need to plan every minute." action={<Button onClick={() => add()} variant="primary">Make your first plan</Button>} /> :
            <ul className="agenda-list"><AnimatePresence initial={false}>{agenda.map((item) => {
              const block = item.block;
              const c = item.class;
              const kind = block ? blockKind(block) : "class";
              const end = c?.endMin ?? (block?.end_time ? parseTime(block.end_time) : null);
              const title = c?.subject?.name ?? c?.kind ?? block!.title;
              const subject = c?.subject ?? (block?.subject_id ? subjectsById.get(block.subject_id) : undefined);
              return <motion.li layout="position" key={item.key} initial={false} exit={{ opacity: 0 }} className="agenda-row" data-kind={kind}>
                <div className="agenda-time">{item.start < 1441 ? <><strong>{formatMinutes(item.start)}</strong>{end !== null && <span>{formatMinutes(end)}</span>}</> : <span>Anytime</span>}</div>
                <div className="agenda-item">
                  <span className={`agenda-symbol ${kind}`}><Icon name={kind === "class" || kind === "study" ? "book" : kind === "meeting" ? "people" : "activity"} size={19} /></span>
                  <div className="agenda-copy">{block ? <button className={cx("agenda-title", block.done && "is-done")} aria-label={`Edit plan ${title}`} onClick={() => setDraft(block)}>{title}</button> : <h3 className="agenda-title">{title}</h3>}
                    <p className="agenda-meta"><span>{kind === "class" ? "Class" : BLOCK_KINDS.find((k) => k.value === kind)?.label}</span>{subject && <span>{subject.short_name ?? subject.name}</span>}{(c?.room || block?.location) && <span>{c?.room || block?.location}</span>}</p>
                    {block?.people && <p className="agenda-meta"><Icon name="people" size={13} />{block.people}</p>}
                    {block && clashes.has(block.id) && <p className="agenda-clash"><Icon name="clock" size={13} />{clashes.get(block.id)}</p>}
                  </div>
                  {block && <button className="task-check" aria-pressed={block.done} aria-label={`Mark ${block.title} ${block.done ? "not done" : "done"}`} onClick={() => void toggleBlock(block.id)}><span>{block.done && <Icon name="check" size={14} />}</span></button>}
                </div>
              </motion.li>;
            })}</AnimatePresence></ul>}
          {dayBlocks.length > 0 && <footer className="agenda-footer"><Icon name="check" size={16} /><span aria-live="polite">{done} of {dayBlocks.length} plans completed</span><span>{dayBlocks.length === done ? "All set for the day." : "One thing at a time."}</span></footer>}
        </Card>
        <aside className="planning-aside">
          <section className="plan-quick-actions"><h2 className="section-heading">Make time for</h2><p className="text-sm text-dim">What belongs in your day?</p>{BLOCK_KINDS.map((kind) => <button key={kind.value} onClick={() => add(kind.value)}><span className={`agenda-symbol ${kind.value}`}><Icon name={kind.value === "study" ? "book" : kind.value === "meeting" ? "people" : "activity"} /></span><span>{kind.value === "study" ? "A study session" : kind.value === "activity" ? "An activity" : "A meeting"}</span><Icon name="plus" size={18} /></button>)}</section>
          <section className="planning-deadlines"><h2 className="section-heading">Coming into focus</h2>{deadlines.length ? <ul>{deadlines.map((event) => <li key={event.id}><Link href={href("/calendar")}><span className="deadline-date">{formatDateISO(event.on_date)}</span><strong>{event.title}</strong><span className="text-xs text-dim">{daysBetweenISO(date, event.on_date) === 0 ? "Due this day" : `${daysBetweenISO(date, event.on_date)} ${daysBetweenISO(date, event.on_date) === 1 ? "day" : "days"} to go`}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-dim">No upcoming deadlines. Keep some space for yourself.</p>}<Link href={href("/calendar")} className="section-link">Open calendar <Icon name="arrow" size={16} /></Link></section>
        </aside>
      </div>
    </> : plans.length === 0 ? <Card><EmptyState icon={<Icon name="book" size={32} />} title="Turn your syllabus into a plan." body="Add an exam or assignment in Calendar, then list its topics. Schedule each topic here, one session at a time." action={<Link className="section-link" href={href("/calendar")}>Open calendar <Icon name="arrow" size={17} /></Link>} /></Card> :
      <div className="syllabus-grid">{plans.map((plan) => <Card key={plan.event.id} className="syllabus-plan"><header><div><h2 className="section-heading">{plan.event.title}</h2><p>{formatDateISO(plan.event.on_date)} · {plan.done} of {plan.topics.length} topics completed</p></div><span className="tag bg-brand-soft text-brand">{plan.scheduled}/{plan.topics.length} scheduled</span></header><div className="syllabus-progress"><span style={{ width: `${plan.coverage * 100}%` }} /></div><ul>{plan.topics.map((topic) => {
        const block = blockForTopic(data.blocks, plan.event.id, topic);
        return <li key={topic}><span className={cx("syllabus-state", block?.done && "is-done")}><Icon name={block?.done ? "check" : block ? "clock" : "book"} size={16} /></span><span className="min-w-0 flex-1"><strong className={cx("task-title", block?.done && "is-done")}>{topic}</strong>{block && <small className="text-dim">{formatDateISO(block.on_date)}{block.start_time && ` · ${formatMinutes(parseTime(block.start_time))}`}</small>}</span><Button variant="ghost" size="sm" onClick={() => setDraft(block ?? { kind: "study", title: topic, on_date: date, event_id: plan.event.id, subject_id: plan.event.subject_id })}>{block ? "Edit" : "Schedule"}<Icon name="arrow" size={14} /></Button></li>;
      })}</ul></Card>)}</div>}
    {draft && <PlanEditor key={draft.id ?? `${draft.kind}:${draft.title ?? "new"}:${draft.on_date}`} initial={draft} onClose={() => setDraft(null)} />}
  </div>;
}
