/**
 * CGPA improvement planning — pure functions.
 * Answers: "what average GPA do I need in my remaining credits to reach a
 * target CGPA?"
 */

import { round2 } from "./gpa";

export interface ImprovementInput {
  currentCgpa: number;
  creditsCompleted: number;
  targetCgpa: number;
  remainingCredits: number;
  /** Maximum grade point on the scale in use (default 4.0). */
  maxGpa?: number;
}

export interface ImprovementResult {
  valid: boolean;
  error?: string;
  /** Average GPA required across the remaining credits (clamped at 0). */
  requiredGpa: number | null;
  achievable: boolean;
  alreadyReached: boolean;
  /** Best possible final CGPA if the remaining credits are all maximum. */
  maxPossibleCgpa: number | null;
  /** Final CGPA if the remaining credits average a 0.0. */
  minPossibleCgpa: number | null;
}

const EMPTY: ImprovementResult = {
  valid: false,
  requiredGpa: null,
  achievable: false,
  alreadyReached: false,
  maxPossibleCgpa: null,
  minPossibleCgpa: null,
};

export function calcRequiredAverageGpa(
  input: ImprovementInput
): ImprovementResult {
  const max = input.maxGpa ?? 4.0;
  const { currentCgpa, creditsCompleted, targetCgpa, remainingCredits } = input;

  if (
    ![currentCgpa, creditsCompleted, targetCgpa, remainingCredits].every(
      Number.isFinite
    )
  ) {
    return { ...EMPTY, error: "Enter all four values." };
  }
  if (creditsCompleted < 0 || remainingCredits <= 0) {
    return {
      ...EMPTY,
      error: "Remaining credits must be greater than 0.",
    };
  }
  if (currentCgpa < 0 || currentCgpa > max || targetCgpa < 0 || targetCgpa > max) {
    return {
      ...EMPTY,
      error: `CGPA values must be between 0 and ${max}.`,
    };
  }

  const totalCredits = creditsCompleted + remainingCredits;
  const needed =
    (targetCgpa * totalCredits - currentCgpa * creditsCompleted) /
    remainingCredits;

  const maxPossibleCgpa =
    (currentCgpa * creditsCompleted + max * remainingCredits) / totalCredits;
  const minPossibleCgpa =
    (currentCgpa * creditsCompleted + 0 * remainingCredits) / totalCredits;

  return {
    valid: true,
    requiredGpa: round2(Math.max(0, needed)),
    achievable: needed <= max + 1e-9,
    alreadyReached: currentCgpa >= targetCgpa,
    maxPossibleCgpa: round2(maxPossibleCgpa),
    minPossibleCgpa: round2(minPossibleCgpa),
  };
}
