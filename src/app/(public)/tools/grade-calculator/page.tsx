import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import FinalGradeCalculator from "@/components/public/tools/FinalGradeCalculator";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Final Grade Calculator — What Do I Need on the Final?",
  description:
    "Free final grade calculator: enter your current score, the weight already graded and your target, and see exactly what you need on the final exam.",
  alternates: { canonical: "/tools/grade-calculator" },
};

export default function GradeCalculatorPage() {
  return (
    <ToolShell
      title="Final Grade Calculator"
      description="“What do I need on the final?” — enter your current weighted score, the weight already graded and your target, and get the answer with a feasibility check."
      path="/tools/grade-calculator"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "How do I find the “weight already graded”?",
          a: "Open your course outline and add up the weights of every assessment that has already been marked — quizzes, assignments, sessional, midterm. The number you want is the total percentage those items are worth, not how many of them there were.",
        },
        {
          q: "What does “not reachable” mean?",
          a: "It means the score you would need exceeds 100%: even a perfect performance on the remaining weight cannot lift you to your target. The calculator shows the best percentage still possible so you can set a realistic new goal.",
        },
        {
          q: "Is my current score the average of my marks?",
          a: "It should be the weighted percentage: for each graded component, divide earned marks by total marks, multiply by its weight, and add everything up. The course total calculator on this site does exactly that calculation for you.",
        },
        {
          q: "Do curves or extra credit change the answer?",
          a: "A curve is applied by your instructor after grading, so it cannot be predicted here. Extra-credit marks behave like a higher score on a remaining component — if any are confirmed, re-run the calculation with the adjusted weight distribution.",
        },
      ]}
      related={[
        {
          href: "/tools/course-total-calculator",
          label: "Course Total Calculator",
          description:
            "Combine assignments, quizzes, sessional and exams into one weighted score.",
        },
        {
          href: "/tools/weighted-percentage-calculator",
          label: "Weighted Percentage Calculator",
          description: "A clean weighted average for any scores and weights.",
        },
        {
          href: "/tools/grade-point-converter",
          label: "Grade Point Converter",
          description: "Turn a percentage into a letter and grade points.",
        },
      ]}
      explainer={
        <>
          <p>
            The last month of a semester is dominated by one question:{" "}
            <strong>what do I need on the final?</strong> The answer is not a
            mystery — it is a weighted average waiting to be solved backwards.
            If your graded work so far is worth 60% of the course and you are
            averaging 72%, the 40% final can only do so much. This calculator
            solves for the exact final-exam score that lands you on your target,
            and tells you honestly when a target has become impossible.
          </p>

          <h2>The formula, rearranged</h2>
          <Callout tone="formula" title="Required score on the remaining weight">
            <p>
              <code>
                Secured = current score × weight graded ÷ 100
              </code>
            </p>
            <p>
              <code>
                Required = (target − secured) ÷ remaining weight × 100
              </code>
            </p>
          </Callout>
          <p>
            Both sides of the equation are just weighted percentages. Your
            current score, multiplied by the proportion of the course it
            covers, tells you how many points out of 100 you have already
            banked. The distance from there to your target has to be covered by
            the remaining weight — divide the gap by that weight and you have
            the score you need.
          </p>

          <AdSlot variant="in-article" />

          <h2>A worked example</h2>
          <p>
            Suppose quizzes, assignments, sessional and the midterm add up to
            60% of the course, and you are sitting at 72% on that work:{" "}
            72 &times; 0.60 = 43.2 points secured. Your target is 80, so you need
            80 &minus; 43.2 = 36.8 of the 40 points still in play. Divide 36.8
            by 40 and multiply by 100: <strong>you need 92% on the final</strong>
            . Feed the same numbers with a target of 85 into the calculator and
            it will quietly tell you that 104.5% is impossible — capping your
            realistic outcome at 83.2%.
          </p>

          <h2>Getting the inputs right</h2>
          <ul>
            <li>
              <strong>Weights come from your course outline</strong>, not from
              guesswork. If your outline says quizzes 10%, assignments 15%,
              sessional 15% and midterm 20%, then 60% is already graded.
            </li>
            <li>
              <strong>Your current score must be weighted</strong>, not a simple
              average. A quiz worth 10 marks and a midterm worth 40 marks do not
              count equally; the course total calculator combines them
              correctly.
            </li>
            <li>
              <strong>Treat everything still to come as one bucket.</strong>{" "}
              The final exam, a project or an upcoming quiz can all be lumped
              into “remaining weight” if none have been graded yet.
            </li>
          </ul>

          <h2>The planning angle</h2>
          <p>
            Used early, this tool changes how you study: if the required score
            is modest, protect it with steady work; if it is demanding, you know
            exactly how much every remaining mark is worth. And when a target
            genuinely becomes out of reach, the honest number here is better
            than false comfort — recalculate with a realistic goal and put the
            remaining effort where it still moves your CGPA. As always,
            instructor policies and your university&rsquo;s records are the
            final authority, not this estimate.
          </p>
        </>
      }
    >
      <FinalGradeCalculator />
    </ToolShell>
  );
}
