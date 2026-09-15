"use client";

import { useState } from "react";
import Link from "next/link";
import { attendance } from "@/lib/attendance-math";
import { Icon } from "./icons";

/** Requirements people actually have. 75% is the common Indian university rule. */
const PRESETS = [60, 65, 70, 75, 80, 85];

export function AttendanceCalculator() {
  const [attended, setAttended] = useState(40);
  const [held, setHeld] = useState(50);
  const [required, setRequired] = useState(75);

  const r = attendance(attended, held, required);
  const pct = (r.rate * 100).toFixed(1).replace(/\.0$/, "");

  const num = (v: string) => Math.max(0, Math.min(9999, Math.floor(Number(v) || 0)));

  return (
    <div className="ac">
      <div className="ac-inputs glass">
        <label className="ac-field">
          <span>Classes attended</span>
          <input type="number" inputMode="numeric" min={0} max={9999} value={attended}
                 onChange={(e) => setAttended(num(e.target.value))} />
        </label>
        <label className="ac-field">
          <span>Classes held</span>
          <input type="number" inputMode="numeric" min={0} max={9999} value={held}
                 onChange={(e) => setHeld(num(e.target.value))} />
        </label>
        <div className="ac-field">
          <span id="ac-req">Attendance required</span>
          <div className="ac-presets" role="group" aria-labelledby="ac-req">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={required === p}
                      className={`ac-preset${required === p ? " is-on" : ""}`}
                      onClick={() => setRequired(p)}>{p}%</button>
            ))}
          </div>
        </div>
      </div>

      <div className="ac-out glass-raised" aria-live="polite">
        <p className="ac-rate" data-ok={r.meets}>
          <strong>{pct}%</strong>
          <span>{held === 0 ? "no classes held yet" : `${Math.min(attended, held)} of ${held} attended`}</span>
        </p>

        <p className="ac-verdict" data-ok={r.meets}>
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
