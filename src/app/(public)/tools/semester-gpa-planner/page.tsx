import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import SemesterPlanner from "@/components/public/tools/SemesterPlanner";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Semester GPA Planner — What-If Grades Before Results",
  description:
    "Try expected grades per course and see the SGPA they would produce — before results are published. Editable grade scale, entirely in your browser.",
  alternates: { canonical: "/tools/semester-gpa-planner" },
};

export default function SemesterPlannerPage() {
  return (
    <ToolShell
      title="Semester What-If Planner"
      description="Rehearse the semester: assign expected grades to your courses and see the SGPA they would produce — the planning counterpart to the GPA calculator."
      path="/tools/semester-gpa-planner"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "Why plan with estimated grades?",
          a: "Because effort is finite and planning reveals where it matters most. A ten-second what-if pass over your courses shows which single letter would move the semester most — usually a credit-heavy course sitting on a boundary.",
        },
        {
          q: "Does the planner change anything official?",
          a: "No. It is a sandbox: nothing is stored anywhere and nothing connects to your university. Run any scenario you like — optimistic, realistic, worst case — and close the tab when done.",
        },
        {
          q: "How much does one course actually matter?",
          a: "Exactly (course credit hours ÷ semester credit hours) × the grade-point change. In a 15-credit semester, moving a 3-credit course up one letter (≈ 0.33 grade points) shifts the SGPA by 3 ÷ 15 × 0.33 ≈ 0.07. Small courses whisper; big courses talk.",
        },
        {
          q: "How is this different from the GPA calculator?",
          a: "They share the same maths. The GPA calculator is for grades you have already earned; this planner is for grades you expect — the button-free, judgement-free rehearsal before results are out.",
        },
      ]}
      related={[
        {
          href: "/tools/gpa-calculator",
          label: "GPA / SGPA Calculator",
          description: "The same maths for grades already in hand.",
        },
        {
          href: "/tools/cgpa-calculator",
          label: "CGPA Calculator",
          description: "See the semester's effect on your cumulative average.",
        },
        {
          href: "/tools/cgpa-improvement-planner",
          label: "CGPA Improvement Planner",
          description: "Turn expectations into a required-average target.",
        },
      ]}
      explainer={
        <>
          <p>
            Results season is a bad time to do arithmetic under pressure. The
            what-if planner moves that arithmetic earlier: months before
            finals, you can assign each course an expected grade and watch the
            projected SGPA take shape. The value is not the single number at the
            end — it is the sensitivity you feel while changing grades: how much
            each course moves the result, and where the remaining effort buys
            the most.
          </p>

          <h2>The formula it runs</h2>
          <Callout tone="formula" title="Projected SGPA">
            <p>
              <code>Quality points = credit hours × grade points</code>
            </p>
            <p>
              <code>Projected SGPA = total quality points ÷ total credits</code>
            </p>
          </Callout>
          <p>
            Identical to the GPA calculator, by design: realities and
            expectations should be measured with the same ruler. Grade points
            come from the editable scale, so every scenario reflects your own
            university&rsquo;s values rather than a hypothetical one.
          </p>

          <AdSlot variant="in-article" />

          <h2>A scenario, worked</h2>
          <p>
            Imagine a 12-credit semester: a 3-credit course you expect an A&minus;
            in (3 × 3.67 = 11.01), a 4-credit course expecting B+ (4 × 3.33 =
            13.32), a 3-credit course expecting B (3 × 3.00 = 9.00) and a
            2-credit course expecting A (2 × 4.00 = 8.00). Total quality points:
            41.33 over 12 credits — a projected SGPA of <strong>3.44</strong>.
            Now change only the 4-credit course to A&minus;: the total rises by 4
            × 0.34 = 1.36, giving 3.56. One course, one letter, +0.12 of SGPA —
            that is the insight the planner exists to deliver.
          </p>

          <h2>Ways to use the sandbox</h2>
          <ul>
            <li>
              <strong>Best case, worst case, likely case.</strong> Run three
              quick scenarios to bracket the semester instead of pinning hopes
              on one guess.
            </li>
            <li>
              <strong>Find the leverage.</strong> Bump each course by one letter
              in turn; the one that moves the number most deserves your
              remaining hours.
            </li>
            <li>
              <strong>Feed the improvement planner.</strong> A realistic
              projected SGPA becomes today&rsquo;s contribution to the target
              average on your remaining credits.
            </li>
          </ul>

          <h2>Keep the frame honest</h2>
          <p>
            Projections are guesses raised to two decimals — treat them as
            signals, not promises. The point is direction: which course,
            roughly how much, and whether the semester can still carry your{" "}
            <a href="/tools/cgpa-calculator">cumulative</a> goals. When results
            arrive, the <a href="/tools/gpa-calculator">GPA calculator</a> turns
            guesswork into record. Estimates for planning only; your
            university&rsquo;s marksheet is the truth.
          </p>
        </>
      }
    >
      <SemesterPlanner />
    </ToolShell>
  );
}
