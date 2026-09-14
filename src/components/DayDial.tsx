"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * The day, as a clock.
 *
 * Two concentric twelve-hour dials sharing one set of hour positions: the inner
 * ring is the morning, the outer ring the afternoon and evening. Twelve is at
 * the top of both, so a block's position on the face is its actual time rather
 * than its share of some arbitrary window. Anything crossing noon is drawn
 * twice, ending at the top of the inner ring and resuming at the top of the
 * outer one.
 *
 * Shared between the landing page (a synthetic sample day) and Today (the real
 * one), so the claim the landing makes is the thing the app actually does.
 */

const HALF = 12 * 60;        // minutes in half a day; one full turn of a dial
const DAY = 24 * 60;
/** Below this an arc is a sliver, so short blocks still register on the face. */
const MIN_ARC_MIN = 7;

const SIZE = 340, CX = SIZE / 2, CY = SIZE / 2;
const OUTER_R = 120, INNER_R = 92, BAND = 19;
/** Where the hour numerals sit, clear of the outer band. */
const NUM_R = OUTER_R + BAND / 2 + 14;  // clear of the band, inside the viewBox

export type DialItem = {
  /** Stable identity. Falls back to the label, which repeats across a day. */
  id?: string;
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

/**
 * Stroke weight carries meaning: what the timetable fixes for you is drawn at
 * full weight, what you chose to put in the day yourself is drawn lighter. So
 * the face separates obligations from plans before any colour is read.
 */
const WEIGHT: Record<DialItem["kind"], number> = {
  class: BAND, lab: BAND, exam: BAND,
  plan: 12,
  // Open time is a period, not a commitment: full width so it reads as room in
  // the day, faint so it never competes with something booked.
  free: BAND,
};

const TONE: Record<DialItem["kind"], string> = {
  class: "var(--dial-class)",
  lab: "var(--dial-lab)",
  exam: "var(--dial-exam)",
  free: "var(--dial-free)",
  plan: "var(--dial-plan)",
};

const round = (n: number) => Math.round(n * 1000) / 1000;
const polar = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [round(CX + r * Math.cos(rad)), round(CY + r * Math.sin(rad))] as const;
};

/** Twelve at the top, running clockwise, exactly as a clock reads. */
const angleOf = (minutes: number) => ((minutes % HALF) / HALF) * 360 - 90;

/**
 * The arc is swept from the start angle by the block's real duration rather
 * than drawn between two absolute angles, so a block ending at midnight (whose
 * end angle wraps back to the top) still sweeps forwards.
 */
function arc(from: number, to: number, r: number) {
  const a0 = angleOf(from);
  const sweep = Math.min(359.9, (Math.max(to - from, MIN_ARC_MIN) / HALF) * 360);
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a0 + sweep);
  return `M${x0} ${y0}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

/** Which dial a time belongs on, and the pieces a block breaks into at noon. */
type Piece = { from: number; to: number; r: number };
function pieces(from: number, to: number): Piece[] {
  const a = Math.max(0, Math.min(from, DAY));
  const b = Math.max(a, Math.min(to, DAY));
  const out: Piece[] = [];
  if (a < HALF) out.push({ from: a, to: Math.min(b, HALF), r: INNER_R });
  if (b > HALF) out.push({ from: Math.max(a, HALF), to: b, r: OUTER_R });
  return out.filter((p) => p.to > p.from);
}

export function DayDial({
  items = SAMPLE_DAY, nowMinutes, onFocusItem, onHoverItem,
  showCenter = true, showTicks = true, showNow = true,
}: {
  items?: DialItem[];
  nowMinutes: number;
  onFocusItem?: (item: DialItem | null) => void;
  /** Fires as the pointer enters and leaves a block. Also makes the blocks
   *  touch targets, so a visitor can ask the face what something is.
   *  `sticky` marks a selection that has no natural end — a tap, which never
   *  leaves — so the caller can time it out. A hover ends by itself. */
  onHoverItem?: (item: DialItem | null, sticky?: boolean) => void;
  showCenter?: boolean;
  showTicks?: boolean;
  showNow?: boolean;
}) {
  // useId emits « » which url(#…) cannot carry — strip to an id SVG accepts.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const reduced = useReducedMotion();

  // Index, not label: two lectures of the same subject in one day share a label
  // and would otherwise highlight together and collide as React keys.
  const activeIndex = items.findIndex((i) => nowMinutes >= i.from && nowMinutes < i.to);
  const active = activeIndex === -1 ? null : items[activeIndex];
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const key = active ? `${activeIndex}:${active.label}` : null;
    if (key !== lastSent.current) { lastSent.current = key; onFocusItem?.(active); }
  }, [active, activeIndex, onFocusItem]);

  const showMarker = showNow && nowMinutes >= 0 && nowMinutes <= DAY;
  const nowR = nowMinutes < HALF ? INNER_R : OUTER_R;
  const [nx, ny] = polar(nowR, angleOf(nowMinutes));

  /** The day so far, filled in on whichever dials it has already crossed. */
  const spent = showMarker
    ? [
        nowMinutes >= HALF
          ? { key: "am", full: true, r: INNER_R, d: "" }
          : { key: "am", full: false, r: INNER_R, d: arc(0, nowMinutes, INNER_R) },
        ...(nowMinutes > HALF
          ? [{ key: "pm", full: false, r: OUTER_R, d: arc(HALF, nowMinutes, OUTER_R) }]
          : []),
      ].filter((s) => s.full || s.d)
    : [];

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="day-dial" role="img"
         aria-label={`Your day on a clock face: the inner ring is morning, the outer ring afternoon and evening. ${items.map((i) => i.label).join(", ") || "Nothing scheduled"}.`}>
      <defs>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* the two empty dials */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="var(--dial-track)" strokeWidth={BAND} />
      <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="var(--dial-track)" strokeWidth={BAND} />

      {/* the part already spent, so an empty morning reads as gone rather than
          as nothing scheduled */}
      {spent.map((s) => s.full
        ? <circle key={s.key} cx={CX} cy={CY} r={s.r} fill="none" stroke="var(--dial-spent)" strokeWidth={BAND} />
        : <path key={s.key} d={s.d} fill="none" stroke="var(--dial-spent)" strokeWidth={BAND} strokeLinecap="butt" />)}

      {/* hour marks, in the channel between the dials so one set serves both */}
      {showTicks && Array.from({ length: 12 }, (_, h) => h).map((h) => {
        const quarter = h % 3 === 0;
        const [x0, y0] = polar(INNER_R + BAND / 2 + 1, angleOf(h * 60));
        const [x1, y1] = polar(OUTER_R - BAND / 2 - 1, angleOf(h * 60));
        return <line key={h} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--dial-tick)"
                     strokeWidth={quarter ? 2.6 : 1.3} opacity={quarter ? 1 : 0.5} strokeLinecap="round" />;
      })}

      {/* 12, 3, 6 and 9 — enough to read the face without ringing it in numbers */}
      {showTicks && [12, 3, 6, 9].map((n) => {
        const [x, y] = polar(NUM_R, angleOf((n % 12) * 60));
        return <text key={n} x={x} y={y} className="dial-hour"
                     textAnchor="middle" dominantBaseline="central">{n}</text>;
      })}

      {items.map((item, i) => {
        const past = nowMinutes >= item.to;
        const weight = WEIGHT[item.kind];
        const opacity = activeIndex === i ? 1
          : item.kind === "free" ? (past ? 0.16 : 0.3)
          : past ? 0.42 : 0.95;
        return (
          <g key={item.id ?? `${item.label}-${i}`}>
            {pieces(item.from, item.to).map((p, j) => (
              <path
                key={j}
                d={arc(p.from, p.to, p.r)}
                stroke={TONE[item.kind]}
                strokeWidth={activeIndex === i ? weight + 5 : weight}
                strokeLinecap="butt"
                fill="none"
                // Done, happening, still to come: the three states the face
                // exists to tell apart.
                opacity={opacity}
                className="dial-arc"
              />
            ))}
            {onHoverItem && pieces(item.from, item.to).map((p, j) => (
              // A 19px band is not a touch target. This one is invisible and wide.
              //
              // A phone has no hover, so enter/leave alone left the face dead to
              // touch. pointerdown selects on any input; enter and leave only
              // track a mouse, which is the only pointer that can hover off
              // again by itself.
              <path
                key={`hit-${j}`}
                d={arc(p.from, p.to, p.r)}
                stroke="transparent" strokeWidth="34" fill="none"
                className="dial-hit"
                onPointerDown={(e) => onHoverItem(item, e.pointerType !== "mouse")}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") onHoverItem(item, false); }}
                onPointerLeave={(e) => { if (e.pointerType === "mouse") onHoverItem(null, false); }}
              />
            ))}
          </g>
        );
      })}

      {/* now */}
      {showMarker && (
        <motion.g
          // Decoration, and it sits exactly over the block happening now: left
          // hit-testable it swallows the tap on the one segment most worth
          // tapping.
          pointerEvents="none"
          animate={{ x: nx - CX, y: ny - CY }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
        >
          <circle cx={CX} cy={CY} r="8.5" fill="var(--dial-now-ring)" />
          <circle cx={CX} cy={CY} r="5" fill="var(--dial-now)" filter={`url(#${uid}-glow)`} />
        </motion.g>
      )}

      {showCenter && <>
        {/* y is a baseline, not a middle: placed by baseline the numeral rides
            well above the centre of the face. dominant-baseline centres the
            glyph box on y, so the time sits exactly in the middle and the
            caption hangs under it. */}
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" className="dial-time">
          {String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:{String(Math.floor(nowMinutes % 60)).padStart(2, "0")}
        </text>
        <text x={CX} y={CY + 30} textAnchor="middle" dominantBaseline="central" className="dial-caption">
          {active ? active.label : "Free"}
        </text>
      </>}
    </svg>
  );
}
