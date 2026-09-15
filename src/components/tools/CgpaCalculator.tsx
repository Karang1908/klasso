"use client";

import { useState } from "react";
import { CGPA_FORMULAS, cgpaToPercent, percentToCgpa, type CgpaFormula } from "@/lib/grade-math";

/** Which way the visitor is converting. Both directions are searched. */
type Dir = "toPercent" | "toCgpa";

export function CgpaCalculator() {
  const [dir, setDir] = useState<Dir>("toPercent");
  const [cgpa, setCgpa] = useState("8.2");
  const [percent, setPercent] = useState("77.9");
  const [formula, setFormula] = useState<CgpaFormula>("x9.5");

  const out = dir === "toPercent"
    ? cgpaToPercent(Number(cgpa), formula)
    : percentToCgpa(Number(percent), formula);
  const chosen = CGPA_FORMULAS.find((f) => f.id === formula)!;

  return (
    <div className="ac">
      <div className="ac-inputs glass">
        <div className="ac-field ac-field-wide">
          <span id="cg-dir">Convert</span>
          <div className="ac-presets" role="group" aria-labelledby="cg-dir">
            <button type="button" aria-pressed={dir === "toPercent"}
                    className={`ac-preset${dir === "toPercent" ? " is-on" : ""}`}
                    onClick={() => setDir("toPercent")}>CGPA to percentage</button>
            <button type="button" aria-pressed={dir === "toCgpa"}
                    className={`ac-preset${dir === "toCgpa" ? " is-on" : ""}`}
                    onClick={() => setDir("toCgpa")}>Percentage to CGPA</button>
          </div>
        </div>

        <label className="ac-field ac-field-wide">
          <span>{dir === "toPercent" ? "Your CGPA (out of 10)" : "Your percentage"}</span>
          <input
            type="number" inputMode="decimal" step="0.01"
            min={0} max={dir === "toPercent" ? 10 : 100}
            value={dir === "toPercent" ? cgpa : percent}
            onChange={(e) => dir === "toPercent" ? setCgpa(e.target.value) : setPercent(e.target.value)}
          />
        </label>

        <div className="ac-field ac-field-wide">
          <span id="cg-f">Formula your university uses</span>
          <div className="ac-presets ac-presets-stack" role="group" aria-labelledby="cg-f">
            {CGPA_FORMULAS.map((f) => (
              <button key={f.id} type="button" aria-pressed={formula === f.id}
                      className={`ac-preset${formula === f.id ? " is-on" : ""}`}
                      onClick={() => setFormula(f.id)}>{f.label}</button>
            ))}
          </div>
          <p className="ac-hint">{chosen.note}. Check your handbook if you are unsure.</p>
        </div>
      </div>

      <div className="ac-out glass-raised">
        <p className="ac-readout ac-readout-flow">
          <strong>
            {out}
            <span>{dir === "toPercent" ? "%" : " CGPA"}</span>
          </strong>
          <span className="ac-sub" aria-live="polite">
            {dir === "toPercent"
              ? `${cgpa || 0} CGPA on ${chosen.label}`
              : `${percent || 0}% on ${chosen.label}`}
          </span>
        </p>
        <p className="ac-note">
          Different institutions use different formulas, so the figure that counts is the one
          in your own handbook.
        </p>
      </div>
    </div>
  );
}
