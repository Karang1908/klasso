"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { attendance } from "@/lib/attendance-math";
import { Icon } from "./icons";

/** Requirements people actually have. 75% is the common Indian university rule. */
const PRESETS = [60, 65, 70, 75, 80, 85];

/** A 270° gauge: open at the bottom, so it is read as a dial and not mistaken
 *  for the day clock the rest of the product uses. */
const SWEEP = 270, START = 135, R = 78, C = 100;
const round = (n: number) => Math.round(n * 100) / 100;
const point = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [round(C + R * Math.cos(rad)), round(C + R * Math.sin(rad))] as const;
};
const arcTo = (fromPct: number, toPct: number) => {
  const a0 = START + (fromPct / 100) * SWEEP;
  const a1 = START + (toPct / 100) * SWEEP;
  const [x0, y0] = point(a0);
  const [x1, y1] = point(a1);
  return `M${x0} ${y0}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

const clampInt = (v: unknown, hi = 9999) =>
  Math.max(0, Math.min(hi, Math.floor(Number(v) || 0)));

export function AttendanceCalculator() {
  const [attended, setAttended] = useState(40);
  const [held, setHeld] = useState(50);
  const [required, setRequired] = useState(75);

  // Nothing may be written to the address bar until the incoming link has been
  // read out of it. Without this gate the two effects race on mount: the writer
  // publishes the default 40/50/75 over the shared values before the reader
  // sees them, and a link someone sent a friend silently opens on the defaults.
  const [restored, setRestored] = useState(false);

  // Deferred to a microtask so this is not a synchronous setState inside an
  // effect, matching how the preview harness rehydrates.
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const q = new URLSearchParams(window.location.search);
        if (q.has("attended")) setAttended(clampInt(q.get("attended")));
        if (q.has("held")) setHeld(clampInt(q.get("held")));
        if (q.has("required")) setRequired(clampInt(q.get("required"), 100));
      } catch { /* a malformed link should not break the page */ }
      setRestored(true);
    });
  }, []);

  // Keep the address bar in step so any result can be linked or sent to a
  // friend. replaceState, not push: this must not fill up the back button.
  useEffect(() => {
    if (!restored) return;
    void Promise.resolve().then(() => {
      try {
        const q = new URLSearchParams({
          attended: String(attended), held: String(held), required: String(required),
        });
        window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
      } catch { /* history is unavailable in some embedded views */ }
    });
  }, [restored, attended, held, required]);

  const r = attendance(attended, held, required);
  const shown = Math.min(attended, held);
  const pctNum = r.rate * 100;
  const pct = pctNum.toFixed(1).replace(/\.0$/, "");
  const [markX, markY] = point(START + (required / 100) * SWEEP);

  return (
    <div className="ac">
      <div className="ac-inputs glass">
        <label className="ac-field">
          <span>Classes attended</span>
          <input type="number" inputMode="numeric" min={0} max={9999} value={attended}
                 onChange={(e) => setAttended(clampInt(e.target.value))} />
        </label>
        <label className="ac-field">
          <span>Classes held</span>
          <input type="number" inputMode="numeric" min={0} max={9999} value={held}
                 onChange={(e) => setHeld(clampInt(e.target.value))} />
        </label>
        <div className="ac-field ac-field-wide">
          <span id="ac-req">Attendance required</span>
          <div className="ac-presets" role="group" aria-labelledby="ac-req">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={required === p}
                      className={`ac-preset${required === p ? " is-on" : ""}`}
                      onClick={() => setRequired(p)}>{p}%</button>
            ))}
            {/* Courses set all sorts of thresholds, so the presets are a
                shortcut, not the list. The field is the source of truth: a
                preset writes into it and it highlights when they agree. */}
            <label className={`ac-custom${PRESETS.includes(required) ? "" : " is-on"}`}>
              <input
                type="number" inputMode="numeric" min={0} max={100} value={required}
                aria-label="Attendance required, percent"
                onChange={(e) => setRequired(clampInt(e.target.value, 100))}
              />
              <span aria-hidden="true">%</span>
            </label>
          </div>
        </div>
      </div>

      <div className="ac-out glass-raised">
        <div className="ac-gauge" data-ok={r.meets}>
          <svg viewBox="0 0 200 200" role="img"
               aria-label={`${pct} percent attendance against a ${required} percent requirement`}>
            <path d={arcTo(0, 100)} className="ac-track" />
            {pctNum > 0 && <path d={arcTo(0, Math.min(pctNum, 100))} className="ac-fill" />}
            {/* where the requirement sits, so the answer is visible before it is read */}
            <circle cx={markX} cy={markY} r="5.5" className="ac-mark" />
          </svg>
          <p className="ac-readout">
            <strong>{pct}<span>%</span></strong>
            <span className="ac-sub">
              {held === 0 ? "nothing held yet" : `${shown} of ${held} attended`}
            </span>
          </p>
        </div>

        <p className="ac-verdict" data-ok={r.meets} aria-live="polite">
          {held === 0
            ? `Nothing has been held yet, so you are not behind. You will need ${required}% once classes start.`
            : r.meets
              ? r.canMiss === Infinity
                ? "No minimum to hit, so nothing to worry about."
                : r.canMiss === 0
                  ? `You are exactly on ${required}%. Miss one more and you drop below it.`
                  : `You can miss ${r.canMiss} more ${r.canMiss === 1 ? "class" : "classes"} and still hold ${required}%.`
              : r.mustAttend === null
                ? `${required}% leaves no room at all: once you have missed one, it cannot be recovered.`
                : `You are below ${required}%. Attend the next ${r.mustAttend} ${r.mustAttend === 1 ? "class" : "classes"} in a row to get back to it.`}
        </p>

        <Link href="/login" className="ac-cta">
          Track this automatically<Icon name="arrow" size={16} />
        </Link>
        <p className="ac-note">
          Klasso keeps this running for every subject, so you never have to work it out again.
        </p>
      </div>
    </div>
  );
}
