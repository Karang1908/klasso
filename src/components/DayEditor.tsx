"use client";
import { useState } from "react";
import { Banner, Button, Field, Input, Dropdown, Sheet } from "./ui";
import { dayCancelledNote, resolveDay } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { formatDateISO, formatMinutes } from "@/lib/time";

export function DayEditor({ open, onClose, dateISO }: { open: boolean; onClose: () => void; dateISO: string }) {
  const { data, subjectsById, addOverride, removeOverride } = useApp();
  const classes = resolveDay(dateISO, data.slots, data.overrides, subjectsById);
  const holiday = dayCancelledNote(dateISO, data.overrides);
  const [extra, setExtra] = useState({ subject: "", start: "15:00", end: "16:00", room: "" });
  const cancelled = data.overrides.filter((override) => override.on_date === dateISO && override.kind === "cancel_slot");
  return <Sheet open={open} onClose={onClose} title={`Edit ${formatDateISO(dateISO)}`}>
    <div className="space-y-6">
      <p className="text-sm text-dim">Changes apply to this date only. Your weekly timetable stays the same.</p>
      <Button className="w-full" variant={holiday ? "secondary" : "danger"} onClick={() => {
        if (holiday) { const override = data.overrides.find((o) => o.on_date === dateISO && o.kind === "cancel_day"); if (override) void removeOverride(override.id); }
        else void addOverride({ on_date: dateISO, kind: "cancel_day", note: "No classes" });
      }}>{holiday ? "Restore normal classes" : "Mark the whole day off"}</Button>
      {classes.length > 0 && <section><h3 className="mb-2 font-semibold">Cancel a class</h3><ul className="divide-y divide-line">{classes.map((c) => <li key={c.key} className="flex items-center gap-3 py-2"><span className="min-w-0 flex-1 text-sm">{c.subject?.name || "Class"}<span className="block text-xs text-dim">{formatMinutes(c.startMin)}</span></span><Button size="sm" variant="danger" onClick={() => { if (c.isExtra && c.overrideId) void removeOverride(c.overrideId); else void addOverride({ on_date: dateISO, kind: "cancel_slot", slot_id: c.slotId }); }}>Cancel</Button></li>)}</ul></section>}
      {cancelled.length > 0 && <section><h3 className="mb-2 font-semibold">Cancelled classes</h3>{cancelled.map((o) => { const slot = data.slots.find((s) => s.id === o.slot_id); return <div key={o.id} className="flex items-center gap-3 py-1"><span className="flex-1 text-sm text-dim">{slot?.subject_id ? subjectsById.get(slot.subject_id)?.name : "Class"}</span><Button size="sm" onClick={() => void removeOverride(o.id)}>Restore</Button></div>; })}</section>}
      <section className="space-y-3"><h3 className="font-semibold">Add a one-off class</h3>
        {data.subjects.length === 0 ? <p className="text-sm text-dim">Add a subject in Timetable first.</p> : <>
          <Field label="Subject"><Dropdown aria-label="Subject" placeholder="Choose a subject" value={extra.subject} onChange={(v) => setExtra({ ...extra, subject: v })} options={data.subjects.map((s) => ({ value: s.id, label: s.name, swatch: s.color }))} /></Field>
          <div className="flex gap-3"><Field label="Starts"><Input type="time" value={extra.start} onChange={(e) => setExtra({ ...extra, start: e.target.value })} /></Field><Field label="Ends"><Input type="time" value={extra.end} onChange={(e) => setExtra({ ...extra, end: e.target.value })} /></Field></div>
          {extra.end <= extra.start && <Banner tone="danger">Choose an end time after the start.</Banner>}
          <Field label="Room"><Input value={extra.room} placeholder="Optional room" onChange={(e) => setExtra({ ...extra, room: e.target.value })} /></Field>
          <Button variant="primary" className="w-full" disabled={!extra.subject || !extra.start || extra.end <= extra.start} onClick={async () => {
            await addOverride({ on_date: dateISO, kind: "extra", subject_id: extra.subject, start_time: extra.start, end_time: extra.end, room: extra.room || null, note: "One-off" });
            setExtra({ subject: "", start: "15:00", end: "16:00", room: "" });
          }}>Add class</Button>
        </>}
      </section>
    </div>
  </Sheet>;
}
