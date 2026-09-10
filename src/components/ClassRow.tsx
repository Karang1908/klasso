"use client";
import { cx, Button, Dropdown } from "./ui";
import { Icon } from "./icons";
import { haptic } from "@/lib/haptics";
import { formatMinutes } from "@/lib/time";
import type { AttendanceStatus, ClassOccurrence } from "@/lib/types";

export function ClassRow({ occurrence: c, state, attendance, onAttendance, onCancel, action }: {
  occurrence: ClassOccurrence; state: "past" | "now" | "upcoming"; attendance?: AttendanceStatus | null;
  onAttendance?: (status: AttendanceStatus) => void; onCancel?: () => void; action?: React.ReactNode;
}) {
  const name = c.subject?.name ?? "Unassigned class";
  return <li className="schedule-row">
    <div className="class-time"><strong>{formatMinutes(c.startMin).replace(/ [ap]m/, "")}</strong><span>&ndash;&nbsp;{formatMinutes(c.endMin)}</span>{state === "now" && <span className="mt-1 text-[10px] font-bold text-brand">Now</span>}</div>
    <div className="class-content">
      <h3 className={cx("class-title", state === "past" && "text-dim")}>{name}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dim"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c.subject?.color ?? "var(--brand)" }} />{c.subject?.short_name || c.kind}</span>{(c.room || c.subject?.room) && <span>{c.room || c.subject?.room}</span>}{c.isExtra && <span className="text-warn">Extra</span>}</p>
      {c.subject?.teacher && <p className="mt-1 text-xs text-faint">{c.subject.teacher}</p>}
      {c.note && <p className="mt-1 text-xs text-dim">{c.note}</p>}
    </div>
      {onAttendance && c.subjectId && <Dropdown
        aria-label={`Attendance for ${name}`}
        className="shrink-0"
        align="end"
        triggerClassName={cx("attendance-control flex items-center justify-between gap-1",
          attendance === "present" && "is-present", attendance === "absent" && "is-absent")}
        value={attendance ?? ""}
        onChange={(value) => { haptic("select"); if (value && value !== attendance) onAttendance(value as AttendanceStatus); else if (!value && attendance) onAttendance(attendance); }}
        options={[{ value: "", label: "Mark" }, { value: "present", label: "Present" }, { value: "absent", label: "Absent" }, { value: "cancelled", label: "Off" }]}
      />}
    {action}{onCancel && <Button variant="ghost" size="sm" onClick={onCancel} aria-label={`Remove ${name}`}><Icon name="close" size={17} /></Button>}
  </li>;
}
