import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import WeightedPercentageCalculator from "@/components/public/tools/WeightedPercentageCalculator";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Weighted Percentage Calculator — Any Scores, Any Weights",
  description:
    "A clean weighted average calculator: enter any values and weights and get the normalised result instantly. No sign-up, nothing leaves your browser.",
  alternates: { canonical: "/tools/weighted-percentage-calculator" },
};

export default function WeightedPercentageCalculatorPage() {
  return (
    <ToolShell
      title="Weighted Percentage Calculator"
      description="Give every item a value and a weight — the calculator normalises and returns the weighted average, whatever the weights add up to."
      path="/tools/weighted-percentage-calculator"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "How is a weighted average different from a normal average?",
          a: "A normal average counts every entry equally. A weighted average multiplies each value by its importance before averaging. If a midterm counts triple a quiz, the midterm pulls three times as hard — exactly how most courses are graded.",
        },
        {
          q: "Do my weights need to add up to 100?",
          a: "No. The calculator normalises automatically: weights of 1, 2 and 3 behave identically to 10, 20 and 30. This makes it convenient for relative weights you assign yourself — just keep the ratios right.",
        },
        {
          q: "What kinds of values can I enter?",
          a: "Any numbers measured on the same scale: percentages, marks out of 20, marks out of 100 — as long as every entry uses the same unit, the average is meaningful. Mixing a percentage with raw marks produces a number without meaning.",
        },
        {
          q: "How is this different from the course total calculator?",
          a: "The course total calculator is specialised for one course: components with marks earned, marks out of, and weights that should total 100%, producing your standing out of 100. This page is the general-purpose version — any values, any weights, no assumptions.",
        },
      ]}
      related={[
        {
          href: "/tools/course-total-calculator",
          label: "Course Total Calculator",
          description: "The course-shaped version: components out of 100%.",
        },
        {
          href: "/tools/grade-calculator",
          label: "Final Grade Calculator",
          description: "Solve the weighted average backwards for a target.",
        },
        {
          href: "/tools/gpa-calculator",
          label: "GPA / SGPA Calculator",
          description: "Weighted averaging applied to credit hours and grades.",
        },
      ]}
      explainer={
        <>
          <p>
            Weighted averages run quietly through everything academic: your
            course grade weights each assessment, your GPA weights each course
            by credit hours, and your final percentage is one grand weighted
            combination of both. This calculator isolates the operation itself.
            Enter any items — values and weights — and see the properly
            normalised average, free of any assumption about what the numbers
            mean.
          </p>

          <h2>The formula</h2>
          <Callout tone="formula" title="Weighted average">
            <p>
              <code>Weighted average = Σ (value × weight) ÷ Σ (weight)</code>
            </p>
          </Callout>
          <p>
            That is the whole idea. Each value is multiplied by its weight,
            everything is added, and the total is divided by the sum of the
            weights. Normalisation is what makes weights flexible: they never
            need to reach 100 — the division handles the scale for you.
          </p>

          <AdSlot variant="in-article" />

          <h2>A worked example</h2>
          <p>
            Scores of 60, 80 and 70 with weights of 25, 25 and 50 give{" "}
            (60×25 + 80×25 + 70×50) ÷ 100 = 7,000 ÷ 100 = <strong>70</strong>.
            Now try the same scores with relative weights 1, 1 and 2:{" "}
            (60 + 80 + 140) ÷ 4 = 70 — identical, because only the ratios
            mattered. Change the middle weight from 1 to 3 and the average
            rises to (60 + 240 + 140) ÷ 6 ≈ 73.33: the higher score now pulls
            harder.
          </p>

          <h2>Where students use it</h2>
          <ul>
            <li>
              <strong>Custom marking schemes.</strong> When your instructor
              publishes relative weights — &ldquo;the project counts double
              the quizzes&rdquo; — enter them as 2 and 1.
            </li>
            <li>
              <strong>Combining overlapping components.</strong> Two partial
              scores on the same assessment combine cleanly when you weight
              them by the marks each covered.
            </li>
            <li>
              <strong>Cross-checking other tools.</strong> If the{" "}
              <a href="/tools/course-total-calculator">course total calculator</a>{" "}
              and this page disagree, one set of inputs is off — a useful
              sanity check before trusting either number.
            </li>
          </ul>

          <h2>One condition</h2>
          <p>
            All values must share a unit. Averaging a percentage with raw marks
            or a GPA with credit hours produces arithmetic that is valid but
            meaningless. Keep the unit consistent, keep the weights
            proportional to importance, and the result will be exactly what a
            weighted average should be. As with every nuSkor tool: it runs
            entirely in your browser, and official records remain the final
            authority.
          </p>
        </>
      }
    >
      <WeightedPercentageCalculator />
    </ToolShell>
  );
}
