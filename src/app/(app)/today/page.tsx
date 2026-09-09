"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { ClassRow } from "@/components/ClassRow";
import { DayEditor } from "@/components/DayEditor";
import { useAppHref } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { TaskRow } from "@/components/TaskRow";
import { BlockRow } from "@/components/BlockRow";
import { Banner, Button, Card, EmptyState } from "@/components/ui";
import { dayCancelledNote, dayStatus, findGaps, resolveDay } from "@/lib/schedule";
import { inTaskScope, sortTasks, tasksForDay } from "@/lib/tasks";
import { blocksForDay } from "@/lib/planning";
import { useApp } from "@/lib/store";
import { addDaysISO, daysBetweenISO, formatDateISO, formatDuration, formatMinutes, WEEKDAY_SHORT, weekdayOfISO } from "@/lib/time";
import { useNow } from "@/lib/useNow";

export default function TodayPage() {
  const { data, subjectsById, setAttendance, removeOverride } = useApp();
  const now = useNow();
  const href = useAppHref();
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [sheet, setSheet] = useState(false);
  const dateISO = addDaysISO(now.dateISO, offset);
  const isToday = offset === 0;
  const classes = resolveDay(dateISO, data.slots, data.overrides, subjectsById);
  const status = dayStatus(classes, isToday ? now.minutes : -1);
  const holiday = dayCancelledNote(dateISO, data.overrides);
  const gaps = findGaps(classes);
  const weekStart = addDaysISO(dateISO, -((weekdayOfISO(dateISO) + 6) % 7));
  const daily = sortTasks(data.tasks.filter((t) => inTaskScope(t, { kind: "daily", date: dateISO })));
  const due = tasksForDay(data.tasks, dateISO).filter((t) => t.list_kind !== "daily");
  // Planned study blocks share the day's list — that is where the owner looks.
  const planBlocks = blocksForDay(data.blocks, dateISO);
  const upcoming = [...data.events].filter((e) => e.on_date >= dateISO).sort((a, b) => a.on_date.localeCompare(b.on_date)).slice(0, 3);
  const name = data.profile?.display_name?.split(" ")[0];
  const greeting = now.at.getHours() < 12 ? "Good morning" : now.at.getHours() < 17 ? "Good afternoon" : "Good evening";

  return <div className="page-stack">
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div><h1 className="page-heading">{isToday ? `${greeting}${name ? `, ${name}` : ""}` : formatDateISO(dateISO, "long")}</h1><p className="page-subtitle">{isToday ? "A little structure. More room for life." : "Your plan for this day, all in one place."}</p></div>
      <time dateTime={dateISO} className="pb-1 text-xs font-semibold text-dim">{formatDateISO(dateISO)}</time>
    </header>

    <LiveClass status={status} nowMin={isToday ? now.minutes : -1} holiday={holiday} isToday={isToday} />

    <section aria-label="Choose a day">
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-dim">{new Date(`${dateISO}T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span><div className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="Previous week" onClick={() => setOffset(offset - 7)}><Icon name="back" size={15} /></Button>{!isToday && <Button size="sm" variant="ghost" onClick={() => setOffset(0)}>Today</Button>}<Button size="sm" variant="ghost" aria-label="Next week" onClick={() => setOffset(offset + 7)}><Icon name="chevron" size={15} /></Button></div></div>
      <div className="day-strip">{Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)).map((d) => <button key={d} className="day-button" aria-label={formatDateISO(d, "long")} aria-pressed={d === dateISO} onClick={() => setOffset(daysBetweenISO(now.dateISO, d))}><span className="text-[10px] font-semibold uppercase">{WEEKDAY_SHORT[weekdayOfISO(d)]}</span><strong>{Number(d.slice(8))}</strong><span className="h-1 w-1 rounded-full bg-current" style={{ opacity: resolveDay(d, data.slots, data.overrides, subjectsById).length ? .85 : .18 }} /></button>)}</div>
    </section>

    {holiday && <Banner tone="warn"><div className="flex items-center justify-between gap-3"><span>{holiday}</span><Button variant="ghost" size="sm" onClick={() => { const o = data.overrides.find((x) => x.on_date === dateISO && x.kind === "cancel_day"); if (o) void removeOverride(o.id); }}>Restore classes</Button></div></Banner>}

    <div className="dashboard-grid">
      <Card as="section" className="px-5 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3"><h2 className="section-heading">Your schedule</h2><button className="section-link" onClick={() => setSheet(true)}>Edit day<Icon name="arrow" size={16} /></button></div>
        {classes.length === 0 ? <EmptyState icon={<Icon name="coffee" size={28} />} title={holiday ? "A day to yourself" : "Your day is open"} body="Add your weekly classes, or use Edit day for a one-off." action={<Link className="section-link" href={href("/timetable")}>Set up timetable<Icon name="arrow" size={16} /></Link>} /> : <ul>{classes.map((c) => {
          const gap = gaps.find((g) => g.endMin === c.startMin);
          return <Fragment key={c.key}>{gap && <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-3 text-xs text-dim"><Icon name="coffee" size={17} /><span><strong className="font-semibold text-ink">{formatDuration(gap.endMin - gap.startMin)} free</strong> · {formatMinutes(gap.startMin)}–{formatMinutes(gap.endMin)}</span></li>}
            <ClassRow occurrence={c} state={!isToday ? "upcoming" : now.minutes >= c.endMin ? "past" : now.minutes >= c.startMin ? "now" : "upcoming"}
              attendance={data.attendance.find((a) => a.on_date === dateISO && a.occurrence_key === c.occKey)?.status}
              onAttendance={(state) => { if (c.subjectId) void setAttendance({ subjectId: c.subjectId, slotId: c.slotId, occKey: c.occKey, date: dateISO, status: state }); }} />
          </Fragment>;
        })}</ul>}
        {classes.length > 0 && <p className="mb-2 mt-1 border-t border-line py-3 text-xs text-dim">{classes.length} classes · College ends at <strong className="font-semibold text-ink">{formatMinutes(status.endsAtMin ?? 0)}</strong></p>}
      </Card>

      <div className="flex min-w-0 flex-col gap-5">
        <Card as="section" className="px-5 pb-3 pt-4"><div className="flex items-center justify-between gap-3"><h2 className="section-heading">Daily tasks</h2><Link href={href(`/tasks?list=daily&date=${dateISO}`)} className="section-link">View all<Icon name="arrow" size={16} /></Link></div>
          {daily.length || planBlocks.length ? <><p className="mb-1 text-xs text-dim">{daily.filter((t) => t.done).length + planBlocks.filter((b) => b.done).length} of {daily.length + planBlocks.length} completed</p><ul>{planBlocks.map((block) => <BlockRow key={block.id} block={block} />)}<AnimatePresence initial={false}>{daily.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} dateISO={now.dateISO} onEdit={() => router.push(href(`/tasks?list=daily&date=${dateISO}`))} />)}</AnimatePresence></ul></> : <EmptyState title="Nothing planned for this day" body="Add a task, or plan study time from the Planning tab." action={<Link href={href(`/tasks?list=daily&date=${dateISO}`)} className="section-link"><Icon name="plus" size={16} />Add a daily task</Link>} />}
          <Link href={href("/tasks?list=master")} className="section-link border-t border-line pt-2"><Icon name="infinity" size={17} />Open your master list<Icon name="arrow" size={15} /></Link>
        </Card>
        {due.length > 0 && <Card as="section" className="px-5 pb-2 pt-5"><h2 className="section-heading">Needs your attention</h2><p className="mt-1 text-xs text-dim">Due and overdue from your master list</p><ul>{due.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} dateISO={now.dateISO} onEdit={() => router.push(href("/tasks?list=master"))} />)}</ul></Card>}
        <Card as="section" className="px-5 pb-4 pt-4"><div className="flex items-center justify-between"><h2 className="section-heading">On the horizon</h2><Link href={href("/calendar")} className="section-link" aria-label="Open calendar"><Icon name="arrow" size={18} /></Link></div>
          {upcoming.length ? <ul className="divide-y divide-line">{upcoming.map((event) => <li key={event.id}><Link href={href("/calendar")} className="flex min-w-0 items-start gap-3 py-3"><span className="flex w-10 shrink-0 flex-col items-center rounded-xl bg-surface-2 py-1"><span className="text-[9px] font-semibold uppercase">{new Date(`${event.on_date}T12:00:00`).toLocaleDateString("en-GB", { month: "short" })}</span><strong className="text-lg font-semibold">{Number(event.on_date.slice(8))}</strong></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{event.title}</span><span className="mt-1 block truncate text-xs text-dim"><span className="capitalize">{event.kind}</span> · {countdownLabel(daysBetweenISO(dateISO, event.on_date))}</span></span></Link></li>)}</ul> : <p className="py-4 text-sm text-dim">No upcoming deadlines. Add an exam or event to your calendar.</p>}
        </Card>
      </div>
    </div>
    <DayEditor open={sheet} onClose={() => setSheet(false)} dateISO={dateISO} />
  </div>;
}

/** "today" / "tomorrow" / "in 4 days" — never "in 1 days". */
function countdownLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function LiveClass({ status, nowMin, holiday, isToday }: { status: ReturnType<typeof dayStatus>; nowMin: number; holiday: string | null; isToday: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(0);
  const reduced = useReducedMotion();
  const current = status.current;
  const next = status.next;
  const chosen = current ?? next;
  const progress = current ? Math.max(0, Math.min(1, (nowMin - current.startMin) / (current.endMin - current.startMin))) : status.finished ? 1 : 0;
  useEffect(() => {
    const from = previous.current;
    previous.current = progress;
    const ctx = gsap.context(() => {
      const duration = reduced ? 0 : .65;
      gsap.fromTo(".live-fill", { scaleX: from }, { scaleX: progress, duration, ease: "power3.out" });
      gsap.fromTo(".dial-marker", { attr: { transform: `rotate(${from * 360} 50 50)` } }, { attr: { transform: `rotate(${progress * 360} 50 50)` }, duration, ease: "power3.out" });
    }, root);
    return () => ctx.revert();
  }, [progress, reduced]);
  return <section ref={root} className="live-panel" aria-label="Live class status">
    <div className="live-content"><div className="min-w-0 flex-1">
      <span className="live-badge"><span className="live-dot" />{current ? "IN CLASS NOW" : next ? isToday ? "UP NEXT" : "FIRST CLASS" : holiday ? "DAY OFF" : status.finished ? "DONE FOR THE DAY" : "NOTHING SCHEDULED"}</span>
      <h2>{chosen?.subject?.name ?? (holiday ? "A little breathing room." : status.finished ? "College is over." : "The day is yours.")}</h2>
      <p className="mt-2 text-xs leading-relaxed sm:text-sm">{chosen ? [chosen.subject?.short_name, chosen.kind.charAt(0).toUpperCase() + chosen.kind.slice(1), chosen.room || chosen.subject?.room].filter(Boolean).join(" · ") : status.finished ? `Finished at ${formatMinutes(status.endsAtMin ?? 0)}. Time to make it your own.` : "Your schedule will appear here when you add a class."}</p>
      {chosen && <p className="mt-1 text-xs">{formatMinutes(chosen.startMin)} – {formatMinutes(chosen.endMin)}</p>}
    </div><div className="relative h-[105px] w-[105px] shrink-0 sm:h-32 sm:w-32" aria-hidden="true">
      <svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="44" stroke="currentColor" opacity=".18" /><circle cx="50" cy="50" r="34" stroke="currentColor" opacity=".3" /><circle cx="50" cy="50" r="23" stroke="currentColor" opacity=".15" /><path d="M50 2v8M50 90v8" stroke="currentColor" opacity=".5" /><g className="dial-marker" transform={`rotate(${progress * 360} 50 50)`}><circle cx="50" cy="6" r="5" fill="var(--gold)" /><circle cx="50" cy="6" r="2.5" fill="var(--hero-ink)" /></g></svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold sm:text-xl">{current ? formatDuration(status.currentRemaining) : next && isToday ? formatDuration(status.untilNext) : <Icon name={status.finished ? "check" : "sun"} size={27} />}</span>{(current || (next && isToday)) && <span className="mt-1 text-[10px] text-[var(--hero-dim)]">{current ? "left" : "to go"}</span>}</div>
    </div></div>
    <div className="live-progress" role="progressbar" aria-label="Current class progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><div className="live-fill" style={{ transform: `scaleX(${progress})` }} /></div>
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-[var(--hero-dim)]"><span>{current ? "Class in progress" : next ? `Starts ${formatMinutes(next.startMin)}` : "A moment for yourself"}</span><span>{current ? `${nowMin - current.startMin} / ${current.endMin - current.startMin} min` : status.endsAtMin !== null ? `Day ends ${formatMinutes(status.endsAtMin)}` : "Plan at your own pace"}</span></div>
  </section>;
}
