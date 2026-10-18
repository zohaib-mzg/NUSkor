import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import GradePointConverter from "@/components/public/tools/GradePointConverter";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Grade Point Converter — Letters, Points & Percentages",
  description:
    "Convert letter grades to grade points on your own scale, translate percentages into letters with cutoffs you enter, and see the quality points a course adds.",
  alternates: { canonical: "/tools/grade-point-converter" },
};

export default function GradePointConverterPage() {
  return (
    <ToolShell
      title="Grade Point Converter"
      description="Letters to grade points on an editable scale, percentages to letters using your own cutoffs — plus the quality points each course contributes."
      path="/tools/grade-point-converter"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "Where do the default grade points come from?",
          a: "They are a commonly used 4.0 arrangement (A = 4.00, A− = 3.67, B+ = 3.33, and so on). It is a starting point, not a standard — universities differ, which is why every value is editable in the scale editor.",
        },
        {
          q: "Why are the percentage cutoffs empty?",
          a: "Because cutoffs are the most institution-specific numbers in grading: what counts as an A, a B+ or even a pass varies between universities and often between courses. Prefilling them would plant someone else's rules in your results, so you enter them from your own handbook.",
        },
        {
          q: "How does one letter grade affect my SGPA?",
          a: "Through quality points: credit hours × grade points. On a 2.67 scale, a 3-credit B− adds 8.01 quality points; upgrading it to a B (3.00) adds 0.99. In a 15-credit semester that single change moves your SGPA by 0.99 ÷ 15 ≈ 0.07 — small but real, and it is the pattern behind every GPA strategy.",
        },
        {
          q: "My university's scale uses different letters. Can I still use this?",
          a: "Yes, within the common letter set shown: adjust each letter's grade point value to match your scale, and leave any letters you do not use empty. For percentage cutoffs, enter only the letters your institution actually awards.",
        },
      ]}
      related={[
        {
          href: "/tools/cgpa-calculator",
          label: "CGPA Calculator",
          description: "Carry grade points into your cumulative average.",
        },
        {
          href: "/tools/gpa-calculator",
          label: "GPA / SGPA Calculator",
          description: "Turn a semester of letters into one weighted number.",
        },
        {
          href: "/tools/course-total-calculator",
          label: "Course Total Calculator",
          description: "Know the percentage before you convert it to a letter.",
        },
      ]}
      explainer={
        <>
          <p>
            Grade points are the quiet currency of academic life: your letters
            are converted into them, multiplied by credit hours, and averaged
            into the GPA. The conversion itself is simple — but{" "}
            <strong>the exchange rate is set by your university</strong>, and no
            two handbooks are identical. This converter keeps the arithmetic
            neutral: you supply the scale and the cutoffs, it does the
            translation in both directions.
          </p>

          <h2>Two directions, one idea</h2>
          <Callout tone="formula" title="Conversions">
            <p>
              <code>Letter → grade points: read from your scale</code>
            </p>
            <p>
              <code>
                Percentage → letter: highest cutoff you meet wins
              </code>
            </p>
            <p>
              <code>Quality points = credit hours × grade points</code>
            </p>
          </Callout>
          <p>
            The percentage lookup works exactly like a grading table: cutoffs
            are minimum scores for each letter, and the letter you earned is the
            best one your percentage satisfies. The quality-points line connects
            this page to everything downstream — it is the same number that
            enters your semester GPA.
          </p>

          <AdSlot variant="in-article" />

          <h2>Worked example: what a letter is worth</h2>
          <p>
            Your handbook awards a B− 2.67 grade points. A 3-credit course with
            a B− therefore contributes 3 × 2.67 = 8.01 quality points. Push that
            course up to a B (3.00) and it contributes 9.00 — a gain of 0.99
            quality points. In a 15-credit semester, 0.99 ÷ 15 adds about 0.07
            to your SGPA. That is the entire mechanics of grade improvement:
            find the credit-heavy courses, move one letter, and the arithmetic
            does the rest.
          </p>

          <h2>Why the converter asks for your cutoffs</h2>
          <ul>
            <li>
              <strong>Because they are not universal.</strong> A cutoff table
              from one institution is fiction at another — sometimes fiction by
              several percentage points, sometimes by an entire letter.
            </li>
            <li>
              <strong>Because courses override scales.</strong> Some courses
              curve or set their own boundaries; when that happens, use their
              table, not your faculty&rsquo;s general one.
            </li>
            <li>
              <strong>Because accuracy compounds.</strong> The same letters feed
              every GPA calculation you make — a mis-mapped letter quietly
              distorts every average above it.
            </li>
          </ul>

          <h2>Where the points go next</h2>
          <p>
            Once letters map cleanly to points, the rest of the toolset snaps
            into place: the{" "}
            <a href="/tools/course-total-calculator">course total calculator</a>{" "}
            determines the percentage, this page converts it into points, and
            the <a href="/tools/cgpa-calculator">CGPA calculator</a> carries the
            points into your cumulative record. One caveat throughout: these are
            your numbers and honest arithmetic — your university&rsquo;s
            official scale and records are the final authority.
          </p>
        </>
      }
    >
      <GradePointConverter />
    </ToolShell>
  );
}
