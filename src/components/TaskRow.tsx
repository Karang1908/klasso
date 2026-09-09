"use client";
import { useEffect, useRef } from "react";
import { animate } from "animejs/animation";
import { motion, useReducedMotion } from "motion/react";
import { cx } from "./ui";
import { useApp } from "@/lib/store";
import { formatDateISO, formatMinutes, parseTime } from "@/lib/time";
import type { Task } from "@/lib/types";

export function TaskCheck({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const path = useRef<SVGPathElement>(null);
  const previous = useRef(task.done);
  const reduced = useReducedMotion();
  useEffect(() => {
    const changed = previous.current !== task.done;
    previous.current = task.done;
    if (!task.done || !changed || reduced || !path.current) return;
    const animation = animate(path.current, { strokeDashoffset: [24, 0], duration: 220, ease: "outExpo" });
    return () => { animation.revert(); };
  }, [task.done, reduced]);
  return <button className="task-check" aria-label={`Mark ${task.title} ${task.done ? "not done" : "done"}`} aria-pressed={task.done} onClick={onToggle}>
    <span>{task.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path ref={path} d="m5 12 4 4L19 6" strokeDasharray="24" strokeDashoffset="0" /></svg>}</span>
  </button>;
}

export function TaskRow({ task, dateISO, onEdit }: { task: Task; dateISO: string; onEdit: () => void }) {
  const { subjectsById, toggleTask } = useApp();
  const subject = task.subject_id ? subjectsById.get(task.subject_id) : null;
  const overdue = !task.done && task.due_date && task.due_date < dateISO;
  return <motion.li layout="position" initial={false} exit={{ opacity: 0, scale: .98 }} className="task-row">
    <TaskCheck task={task} onToggle={() => void toggleTask(task.id)} />
    <button className="min-w-0 flex-1 text-left" onClick={onEdit} aria-label={`Edit ${task.title}`}>
      <span className={cx("task-title", task.done && "is-done")}>{task.title}</span>
      {(subject || task.notes || task.due_date) && <span className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-xs text-dim">
        {subject && <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />{subject.short_name || subject.name}</span>}
        {task.due_date && <span className={overdue ? "text-danger" : undefined}>{overdue ? "Overdue · " : ""}{task.due_date === dateISO ? "Due today" : formatDateISO(task.due_date)}{task.due_time && ` · ${formatMinutes(parseTime(task.due_time))}`}</span>}
        {task.notes && <span className="basis-full truncate">{task.notes}</span>}
      </span>}
    </button>
    {task.priority === 2 && !task.done && <span className="tag bg-warn-soft text-warn">High</span>}
  </motion.li>;
}
