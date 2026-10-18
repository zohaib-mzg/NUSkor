/**
 * Weighted mark math — pure functions.
 * - calcCourseTotal: combine graded components (earned/total + weight%) into
 *   one weighted percentage for a course.
 * - calcWeightedAverage: generic weighted average of any values + weights.
 */

import { round2 } from "./gpa";

export interface WeightedComponent {
  pointsEarned: number;
  pointsTotal: number;
  weightPct: number;
}

export interface WeightedTotalResult {
  /** Weighted total in percentage points (partial when weights < 100). */
  totalPct: number | null;
  weightSum: number;
  /** True when at least one valid component exists and weights total 100 ± 0.01. */
  valid: boolean;
  /** Human-readable note about the weight situation, when relevant. */
  note?: string;
}

export function calcCourseTotal(
  components: WeightedComponent[]
): WeightedTotalResult {
  let weightSum = 0;
  let total = 0;
  let counted = 0;

  for (const c of components) {
    const earned = Number(c.pointsEarned);
    const outOf = Number(c.pointsTotal);
    const weight = Number(c.weightPct);
    if (!Number.isFinite(earned) || earned < 0) continue;
    if (!Number.isFinite(outOf) || outOf <= 0) continue;
    if (!Number.isFinite(weight) || weight <= 0) continue;

    counted += 1;
    weightSum += weight;
    total += (earned / outOf) * weight;
  }

  if (counted === 0) {
    return { totalPct: null, weightSum: 0, valid: false };
  }

  const roundedSum = round2(weightSum);
  const valid = Math.abs(weightSum - 100) < 0.01;

  let note: string | undefined;
  if (weightSum > 100.009) {
    note = `Weights add up to ${roundedSum}% — that is more than 100%.`;
  } else if (!valid) {
    note = `Weights add up to ${roundedSum}% — ${round2(
      100 - weightSum
    )}% of the grade is not accounted for yet.`;
  }

  return {
    totalPct: round2(total),
    weightSum: roundedSum,
    valid,
    note,
  };
}

export interface WeightedItem {
  value: number;
  weight: number;
}

export function calcWeightedAverage(items: WeightedItem[]): {
  average: number | null;
  weightSum: number;
} {
  let weightSum = 0;
  let weighted = 0;

  for (const item of items) {
    const value = Number(item.value);
    const weight = Number(item.weight);
    if (!Number.isFinite(value)) continue;
    if (!Number.isFinite(weight) || weight <= 0) continue;
    weightSum += weight;
    weighted += value * weight;
  }

  return {
    average: weightSum > 0 ? round2(weighted / weightSum) : null,
    weightSum: round2(weightSum),
  };
}
