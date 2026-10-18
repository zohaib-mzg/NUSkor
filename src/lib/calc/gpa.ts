/**
 * GPA / SGPA / CGPA math. Pure functions — no side effects, safe to unit-test.
 * All results are rounded to 2 decimals for display; invalid rows (NaN,
 * negative, zero-credit) are skipped instead of poisoning the result.
 */

export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export interface CourseGpaInput {
  creditHours: number;
  gradePoints: number;
}

export interface GpaTotals {
  /** Total credit hours counted. */
  credits: number;
  /** Credit hours × grade points. */
  qualityPoints: number;
  /** Quality points ÷ credits, rounded to 2 decimals; null when no credits. */
  gpa: number | null;
}

export function sumCourses(courses: CourseGpaInput[]): GpaTotals {
  let credits = 0;
  let quality = 0;

  for (const course of courses) {
    const ch = Number(course.creditHours);
    const gp = Number(course.gradePoints);
    if (!Number.isFinite(ch) || ch <= 0) continue;
    if (!Number.isFinite(gp) || gp < 0) continue;
    credits += ch;
    quality += ch * gp;
  }

  return {
    credits,
    qualityPoints: quality,
    gpa: credits > 0 ? round2(quality / credits) : null,
  };
}

/** Combine two totals (e.g. previous record + current semester). */
export function combineTotals(a: GpaTotals, b: GpaTotals): GpaTotals {
  const credits = a.credits + b.credits;
  const quality = a.qualityPoints + b.qualityPoints;
  return {
    credits,
    qualityPoints: quality,
    gpa: credits > 0 ? round2(quality / credits) : null,
  };
}
