/**
 * Catalogue of the public (university-neutral) student tools.
 * Used by the home page, the /tools hub, related-links blocks and the sitemap.
 */

export interface ToolMeta {
  slug: string;
  title: string;
  /** One or two short sentences for cards and related links. */
  blurb: string;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: "cgpa-calculator",
    title: "CGPA Calculator",
    blurb:
      "Plan multiple semesters with an editable grade scale and get SGPA plus cumulative CGPA.",
  },
  {
    slug: "gpa-calculator",
    title: "GPA / SGPA Calculator",
    blurb:
      "A fast single-semester GPA from your credit hours and letter grades.",
  },
  {
    slug: "grade-calculator",
    title: "Final Grade Calculator",
    blurb:
      "\u201cWhat do I need on the final?\u201d — enter your weights and target and find out.",
  },
  {
    slug: "course-total-calculator",
    title: "Course Total Calculator",
    blurb:
      "Combine assignments, quizzes, sessional, midterm and final into one weighted total.",
  },
  {
    slug: "cgpa-improvement-planner",
    title: "CGPA Improvement Planner",
    blurb:
      "See the average GPA you need in your remaining credits to reach a target CGPA.",
  },
  {
    slug: "attendance-calculator",
    title: "Attendance Calculator",
    blurb:
      "Your current attendance, classes you can still miss, and classes needed to recover.",
  },
  {
    slug: "grade-point-converter",
    title: "Grade Point Converter",
    blurb:
      "Convert letter grades to grade points using the scale you enter.",
  },
  {
    slug: "weighted-percentage-calculator",
    title: "Weighted Percentage Calculator",
    blurb:
      "A clean weighted average for any scores and weights you enter.",
  },
  {
    slug: "semester-gpa-planner",
    title: "Semester What-If Planner",
    blurb:
      "Try what-if grades per course and see the GPA effect before results are out.",
  },
];

export const TOOL_SLUGS = TOOLS.map((t) => t.slug);

/** Shown as the "Last updated" line on tool pages. Fixed string, updated by hand. */
export const TOOLS_LAST_REVIEWED = "October 2026";

export function toolHref(slug: string): string {
  return `/tools/${slug}`;
}
