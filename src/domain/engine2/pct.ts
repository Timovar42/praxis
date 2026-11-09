import type { Settings } from '../types';

export const PCT_TABLE: Record<number, number> = {
  1: 1.0,
  2: 0.955,
  3: 0.922,
  4: 0.892,
  5: 0.863,
  6: 0.837,
  7: 0.811,
  8: 0.786,
  9: 0.762,
  10: 0.739,
  11: 0.707,
  12: 0.68,
};

/**
 * Calculates percentage of 1RM for n = reps + RIR (where RIR = 10 - RPE).
 * Supports standard table with linear interpolation for fractional n,
 * hyperbola continuation for n > 12, or optional Epley / Brzycki formulas.
 */
export function pct(n: number, formula?: Settings['formula']): number {
  if (formula === 'epley') {
    return 1 / (1 + n / 30);
  }
  if (formula === 'brzycki') {
    return Math.max(0.01, (37 - n) / 36);
  }

  // Primary Engine v2 formula
  if (n <= 1) return 1.0;

  if (n <= 12) {
    const floor = Math.floor(n);
    const ceil = Math.ceil(n);
    if (floor === ceil) {
      return PCT_TABLE[floor] ?? 1.0;
    }
    const v0 = PCT_TABLE[floor] ?? 1.0;
    const v1 = PCT_TABLE[ceil] ?? PCT_TABLE[12];
    const frac = n - floor;
    return v0 + frac * (v1 - v0);
  }

  // For n > 12: pct(n) = 0.680 * 1.4 / (1 + n/30)
  return (0.68 * 1.4) / (1 + n / 30);
}
