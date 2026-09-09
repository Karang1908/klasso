"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ClassRow } from "@/components/ClassRow";
import { Card, EmptyState, Input, Sheet, cx } from "@/components/ui";
import { useAppHref } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { attendanceBySubject, resolveDay } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { addDaysISO, formatDateISO } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import type { AttendanceStatus } from "@/lib/types";

export default function AttendancePage() {
  const { data, subjectsById, setAttendance } = useApp();
  const now = useNow(60_000);
  const href = useAppHref();
  const [backfillDate, setBackfillDate] = useState<string | null>(null);

  const stats = useMemo(
    () => attendanceBySubject(data.attendance, data.subjects),
    [data.attendance, data.subjects],
  );

  const totals = stats.reduce(
    (acc, s) => ({ present: acc.present + s.present, held: acc.held + s.held }),
    { present: 0, held: 0 },
  );
  const overall = totals.held === 0 ? null : (totals.present / totals.held) * 100;
  const atRisk = stats.filter((s) => s.held > 0 && !s.meetsMinimum);

  // The last fortnight, most recent first, for filling in days you forgot.
  const recentDays = Array.from({ length: 14 }, (_, i) => addDaysISO(now.dateISO, -i))
    .filter((d) => resolveDay(d, data.slots, data.overrides, subjectsById).length > 0);

  return (
    <div className="page-stack">
      <header>
        <h1 className="page-heading">Every class counts.</h1>
        <p className="page-subtitle">
          {totals.held === 0
            ? "Mark yourself present or absent from the Today tab."
            : `${totals.present} of ${totals.held} classes attended`}
        </p>
      </header>

      {data.subjects.length === 0 ? (
        <Card>
          <EmptyState
            title="No subjects yet"
            body="Add your subjects and timetable first, then mark each class as you go."
            action={<Link href={href("/timetable")} className="section-link">Set up timetable<Icon name="arrow" size={16} /></Link>}
          />
        </Card>
      ) : (
        <>
          {overall !== null && (
            <Card className="px-6 py-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-dim">Overall attendance</h2>
                  <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{overall.toFixed(1)}<span className="ml-1 text-xl text-dim">%</span></p>
                  <p className="mt-2 text-xs text-dim">{totals.present} attended · {totals.held - totals.present} missed</p>
                </div>
                {atRisk.length > 0 && (
                  <span className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                    {atRisk.length} below minimum
                  </span>
                )}
              </div>
            </Card>
          )}

          <ul className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {stats.map((s) => (
              <li key={s.subject.id}>
                <Card className="h-full p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: s.subject.color }} />
                    <h2 className="min-w-0 flex-1 truncate font-bold">{s.subject.name}</h2>
                    <span className={cx(
                      "shrink-0 text-lg font-bold tabular-nums",
                      s.percent === null ? "text-faint" : s.meetsMinimum ? "text-success" : "text-danger",
                    )}>
                      {s.percent === null ? "—" : `${s.percent.toFixed(0)}%`}
                    </span>
                  </div>

                  <div className="relative mt-4 h-2 rounded-full bg-surface-2" role="progressbar" aria-label={`${s.subject.name} attendance`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.percent ?? 0)}>
                    <div
                      className={cx("h-full rounded-full transition-[width]",
                        s.meetsMinimum ? "bg-success" : "bg-danger")}
                      style={{ width: `${Math.min(100, s.percent ?? 0)}%` }}
                    />
                    <span className="absolute -top-1 h-4 w-px bg-dim" style={{ left: `${Math.max(0, Math.min(100, s.subject.min_attendance))}%` }} title={`Required: ${s.subject.min_attendance}%`} />
                  </div>

                  <p className="mt-2 text-sm text-dim">
                    {s.held === 0 ? (
                      "Nothing marked yet."
                    ) : (
                      <>
                        {s.present} present · {s.absent} absent · needs {s.subject.min_attendance}%
                        {" — "}
                        {s.subject.min_attendance === 0 ? "No minimum requirement." : !s.meetsMinimum && s.subject.min_attendance === 100 ? <span className="text-danger">A recorded absence means 100% is no longer possible.</span> : s.meetsMinimum ? (
                          s.canSkip > 0 ? (
                            <span className="font-semibold text-success">
                              can skip {s.canSkip} more
                            </span>
                          ) : (
                            <span className="font-semibold text-warn">
                              cannot skip any more
                            </span>
                          )
                        ) : (
                          <span className="font-semibold text-danger">
                            attend {s.mustAttend} in a row to recover
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </Card>
              </li>
            ))}
          </ul>

          <section className="flex flex-col gap-2">
            <h2 className="section-heading">
              Fill in a past day
            </h2>
            <p className="text-sm text-dim">Missed a check-in? Choose any past date to update it.</p>
            <Input type="date" aria-label="Attendance date" max={now.dateISO} className="max-w-56" value={backfillDate ?? ""} onChange={(event) => { if (event.target.value) setBackfillDate(event.target.value); }} />
            {recentDays.length === 0 ? (
              <p className="text-sm text-dim">No class days in the last fortnight.</p>
            ) : (
              <div className="no-bar flex gap-2 overflow-x-auto py-2">
                {recentDays.map((d) => {
                  const classes = resolveDay(d, data.slots, data.overrides, subjectsById);
                  const markedKeys = new Set(
                    data.attendance.filter((a) => a.on_date === d).map((a) => a.occurrence_key),
                  );
                  const marked = classes.filter((c) => markedKeys.has(c.occKey)).length;
                  const complete = marked === classes.length;
                  return (
                    <button
                      key={d}
                      onClick={() => setBackfillDate(d)}
                      className={cx(
                        "flex shrink-0 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition",
                        complete ? "border-success/40 bg-success-soft" : "border-line bg-surface",
                      )}
                    >
                      <span className="text-xs font-bold">{formatDateISO(d)}</span>
                      <span className={cx("text-[11px] font-semibold",
                        complete ? "text-success" : "text-faint")}>
                        {marked}/{classes.length} marked
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <Sheet
        open={Boolean(backfillDate)}
        onClose={() => setBackfillDate(null)}
        title={backfillDate ? formatDateISO(backfillDate, "long") : ""}
      >
        {backfillDate && (
          <ul className="flex flex-col gap-2">
            {resolveDay(backfillDate, data.slots, data.overrides, subjectsById).map((c) => (
              <ClassRow
                key={c.key}
                occurrence={c}
                state="upcoming"
                attendance={
                  data.attendance.find(
                    (a) => a.on_date === backfillDate && a.occurrence_key === c.occKey,
                  )?.status ?? null
                }
                onAttendance={(status: AttendanceStatus) => {
                  if (!c.subjectId) return;
                  void setAttendance({
                    subjectId: c.subjectId, slotId: c.slotId, occKey: c.occKey,
                    date: backfillDate, status,
                  });
                }}
              />
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
