/**
 * "What do I need on the final?" math — pure functions.
 * Generic weighted-average logic; no university cutoffs are assumed.
 */

import { round2 } from "./gpa";

export interface FinalGradeInput {
  /** Your current weighted percentage in the course so far (0–100). */
  currentScorePct: number;
  /** Percentage of the total course weight already graded (0–100, exclusive of 100). */
  weightCompletedPct: number;
  /** The overall percentage you want (0–100). */
  targetPct: number;
}

export interface FinalGradeResult {
  valid: boolean;
  error?: string;
  /** Score needed on the remaining weight (may exceed 100 → not feasible). */
  requiredScorePct: number;
  /** Weight still to be graded (100 − weightCompletedPct). */
  remainingWeightPct: number;
  /** Overall points already secured (currentScorePct × weightCompletedPct ÷ 100). */
  securedPct: number;
  /** True when the remaining weight can still deliver the target (required ≤ 100). */
  feasible: boolean;
  /** True when the target is already secured no matter what happens next. */
  alreadySecured: boolean;
  /** Best possible overall percentage (everything remaining at 100%). */
  maxPossiblePct: number;
}

const EMPTY: FinalGradeResult = {
  valid: false,
  requiredScorePct: 0,
  remainingWeightPct: 0,
  securedPct: 0,
  feasible: false,
  alreadySecured: false,
  maxPossiblePct: 0,
};

export function calcRequiredFinal(input: FinalGradeInput): FinalGradeResult {
  const { currentScorePct, weightCompletedPct, targetPct } = input;

  if (
    !Number.isFinite(currentScorePct) ||
    !Number.isFinite(weightCompletedPct) ||
    !Number.isFinite(targetPct)
  ) {
    return { ...EMPTY, error: "Enter all three values." };
  }
  if (currentScorePct < 0 || currentScorePct > 100) {
    return { ...EMPTY, error: "Your current score must be between 0 and 100." };
  }
  if (weightCompletedPct < 0 || weightCompletedPct >= 100) {
    return {
      ...EMPTY,
      error: "Completed weight must be at least 0 and below 100.",
    };
  }
  if (targetPct < 0 || targetPct > 100) {
    return { ...EMPTY, error: "Your target must be between 0 and 100." };
  }

  const remaining = 100 - weightCompletedPct;
  const secured = (currentScorePct * weightCompletedPct) / 100;
  const required = ((targetPct - secured) / remaining) * 100;

  return {
    valid: true,
    requiredScorePct: round2(Math.max(0, required)),
    remainingWeightPct: round2(remaining),
    securedPct: round2(secured),
    feasible: required <= 100,
    alreadySecured: required <= 0,
    maxPossiblePct: round2(secured + remaining),
  };
}
