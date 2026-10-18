import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import GpaCalculator from "@/components/public/tools/GpaCalculator";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "GPA Calculator (SGPA) — Free & Private",
  description:
    "Free GPA calculator for one semester: enter credit hours and letter grades to get your SGPA instantly. Editable grade scale, runs entirely in your browser.",
  alternates: { canonical: "/tools/gpa-calculator" },
};

export default function GpaCalculatorPage() {
  return (
    <ToolShell
      title="GPA / SGPA Calculator"
      description="A fast single-semester GPA: credit hours plus letter grades, with an editable scale and a result you can copy."
      path="/tools/gpa-calculator"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "What is the difference between GPA and SGPA?",
          a: "They are the same calculation applied to one semester: the credit-weighted average of your grade points. Some universities print “SGPA” on result cards to make clear it covers a single semester, while “GPA” may later refer to a cumulative figure.",
        },
        {
          q: "Does this calculator store my grades?",
          a: "No. Everything runs in your browser with JavaScript — no data is sent anywhere, no account is needed, and reopening the page starts from a clean slate.",
        },
        {
          q: "Can I use my own university's grade points?",
          a: "Yes. Open “Use my university's scale” and edit any value. Letter grades you leave in place keep the common 4.0 defaults; cleared fields are ignored entirely.",
        },
        {
          q: "Why does my result differ slightly from my university's?",
          a: "The most common causes are rounding rules (your university may round per-course or per-semester) and grade-point values that differ from the defaults here. Set your university's exact values in the scale editor and compare again.",
        },
      ]}
      related={[
        {
          href: "/tools/cgpa-calculator",
          label: "CGPA Calculator",
          description: "Combine several semesters into a cumulative CGPA.",
        },
        {
          href: "/tools/semester-gpa-planner",
          label: "Semester What-If Planner",
          description: "Preview your GPA with expected grades before results.",
        },
        {
          href: "/tools/grade-point-converter",
          label: "Grade Point Converter",
          description: "Turn letter grades into grade points on your scale.",
        },
      ]}
      explainer={
        <>
          <p>
            A semester GPA — often written SGPA — answers a narrow, useful
            question: <strong>how did this one semester go, weighted by the size
            of each course?</strong> It is the building block of the cumulative
            number, and it is easier to compute than most students think. Enter
            each course&rsquo;s credit hours and the letter grade you earned,
            and the calculator produces the weighted average immediately.
          </p>

          <h2>The formula, in one line</h2>
          <Callout tone="formula" title="Semester GPA (SGPA)">
            <p>
              <code>
                SGPA = Σ (credit hours × grade points) ÷ Σ (credit hours)
              </code>
            </p>
          </Callout>
          <p>
            In plain words: every course contributes its credit hours multiplied
            by its grade point value, you add those up, and you divide by the
            total credit hours. A 3-credit A contributes 12 quality points; a
            4-credit C+ contributes 9.32 on the common 4.0 scale. Bigger courses
            pull the average harder — that is the whole design of a
            credit-weighted GPA.
          </p>

          <AdSlot variant="in-article" />

          <h2>Worked through with real numbers</h2>
          <p>
            Say your semester is five courses: two 3-credit courses with an A
            (4.00) each, one 3-credit course with a B (3.00), one 3-credit
            course with a B&minus; (2.67) and one 1-credit lab with an A. The
            quality points are 12.00 + 12.00 + 9.00 + 8.01 + 4.00 = 45.01 over
            13 credit hours, giving an SGPA of 45.01 &divide; 13 = 3.46. Notice
            how the single-credit lab barely moves the needle — and how one B
            and one B&minus; cost far more than the lab could ever recover.
          </p>

          <h2>Getting a result that matches your university&rsquo;s</h2>
          <ul>
            <li>
              <strong>Use the exact grade points from your handbook.</strong>
              Defaults like A&minus; = 3.67 and B&minus; = 2.67 are common, but
              plenty of institutions use 3.70 and 2.70, or different letters
              altogether. The scale editor exists precisely for this.
            </li>
            <li>
              <strong>Watch for pass/fail and non-credit courses.</strong>{" "}
              Courses that carry no grade points or no credit hours are normally
              excluded from a GPA — simply leave them out, or give them 0 credit
              hours.
            </li>
            <li>
              <strong>Mind the rounding.</strong> Most universities round the
              final average to two decimals. This calculator rounds only the
              displayed result, never the underlying sums.
            </li>
          </ul>

          <h2>Where to go next</h2>
          <p>
            Once your semester&rsquo;s SGPA is in hand, the natural next step is
            the cumulative picture: the{" "}
            <a href="/tools/cgpa-calculator">CGPA calculator</a> combines
            multiple semesters, and the{" "}
            <a href="/tools/cgpa-improvement-planner">improvement planner</a>{" "}
            turns a target CGPA into a concrete average you need going forward.
            If results are not out yet, the{" "}
            <a href="/tools/semester-gpa-planner">what-if planner</a> lets you
            rehearse the outcome first. And remember: this is a planning tool —
            your university&rsquo;s official records are the final word.
          </p>
        </>
      }
    >
      <GpaCalculator />
    </ToolShell>
  );
}
