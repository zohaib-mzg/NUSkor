/**
 * Grade-point data for the public tools.
 *
 * The scale below is a COMMONLY USED 4.0 scale — it is only a default.
 * Grade scales differ between universities and even between programs, so every
 * tool that uses these values lets the visitor edit them ("Use my university's
 * scale"). Always check your own handbook or course outline.
 *
 * No university-specific rules (pass marks, minimum thresholds, cutoffs)
 * are defined here — or anywhere in the public site.
 */

export interface GradeScaleEntry {
  letter: string;
  points: number;
}

export const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { letter: "A+", points: 4.0 },
  { letter: "A", points: 4.0 },
  { letter: "A-", points: 3.67 },
  { letter: "B+", points: 3.33 },
  { letter: "B", points: 3.0 },
  { letter: "B-", points: 2.67 },
  { letter: "C+", points: 2.33 },
  { letter: "C", points: 2.0 },
  { letter: "C-", points: 1.67 },
  { letter: "D+", points: 1.33 },
  { letter: "D", points: 1.0 },
  { letter: "F", points: 0.0 },
];

/** Shown next to the scale on tool pages. Fixed string, updated by hand. */
export const GRADING_LAST_REVIEWED = "October 2026";

export function gradePointsFor(
  scale: GradeScaleEntry[],
  letter: string
): number | null {
  const entry = scale.find((e) => e.letter === letter);
  return entry ? entry.points : null;
}
