/**
 * The arithmetic behind the public calculators.
 *
 * Kept apart from any component so it can be tested directly: every one of
 * these answers a question a student is about to make a decision on, and a
 * rounding error in the wrong direction is worse than no answer at all.
 */

// ---------------------------------------------------------------- CGPA
/**
 * Institutions do not agree on how a CGPA becomes a percentage, so the
 * conversion is a choice rather than a constant. These are the three in
 * common use; the handbook wins over any of them.
 */
export type CgpaFormula = "x9.5" | "x10" | "minus0.75";

export const CGPA_FORMULAS: { id: CgpaFormula; label: string; note: string }[] = [
  { id: "x9.5", label: "CGPA × 9.5", note: "CBSE and many Indian universities" },
  { id: "x10", label: "CGPA × 10", note: "Straight ten-point scale" },
  { id: "minus0.75", label: "(CGPA − 0.75) × 10", note: "VTU and some autonomous colleges" },
];

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function cgpaToPercent(cgpa: number, formula: CgpaFormula = "x9.5"): number {
  const c = clamp(Number(cgpa) || 0, 0, 10);
  const pct = formula === "x9.5" ? c * 9.5
    : formula === "x10" ? c * 10
    : (c - 0.75) * 10;
  return round2(clamp(pct, 0, 100));
}

export function percentToCgpa(percent: number, formula: CgpaFormula = "x9.5"): number {
  const p = clamp(Number(percent) || 0, 0, 100);
  const cgpa = formula === "x9.5" ? p / 9.5
    : formula === "x10" ? p / 10
    : p / 10 + 0.75;
  return round2(clamp(cgpa, 0, 10));
}

// --------------------------------------------------------- final exam
export type FinalNeed = {
  /** The mark required in the final, as a percentage. May exceed 100. */
  needed: number;
  /** False when even 100% in the final cannot reach the target. */
  achievable: boolean;
  /** True when the target is already secured whatever the final brings. */
  secured: boolean;
};

/**
 * What the final has to score to reach a target overall.
 *
 * target = current * (1 - weight) + needed * weight
 */
export function finalNeeded(currentPct: number, finalWeightPct: number, targetPct: number): FinalNeed {
  const current = clamp(Number(currentPct) || 0, 0, 100);
  const target = clamp(Number(targetPct) || 0, 0, 100);
  const w = clamp(Number(finalWeightPct) || 0, 0, 100) / 100;

  // A final worth nothing cannot move the grade in either direction.
  if (w === 0) {
    return { needed: 0, achievable: current >= target, secured: current >= target };
  }
  const needed = round2((target - current * (1 - w)) / w);
  return { needed, achievable: needed <= 100, secured: needed <= 0 };
}

// ---------------------------------------------------------------- GPA
export type GradeRow = { credits: number; points: number };

/**
 * Credit-weighted average. Courses with no credits are ignored rather than
 * counted as zero, which is what makes a half-filled form still useful.
 */
export function weightedGpa(rows: GradeRow[], scaleMax = 10): { gpa: number; credits: number } {
  let weighted = 0, credits = 0;
  for (const row of rows) {
    const c = Math.max(0, Number(row.credits) || 0);
    const p = clamp(Number(row.points) || 0, 0, scaleMax);
    if (c <= 0) continue;
    weighted += c * p;
    credits += c;
  }
  return { gpa: credits === 0 ? 0 : round2(weighted / credits), credits: round2(credits) };
}
