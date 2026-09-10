"use client";

import { haptic } from "@/lib/haptics";

/**
 * Value slider. Lives in its own file rather than in ui.tsx because
 * TemporalInput needs it and ui.tsx already imports TemporalInput; importing
 * back would close a cycle.
 */
export function Slider({
  value, onChange, min = 0, max = 120, step = 5, label, format, hideHead = false, className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
  /** Drop the label row when the surrounding UI already names the control. */
  hideHead?: boolean;
  className?: string;
}) {
  const show = format ? format(value) : `${value} min`;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className={`slider${className ? ` ${className}` : ""}`}>
      {!hideHead && <div className="slider-head">
        <span>{label}</span>
        <strong>{show}</strong>
      </div>}
      <input
        type="range"
        aria-label={label}
        aria-valuetext={show}
        min={min} max={max} step={step} value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          // Guard the haptic on a real change: a range fires input events while
          // the thumb is held still, and buzzing on every one of those is noise.
          if (next !== value) { onChange(next); haptic("tick"); }
        }}
        // The filled portion is painted from the value so the track reads at a
        // glance without a second element to keep in sync.
        style={{ ["--slider-fill" as string]: `${pct}%` }}
      />
    </div>
  );
}
