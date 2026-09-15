"use client";

import { useState } from "react";
import { weightedGpa, type GradeRow } from "@/lib/grade-math";
import { Icon } from "../icons";

const SCALES = [10, 4];
const BLANK: GradeRow = { credits: 0, points: 0 };

export function GpaCalculator() {
  const [scale, setScale] = useState(10);
  const [rows, setRows] = useState<GradeRow[]>([
    { credits: 4, points: 9 },
    { credits: 3, points: 8 },
    { credits: 3, points: 7 },
  ]);

  const num = (v: unknown, hi: number) => Math.max(0, Math.min(hi, Math.round((Number(v) || 0) * 100) / 100));
  const set = (i: number, patch: Partial<GradeRow>) =>
    setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const { gpa, credits } = weightedGpa(rows, scale);

  return (
    <div className="ac">
      <div className="ac-inputs glass">
        <div className="ac-field ac-field-wide">
          <span id="gp-s">Grade scale</span>
          <div className="ac-presets" role="group" aria-labelledby="gp-s">
            {SCALES.map((s) => (
              <button key={s} type="button" aria-pressed={scale === s}
                      className={`ac-preset${scale === s ? " is-on" : ""}`}
                      onClick={() => setScale(s)}>{s}-point</button>
            ))}
          </div>
        </div>

        <div className="ac-field ac-field-wide">
          <span>Your courses</span>
          <ul className="gpa-rows">
            <li className="gpa-head" aria-hidden="true"><span>Credits</span><span>Grade points</span><span /></li>
            {rows.map((row, i) => (
              <li className="gpa-row" key={i}>
                <input type="number" inputMode="decimal" min={0} max={30} value={row.credits}
                       aria-label={`Credits for course ${i + 1}`}
                       onChange={(e) => set(i, { credits: num(e.target.value, 30) })} />
                <input type="number" inputMode="decimal" min={0} max={scale} value={row.points}
                       aria-label={`Grade points for course ${i + 1}`}
                       onChange={(e) => set(i, { points: num(e.target.value, scale) })} />
                <button type="button" className="gpa-del" aria-label={`Remove course ${i + 1}`}
                        disabled={rows.length === 1}
                        onClick={() => setRows((rs) => rs.filter((_, n) => n !== i))}>
                  <Icon name="close" size={15} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="gpa-add" onClick={() => setRows((rs) => [...rs, { ...BLANK }])}>
            <Icon name="plus" size={16} />Add a course
          </button>
        </div>
      </div>

      <div className="ac-out glass-raised">
        <p className="ac-readout ac-readout-flow">
          <strong>{gpa}<span> / {scale}</span></strong>
          <span className="ac-sub" aria-live="polite">
            {credits === 0 ? "add credits to see your GPA" : `across ${credits} credits`}
          </span>
        </p>
        <p className="ac-note">
          Courses with no credits are left out rather than counted as zero, so a half-filled
          form still gives you a real answer.
        </p>
      </div>
    </div>
  );
}
