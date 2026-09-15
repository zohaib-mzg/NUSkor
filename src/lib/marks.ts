/**
 * Centralized marks statistics calculation.
 *
 * All statistics are derived from VALID NUMERIC MARKS ONLY.
 * N/A, null, undefined, empty string, "N/A", "NA", "-" are NOT counted.
 * A genuine mark of 0 IS a valid mark.
 */

const TRIM_PROPORTION = 0.10;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed.toUpperCase() === "N/A" || trimmed === "-" || trimmed === "NA") return null;
    const num = Number(trimmed);
    if (isNaN(num)) return null;
    return num;
  }
  return null;
}

/**
 * Trimmed mean with default 10% trimming.
 * Sorted: x₁ ≤ x₂ ≤ ... ≤ xₙ
 * k = floor(0.10 × n)
 * Remove k lowest and k highest, then average the rest.
 * For small datasets where k = 0, returns simple mean.
 * Result is rounded to 2 decimal places.
 */
function trimmedMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(TRIM_PROPORTION * n);
  let mean: number;
  if (k === 0) {
    mean = sorted.reduce((s, v) => s + v, 0) / n;
  } else {
    const trimmed = sorted.slice(k, n - k);
    if (trimmed.length === 0) return null;
    mean = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
  }
  return Math.round(mean * 100) / 100;
}

export interface AssessmentStatistics {
  totalStudents: number;
  markedCount: number;
  unmarkedCount: number;
  markedPercentage: number;
  highest: number | null;
  lowest: number | null;
  avg: number | null;
  avgPct: number | null;
  maxMarks: number;
}

/**
 * Calculate assessment statistics from enrolled students and their marks.
 *
 * @param totalEnrolled - Number of enrolled students in the section
 * @param marks - Array of mark values (number | null | string). Null/empty/N/A = not marked.
 * @param totalMarks - The assessment's total marks (max score)
 * @returns AssessmentStatistics
 */
export function calculateAssessmentStats(
  totalEnrolled: number,
  marks: (number | null | undefined | string)[],
  totalMarks: number
): AssessmentStatistics {
  const validMarks: number[] = [];
  for (const m of marks) {
    const n = toNumber(m);
    if (n !== null) validMarks.push(n);
  }

  const markedCount = validMarks.length;
  const unmarkedCount = totalEnrolled - markedCount;
  const markedPercentage = totalEnrolled > 0 ? (markedCount / totalEnrolled) * 100 : 0;
  const highest = markedCount > 0 ? Math.max(...validMarks) : null;
  const lowest = markedCount > 0 ? Math.min(...validMarks) : null;
  const mean = trimmedMean(validMarks);
  const avgPct = mean !== null && totalMarks > 0 ? Math.round((mean / totalMarks) * 10000) / 100 : null;

  return {
    totalStudents: totalEnrolled,
    markedCount,
    unmarkedCount,
    markedPercentage,
    highest,
    lowest,
    avg: mean,
    avgPct,
    maxMarks: totalMarks,
  };
}
