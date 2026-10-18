/**
 * Attendance planning — pure functions.
 * The allowed-absence percentage is always entered by the user; nothing here
 * assumes any university's attendance policy. Estimates only.
 */

import { round2 } from "./gpa";

export interface AttendanceInput {
  classesHeld: number;
  classesAttended: number;
  /** The attendance percentage you need (0–100). */
  requiredPct: number;
}

export interface AttendanceResult {
  valid: boolean;
  error?: string;
  /** Current attendance percentage. */
  currentPct: number;
  /**
   * How many of the NEXT consecutive classes you can miss and still stay at
   * or above the requirement (only set when you are currently above it).
   */
  canMiss: number | null;
  /**
   * How many consecutive future classes you must attend to get back to the
   * requirement (only set when you are currently below it).
   */
  mustAttend: number | null;
  /** True when the requirement can still be reached. */
  recoverable: boolean;
}

const EMPTY: AttendanceResult = {
  valid: false,
  currentPct: 0,
  canMiss: null,
  mustAttend: null,
  recoverable: true,
};

export function calcAttendance(input: AttendanceInput): AttendanceResult {
  const { classesHeld, classesAttended, requiredPct } = input;

  if (![classesHeld, classesAttended, requiredPct].every(Number.isFinite)) {
    return { ...EMPTY, error: "Enter all three values." };
  }
  if (classesHeld <= 0) {
    return { ...EMPTY, error: "Classes held must be greater than 0." };
  }
  if (classesAttended < 0 || classesAttended > classesHeld) {
    return {
      ...EMPTY,
      error: "Classes attended must be between 0 and classes held.",
    };
  }
  if (requiredPct <= 0 || requiredPct > 100) {
    return {
      ...EMPTY,
      error: "The required percentage must be greater than 0 and at most 100.",
    };
  }

  const current = (classesAttended / classesHeld) * 100;
  const r = requiredPct / 100;

  if (current + 1e-9 >= requiredPct) {
    const canMiss =
      requiredPct >= 100
        ? 0
        : Math.max(0, Math.floor(classesAttended / r - classesHeld + 1e-9));
    return {
      valid: true,
      currentPct: round2(current),
      canMiss,
      mustAttend: null,
      recoverable: true,
    };
  }

  // Currently below the requirement.
  if (requiredPct >= 100 && classesAttended < classesHeld) {
    return {
      valid: true,
      currentPct: round2(current),
      canMiss: null,
      mustAttend: null,
      recoverable: false,
      error: undefined,
    };
  }

  const mustAttend = Math.ceil(
    (r * classesHeld - classesAttended) / (1 - r) - 1e-9
  );

  return {
    valid: true,
    currentPct: round2(current),
    canMiss: null,
    mustAttend,
    recoverable: true,
  };
}
