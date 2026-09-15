/**
 * The two questions a student actually asks about attendance.
 *
 * Both answers are exact integer counts, not rounded percentages: "you can
 * miss 3.4 classes" is useless, and rounding the wrong way tells someone they
 * are safe when they are one absence from falling short.
 */
export type AttendanceAnswer = {
  /** Current attendance as a fraction, 0-1. NaN-free: 0 held reads as 0. */
  rate: number;
  /** True when the current rate already meets the requirement. */
  meets: boolean;
  /**
   * How many more classes can be missed while still meeting the requirement,
   * assuming every remaining class counts. Zero when already short.
   */
  canMiss: number;
  /**
   * How many must be attended in a row to climb back to the requirement.
   * Zero when already meeting it, null when it can never be reached.
   */
  mustAttend: number | null;
};

export function attendance(attended: number, held: number, requiredPct: number): AttendanceAnswer {
  const a = Math.max(0, Math.floor(attended));
  const h = Math.max(0, Math.floor(held));
  const capped = Math.min(a, h);
  const need = Math.min(Math.max(requiredPct, 0), 100) / 100;
  const rate = h === 0 ? 0 : capped / h;
  const meets = h === 0 ? true : rate >= need;

  // a / (h + m) >= need  ->  m <= a/need - h
  const canMiss = need <= 0
    ? Infinity
    : Math.max(0, Math.floor(capped / need - h + 1e-9));

  // (a + n) / (h + n) >= need  ->  n >= (need*h - a) / (1 - need)
  let mustAttend: number | null = 0;
  if (!meets) {
    // At 100% required, missing even one class can never be recovered.
    mustAttend = need >= 1 ? null : Math.ceil((need * h - capped) / (1 - need) - 1e-9);
  }

  return { rate, meets, canMiss: meets ? canMiss : 0, mustAttend };
}
