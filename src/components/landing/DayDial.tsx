"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * The day, as one ring.
 *
 * The page's organising device rather than decoration: a college day from 08:00
 * to 20:00 laid on a dial, with classes as arcs and exams as marks. It is the
 * product's own logo geometry scaled up, so the landing page and the app icon
 * are visibly the same idea — and it argues the claim ("your whole college day
 * in one place") by simply being true rather than by asserting it.
 */

const START = 8 * 60;   // 08:00
const END = 20 * 60;    // 20:00
const SPAN = END - START;

export type DialItem = {
  label: string;
  from: number;
  to: number;
  kind: "class" | "lab" | "exam" | "free" | "plan";
};

/** A real-looking Tuesday. Synthetic, and labelled as such on the page. */
export const SAMPLE_DAY: DialItem[] = [
  { label: "Discrete Maths", from: 9 * 60, to: 10 * 60, kind: "class" },
  { label: "Data Structures", from: 10 * 60 + 15, to: 11 * 60 + 15, kind: "class" },
  { label: "Free", from: 11 * 60 + 15, to: 13 * 60, kind: "free" },
  { label: "Electronics Lab", from: 13 * 60, to: 15 * 60, kind: "lab" },
  { label: "Physics midterm", from: 15 * 60 + 30, to: 17 * 60, kind: "exam" },
  { label: "Revise Karnaugh maps", from: 18 * 60, to: 19 * 60, kind: "plan" },
];

const angleOf = (minutes: number) => ((minutes - START) / SPAN) * 360 - 90;
const round = (n: number) => Math.round(n * 1000) / 1000;
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [round(cx + r * Math.cos(rad)), round(cy + r * Math.sin(rad))] as const;
};

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a0 = angleOf(from), a1 = angleOf(to);
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

const TONE: Record<DialItem["kind"], string> = {
  class: "var(--dial-class)",
  lab: "var(--dial-lab)",
  exam: "var(--dial-exam)",
  free: "var(--dial-free)",
  plan: "var(--dial-plan)",
};

export function DayDial({
  items = SAMPLE_DAY, nowMinutes, onFocusItem,
}: { items?: DialItem[]; nowMinutes: number; onFocusItem?: (item: DialItem | null) => void }) {
  // useId emits « » which url(#…) cannot carry — strip to an id SVG accepts.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const size = 340, cx = size / 2, cy = size / 2, r = 132;
  const reduced = useReducedMotion();
  const active = items.find((i) => nowMinutes >= i.from && nowMinutes < i.to) ?? null;
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const key = active?.label ?? null;
    if (key !== lastSent.current) { lastSent.current = key; onFocusItem?.(active); }
  }, [active, onFocusItem]);

  const [nx, ny] = polar(cx, cy, r, angleOf(nowMinutes));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="day-dial" role="img"
         aria-label={`A college day from 8am to 8pm. ${items.map((i) => i.label).join(", ")}.`}>
      <defs>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* the empty day */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--dial-track)" strokeWidth="26" />

      {/* hour ticks, so the ring reads as a clock rather than a donut chart */}
      {Array.from({ length: 13 }, (_, i) => START + i * 60).map((m) => {
        const [x0, y0] = polar(cx, cy, r - 17, angleOf(m));
        const [x1, y1] = polar(cx, cy, r - 13, angleOf(m));
        return <line key={m} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--dial-tick)" strokeWidth="1.5" strokeLinecap="round" />;
      })}

      {items.map((item) => (
        <path
          key={item.label}
          d={arcPath(cx, cy, r, item.from, item.to)}
          stroke={TONE[item.kind]}
          strokeWidth={active?.label === item.label ? 30 : 24}
          strokeLinecap="butt"
          fill="none"
          opacity={item.kind === "free" ? 0.4 : active && active.label !== item.label ? 0.45 : 1}
          className="dial-arc"
        />
      ))}

      {/* now */}
      <motion.g
        animate={{ x: nx - cx, y: ny - cy }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
      >
        <circle cx={cx} cy={cy} r="9" fill="var(--dial-now-ring)" />
        <circle cx={cx} cy={cy} r="5.5" fill="var(--dial-now)" filter={`url(#${uid}-glow)`} />
      </motion.g>

      <text x={cx} y={cy - 6} textAnchor="middle" className="dial-time">
        {String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:{String(Math.floor(nowMinutes % 60)).padStart(2, "0")}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" className="dial-caption">
        {active ? active.label : "Free"}
      </text>
    </svg>
  );
}
