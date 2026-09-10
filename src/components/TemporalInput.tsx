"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { addDaysISO, formatDateISO, formatMinutes, localDateISO, parseTime, toTimeString, WEEKDAY_SHORT } from "@/lib/time";
import { Slider } from "./Slider";
import { haptic } from "@/lib/haptics";

/** In-app date and time pickers; no platform calendar, wheel or select menu. */
export function TemporalInput({ type, value, onChange, className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(localDateISO().slice(0, 7));
  const [draft, setDraft] = useState("");
  const dateMode = type === "date";
  const raw = String(value ?? "").slice(0, dateMode ? 10 : 5);
  const name = props["aria-label"] ?? (dateMode ? "Date" : "Time");
  const valid = dateMode ? /^\d{4}-\d{2}-\d{2}$/.test(draft) && Number.isFinite(Date.parse(draft)) && new Date(`${draft}T12:00:00Z`).toISOString().slice(0, 10) === draft : /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft);
  const inRange = (next: string) => (!props.min || next >= String(props.min)) && (!props.max || next <= String(props.max));
  const close = (restore = false) => { setOpen(false); if (restore) input.current?.focus({ preventScroll: true }); };
  const show = () => {
    if (props.disabled) return;
    setMonth((raw && dateMode ? raw : localDateISO()).slice(0, 7)); setDraft(raw);
    setHost(root.current?.closest("dialog") ?? document.body); setOpen(true);
  };
  const commit = (next: string) => {
    if (input.current) {
      const element = input.current;
      element.value = next;
      onChange?.({ target: element, currentTarget: element } as ChangeEvent<HTMLInputElement>);
    }
    close(true);
  };
  useEffect(() => {
    if (!open || !popup.current) return;
    const menu = popup.current;
    menu.showPopover?.();
    const position = () => {
      if (!root.current) return;
      const r = root.current.getBoundingClientRect();
      const vv = window.visualViewport;
      const left = vv?.offsetLeft ?? 0, top = vv?.offsetTop ?? 0;
      const width = vv?.width ?? innerWidth, height = vv?.height ?? innerHeight;
      menu.style.width = `${Math.min(320, width - 24)}px`;
      menu.style.maxHeight = `${Math.max(120, height - 32)}px`;
      menu.style.left = `${Math.max(left + 12, Math.min(r.left, left + width - menu.offsetWidth - 12))}px`;
      const below = r.bottom + 8;
      const above = r.top - menu.offsetHeight - 8;
      menu.style.top = `${Math.max(top + 12, Math.min(below + menu.offsetHeight > top + height - 12 && above >= top + 12 ? above : below, top + height - menu.offsetHeight - 12))}px`;
    };
    position();
    const frame = requestAnimationFrame(() => { position(); (menu.querySelector('[data-picker-focus="true"]') as HTMLElement | null)?.focus({ preventScroll: true }); });
    const dismiss = (event: PointerEvent) => { if (!menu.contains(event.target as Node) && !root.current?.contains(event.target as Node)) setOpen(false); };
    const focus = (event: FocusEvent) => { if (!menu.contains(event.target as Node) && !root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss); document.addEventListener("focusin", focus);
    window.addEventListener("resize", position); window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    return () => { cancelAnimationFrame(frame); menu.hidePopover?.(); document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", focus); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); window.visualViewport?.removeEventListener("resize", position); };
  }, [open]);
  // The two time sliders read and write `draft`, which the typed field is
  // already bound to — so dragging updates the text and typing moves the
  // thumbs, with no second piece of state to keep in sync. An empty draft
  // parks at 09:00 so the thumbs have somewhere sensible to start; nothing is
  // written to the field until a slider actually moves.
  const timeMins = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft) ? parseTime(draft) : 9 * 60;
  const setTimeMins = (mins: number) => setDraft(toTimeString(Math.min(23 * 60 + 59, Math.max(0, mins))));

  const shift = (delta: number) => { const d = new Date(`${month}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + delta); setMonth(d.toISOString().slice(0, 7)); };
  const first = `${month}-01`;
  const start = addDaysISO(first, -new Date(`${first}T12:00:00`).getDay());
  return <div ref={root} className={`temporal-control ${className}`}>
    <input {...props} ref={input} type="text" role="combobox" data-input-type={type} value={raw} onChange={onChange} readOnly
      aria-haspopup="dialog" aria-controls={open ? uid : undefined} aria-expanded={open} placeholder={dateMode ? "Choose a date" : "Anytime"}
      onClick={show} onKeyDown={(event) => { if (["Enter", " ", "ArrowDown"].includes(event.key)) { event.preventDefault(); show(); } }} />
    <button type="button" tabIndex={-1} disabled={props.disabled} aria-label={`Choose ${name.toLowerCase()}`} onClick={show}><Icon name={dateMode ? "calendar" : "clock"} size={18} /></button>
    {open && host && createPortal(<div ref={popup} popover="manual" role="dialog" aria-label={`Choose ${name.toLowerCase()}`} id={uid} className="temporal-popup"
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); } }}>
      {dateMode ? <>
        <header><button type="button" aria-label="Previous picker month" onClick={() => shift(-1)}><Icon name="back" size={17} /></button><strong aria-live="polite">{new Date(`${month}-15T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Next picker month" onClick={() => shift(1)}><Icon name="chevron" size={17} /></button></header>
        <div className="picker-calendar">{WEEKDAY_SHORT.map((day) => <span key={day} className="picker-weekday">{day.slice(0, 2)}</span>)}
          {Array.from({ length: 42 }, (_, i) => { const day = addDaysISO(start, i); return <button key={day} type="button" disabled={!inRange(day)} aria-label={formatDateISO(day, "long")} aria-pressed={day === raw} data-picker-focus={day === (raw || localDateISO())} data-date={day} data-outside={day.slice(0, 7) !== month} onClick={() => commit(day)}
            onKeyDown={(event) => { const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key]; if (delta) { event.preventDefault(); const next = addDaysISO(day, delta); const target = popup.current?.querySelector(`[data-date="${next}"]`) as HTMLButtonElement | null; if (target) target.focus(); else { setMonth(next.slice(0, 7)); requestAnimationFrame(() => (popup.current?.querySelector(`[data-date="${next}"]`) as HTMLButtonElement | null)?.focus()); } } }}>{Number(day.slice(8))}</button>; })}
        </div>
      </> : <><header><strong>Choose a time</strong><button type="button" aria-label="Close time picker" data-picker-focus="true" onClick={() => close(true)}><Icon name="close" size={17} /></button></header>
        <p className="picker-readout" aria-live="polite">{formatMinutes(timeMins)}</p>
        <div className="picker-sliders">
          <Slider label="Hour" min={0} max={23} step={1} value={Math.floor(timeMins / 60)} format={(h) => String(h).padStart(2, "0")} onChange={(h) => setTimeMins(h * 60 + (timeMins % 60))} />
          <Slider label="Minute" min={0} max={55} step={5} value={timeMins % 60} format={(m) => String(m).padStart(2, "0")} onChange={(m) => setTimeMins(Math.floor(timeMins / 60) * 60 + m)} />
        </div>
        <div className="picker-time-options">{["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((time) => <button type="button" key={time} onClick={() => { haptic("select"); commit(time); }} disabled={!inRange(time)}>{time}</button>)}</div></>}
      <div className="picker-entry"><input type="text" aria-label={dateMode ? "Enter date YYYY-MM-DD" : "Enter time HH:MM"} placeholder={dateMode ? "YYYY-MM-DD" : "HH:MM"} value={draft} maxLength={dateMode ? 10 : 5} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (valid && inRange(draft)) commit(draft); } }} /><button type="button" disabled={!valid || !inRange(draft)} onClick={() => commit(draft)}>Apply</button></div>
      <footer><button type="button" disabled={Boolean(props.required)} onClick={() => commit("")}>Clear</button>{dateMode && <button type="button" disabled={!inRange(localDateISO())} onClick={() => commit(localDateISO())}>Today</button>}<button type="button" onClick={() => { if (draft !== raw && valid && inRange(draft)) commit(draft); else close(true); }}>Done</button></footer>
    </div>, host)}
  </div>;
}
