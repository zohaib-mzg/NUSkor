import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import CourseTotalCalculator from "@/components/public/tools/CourseTotalCalculator";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Course Total Calculator — Weighted Marks Made Simple",
  description:
    "Free course total calculator: combine assignments, quizzes, sessional, midterm and final into one weighted percentage, with weight validation as you type.",
  alternates: { canonical: "/tools/course-total-calculator" },
};

export default function CourseTotalCalculatorPage() {
  return (
    <ToolShell
      title="Course Total Calculator"
      description="Combine assignments, quizzes, sessional, midterm and final exams into one weighted percentage — with a live check that your weights add up to 100%."
      path="/tools/course-total-calculator"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "What if my components' weights don't add up to 100%?",
          a: "The calculator still shows the total points secured from the weights entered, but flags that part of the course is unaccounted for. That usually means an assessment is missing or one weight was mistyped — check your course outline and adjust.",
        },
        {
          q: "Can I use raw marks instead of percentages?",
          a: "Yes — enter each component's marks earned and the total marks it was out of (for example 18 out of 20). The calculator converts everything to percentages internally and applies the weights.",
        },
        {
          q: "How is this different from an average of my marks?",
          a: "A plain average treats every assessment equally. A course total is weight-sensitive: a midterm worth 20% of the course moves your result four times as much as a quiz worth 5%. This calculator reproduces that weighting exactly.",
        },
        {
          q: "Should I include lab, project or attendance marks?",
          a: "Include any component that carries marks in your course outline, using its stated weight. If a component has not been graded yet, leave its marks empty — the tool accounts for its weight in the coverage bar but contributes zero points until you fill it in.",
        },
        {
          q: "Does this give me my letter grade?",
          a: "Not by itself — grading cutoffs differ between universities and courses. Pair the weighted total with the grade point converter, where you can enter your own university's percentage cutoffs and see which letter that total corresponds to.",
        },
      ]}
      related={[
        {
          href: "/tools/grade-calculator",
          label: "Final Grade Calculator",
          description: "What score you need on the remaining weight.",
        },
        {
          href: "/tools/weighted-percentage-calculator",
          label: "Weighted Percentage Calculator",
          description: "A pure weighted average for any set of scores.",
        },
        {
          href: "/tools/grade-point-converter",
          label: "Grade Point Converter",
          description: "Map a percentage to a letter and grade points.",
        },
        {
          href: "/tools/cgpa-calculator",
          label: "CGPA Calculator",
          description: "Turn course outcomes into semester and cumulative GPA.",
        },
      ]}
      explainer={
        <>
          <p>
            Most courses are not graded as one exam — they are graded as a
            bundle: assignments at 10%, quizzes at 10%, sessional at 15%, a
            midterm at 20%, a final at 45%. To know where you stand mid-semester,
            you have to add those pieces together correctly, weighting each one
            by its share of the course. That is exactly what this calculator
            does, and it double-checks your weights while it works.
          </p>

          <h2>The formula</h2>
          <Callout tone="formula" title="Weighted course total">
            <p>
              <code>
                Component contribution = (earned ÷ out of) × weight
              </code>
            </p>
            <p>
              <code>Course total = sum of all contributions</code>
            </p>
          </Callout>
          <p>
            Each component earns a slice of the course: scoring 90% on a
            component worth 30% contributes 27 points to your final total out of
            100. Note that the weights themselves are a claim about the course —
            if they add up to less than 100%, something is still ungraded or
            missing from your list, and the calculator says so.
          </p>

          <AdSlot variant="in-article" />

          <h2>A worked example</h2>
          <p>
            Assignments worth 30%: you earned 18 out of 20, so 90% × 30 = 27
            points. Quizzes worth 20%: 8 out of 10 is 80% × 20 = 16 points.
            Midterm worth 50%: 28 out of 40 is 70% × 50 = 35 points. The total
            is 27 + 16 + 35 = <strong>78%</strong> with all weights accounted
            for. Now imagine the final exam is still pending: leave its marks
            empty and the tool shows 78% secured so far, with the final&rsquo;s
            weight visibly waiting.
          </p>

          <h2>Why weight validation matters</h2>
          <ul>
            <li>
              <strong>Weights over 100%</strong> usually mean a component was
              double-counted — for example, quizzes entered once as a group and
              again individually.
            </li>
            <li>
              <strong>Weights under 100%</strong> are normal mid-semester: the
              missing share is simply not graded yet. The coverage bar shows
              exactly how much is still to come.
            </li>
            <li>
              <strong>Components with marks but no weight</strong> are ignored
              in the maths — a component only influences the total through the
              weight your outline assigns it.
            </li>
          </ul>

          <h2>From course total to CGPA</h2>
          <p>
            The weighted total is the input to everything downstream: compare it
            to your university&rsquo;s cutoffs to know the likely letter, then
            carry that letter into the{" "}
            <a href="/tools/cgpa-calculator">CGPA calculator</a> to see the
            semester-level and cumulative effect. Mid-semester is the best time
            for this exercise — the{" "}
            <a href="/tools/grade-calculator">final grade calculator</a> tells
            you what the remaining weight demands, while this page tells you
            where you stand right now. Estimates only, of course: your
            instructor&rsquo;s marksheet is the real record.
          </p>
        </>
      }
    >
      <CourseTotalCalculator />
    </ToolShell>
  );
}
