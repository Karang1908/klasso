"use client";
import Link from "next/link";
import { cx } from "./ui";
import { Icon } from "./icons";
import { useAppHref } from "./AppShell";
import { useApp } from "@/lib/store";
import { formatMinutes, parseTime } from "@/lib/time";
import type { StudyBlock } from "@/lib/types";
import { BLOCK_KINDS, blockKind } from "@/lib/planning";

/**
 * A planned study block as it appears inside a day's task list. Blocks live in
 * their own table (they have a time window and can belong to an exam), but the
 * owner thinks of them as part of the day's to-dos, so they render alongside.
 */
export function BlockRow({ block }: { block: StudyBlock }) {
  const { data, subjectsById, toggleBlock } = useApp();
  const href = useAppHref();
  const subject = block.subject_id ? subjectsById.get(block.subject_id) : null;
  const event = block.event_id ? data.events.find((e) => e.id === block.event_id) : null;

  return (
    <li className="task-row">
      <button
        className="task-check"
        aria-pressed={block.done}
        aria-label={`Mark ${block.title} ${block.done ? "not done" : "done"}`}
        onClick={() => void toggleBlock(block.id)}
      >
        <span>{block.done && <Icon name="check" size={13} />}</span>
      </button>
      <Link href={href(`/planning?date=${block.on_date}&edit=${block.id}`)} className="min-w-0 flex-1">
        <span className={cx("task-title", block.done && "is-done")}>{block.title}</span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dim">
          {block.start_time ? (
            <span className="font-semibold text-ink">
              {formatMinutes(parseTime(block.start_time))}
              {block.end_time ? `–${formatMinutes(parseTime(block.end_time))}` : ""}
            </span>
          ) : (
            <span>Planned</span>
          )}
          {subject && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />
              {subject.short_name || subject.name}
            </span>
          )}
          {event && <span className="tag bg-brand-soft text-brand">{event.title}</span>}
          {blockKind(block) !== "study" && (
            <span className={cx("tag", BLOCK_KINDS.find((k) => k.value === blockKind(block))!.tone)}>
              {BLOCK_KINDS.find((k) => k.value === blockKind(block))!.label}
            </span>
          )}
          {block.location && <span>{block.location}</span>}
        </span>
      </Link>
    </li>
  );
}
