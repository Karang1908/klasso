"use client";

import { useState } from "react";
import { finalNeeded } from "@/lib/grade-math";

const TARGETS = [40, 50, 60, 70, 75, 80, 90];

export function FinalGradeCalculator() {
  const [current, setCurrent] = useState(68);
  const [weight, setWeight] = useState(40);
  const [target, setTarget] = useState(75);

  const clampPct = (v: unknown) => Math.max(0, Math.min(100, Math.round((Number(v) || 0) * 10) / 10));
  const r = finalNeeded(current, weight, target);

  return (
    <div className="ac">
      <div className="ac-inputs glass">
        <label className="ac-field">
          <span>Grade so far</span>
          <input type="number" inputMode="decimal" min={0} max={100} value={current}
                 onChange={(e) => setCurrent(clampPct(e.target.value))} />
        </label>
        <label className="ac-field">
          <span>Final is worth</span>
          <input type="number" inputMode="decimal" min={0} max={100} value={weight}
                 onChange={(e) => setWeight(clampPct(e.target.value))} />
        </label>
        <div className="ac-field ac-field-wide">
          <span id="fg-t">Grade you want overall</span>
          <div className="ac-presets" role="group" aria-labelledby="fg-t">
            {TARGETS.map((t) => (
              <button key={t} type="button" aria-pressed={target === t}
                      className={`ac-preset${target === t ? " is-on" : ""}`}
                      onClick={() => setTarget(t)}>{t}%</button>
            ))}
            <label className={`ac-custom${TARGETS.includes(target) ? "" : " is-on"}`}>
              <input type="number" inputMode="numeric" min={0} max={100} value={target}
                     aria-label="Target grade, percent"
                     onChange={(e) => setTarget(clampPct(e.target.value))} />
              <span aria-hidden="true">%</span>
            </label>
          </div>
        </div>
      </div>

      <div className="ac-out glass-raised">
        <p className="ac-readout ac-readout-flow" data-ok={r.achievable}>
          <strong>{r.secured ? "Done" : `${Math.max(0, r.needed)}`}<span>{r.secured ? "" : "%"}</span></strong>
          <span className="ac-sub">{r.secured ? "already secured" : "needed in the final"}</span>
        </p>
        <p className="ac-verdict" data-ok={r.achievable} aria-live="polite">
          {weight === 0
            ? "A final worth nothing cannot change your grade either way."
            : r.secured
              ? `You have already secured ${target}% overall, whatever happens in the final.`
              : r.achievable
                ? `Score ${r.needed}% in the final to finish on ${target}% overall.`
                : `${target}% is out of reach: even 100% in the final leaves you short, because you would need ${r.needed}%.`}
        </p>
      </div>
    </div>
  );
}
