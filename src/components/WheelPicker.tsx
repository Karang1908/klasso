"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { haptic } from "@/lib/haptics";

/** Row height in px. Must match --wheel-item in globals.css. */
const ITEM = 40;
/** Rows visible either side of the selection. */
const PAD = 2;

/**
 * One spinning column, the way a phone's alarm clock does it.
 *
 * Built on native scrolling with scroll-snap rather than a drag handler: it
 * inherits momentum, rubber-banding and trackpad support for free, and it
 * stays operable with a keyboard. The selection updates while the wheel is
 * still moving — waiting for it to settle feels broken.
 */
function Wheel<T extends string | number>({
  values, value, onChange, label, format,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  format?: (value: T) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const programmatic = useRef(false);
  const uid = useId();
  const index = Math.max(0, values.indexOf(value));

  // Follow the value when something else changes it (typing, a preset, the
  // other column rolling past midnight).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM;
    if (Math.abs(el.scrollTop - target) < 2) return;
    programmatic.current = true;
    el.scrollTo({ top: target, behavior: "auto" });
    // Clear on the next frame: the scroll event lands after this tick.
    const id = requestAnimationFrame(() => { programmatic.current = false; });
    return () => cancelAnimationFrame(id);
  }, [index]);

  const onScroll = useCallback(() => {
    if (programmatic.current || frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = ref.current;
      if (!el) return;
      const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      const next = values[i];
      if (next !== undefined && next !== value) { onChange(next); haptic("tick"); }
    });
  }, [onChange, value, values]);

  const step = (delta: number) => {
    const i = Math.min(values.length - 1, Math.max(0, index + delta));
    if (values[i] !== value) { onChange(values[i]); haptic("tick"); }
  };

  return (
    <div className="wheel">
      <span className="wheel-label" id={`${uid}-label`}>{label}</span>
      <div
        ref={ref}
        className="wheel-track"
        role="listbox"
        tabIndex={0}
        aria-labelledby={`${uid}-label`}
        aria-activedescendant={`${uid}-${index}`}
        onScroll={onScroll}
        onKeyDown={(event) => {
          const by = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[event.key];
          if (by === undefined) return;
          event.preventDefault();
          step(by);
        }}
      >
        <div style={{ height: PAD * ITEM }} aria-hidden="true" />
        {values.map((v, i) => (
          <div
            key={String(v)}
            id={`${uid}-${i}`}
            role="option"
            aria-selected={i === index}
            className="wheel-item"
            onClick={() => { if (v !== value) { onChange(v); haptic("tick"); } }}
          >
            {format ? format(v) : String(v)}
          </div>
        ))}
        <div style={{ height: PAD * ITEM }} aria-hidden="true" />
      </div>
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const H12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const H24 = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Hour / minute (/ am-pm) wheels over a minutes-past-midnight value.
 * Minutes step by 5 — every remaining time is still reachable by typing.
 */
export function TimeWheel({
  minutes, onChange, hour12,
}: { minutes: number; onChange: (minutes: number) => void; hour12: boolean }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const nearestM = MINUTES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a), MINUTES[0]);

  return (
    <div className="wheel-set">
      <div className="wheel-band" aria-hidden="true" />
      {hour12 ? (
        <Wheel
          label="Hour" values={H12} value={(h % 12 === 0 ? 12 : h % 12) as (typeof H12)[number]}
          onChange={(v) => {
            const base = v === 12 ? 0 : v;
            onChange((h < 12 ? base : base + 12) * 60 + m);
          }}
        />
      ) : (
        <Wheel label="Hour" values={H24} value={h} format={pad2} onChange={(v) => onChange(v * 60 + m)} />
      )}
      <Wheel label="Minute" values={MINUTES} value={nearestM} format={pad2} onChange={(v) => onChange(h * 60 + v)} />
      {hour12 && (
        <Wheel
          label="AM/PM" values={["AM", "PM"] as const} value={h < 12 ? "AM" : "PM"}
          onChange={(v) => onChange(((v === "AM" ? h % 12 : (h % 12) + 12) * 60) + m)}
        />
      )}
    </div>
  );
}
