import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import ImprovementPlanner from "@/components/public/tools/ImprovementPlanner";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "CGPA Improvement Planner — What Average Do I Need?",
  description:
    "Enter your current CGPA, completed credits and a target: see the average GPA you need over your remaining credits, and whether the target is still achievable.",
  alternates: { canonical: "/tools/cgpa-improvement-planner" },
};

export default function ImprovementPlannerPage() {
  return (
    <ToolShell
      title="CGPA Improvement Planner"
      description="Turn a target CGPA into a concrete average: see exactly what you need per remaining credit hour — and set an honest target when the maths says no."
      path="/tools/cgpa-improvement-planner"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "Is it too late to improve my CGPA?",
          a: "Rarely. Every credit hour still ahead of you counts toward the cumulative average, so improvement is always mathematically possible unless your remaining credits are almost over. The question the planner answers is not “can it move?” but “how much average does the target demand?”.",
        },
        {
          q: "Why does the required average look so extreme?",
          a: "Because a CGPA is credit-weighted, not an average of semesters. If 100 credits are already locked in at 2.50, a target of 3.00 over only 20 remaining credits demands (3.00 × 120 − 2.50 × 100) ÷ 20 = 5.50 — impossible. The same target with 100 remaining credits needs only 3.50. Later credits simply move the number less.",
        },
        {
          q: "Does the planner assume I will retake courses?",
          a: "No. It treats your current CGPA as fixed history and plans across the credits ahead. If your university replaces old grades when a course is repeated, the improvement can be larger than shown — ask your advisor how repeats are recorded before relying on that.",
        },
        {
          q: "What does “best possible CGPA” mean?",
          a: "It is your locked-in quality points plus maximum grade points across all remaining credits, divided by the total. It is the ceiling if everything from here is perfect — useful when deciding whether a target is realistic or should be reset.",
        },
      ]}
      related={[
        {
          href: "/tools/cgpa-calculator",
          label: "CGPA Calculator",
          description: "See exactly where your cumulative number stands now.",
        },
        {
          href: "/tools/gpa-calculator",
          label: "GPA / SGPA Calculator",
          description: "The semester building block behind every CGPA change.",
        },
        {
          href: "/tools/semester-gpa-planner",
          label: "Semester What-If Planner",
          description: "Rehearse a semester's grades before they are final.",
        },
      ]}
      explainer={
        <>
          <p>
            Improvement planning starts with honesty about arithmetic. A CGPA is
            not an opinion — it is one fraction:{" "}
            <strong>total quality points divided by total credit hours</strong>.
            Your completed credits are locked in, but every remaining credit
            still enters that fraction at full weight. The planner above solves
            the equation in reverse: given where you are, where you want to end
            up, and how many credits are still ahead, it computes the average
            grade points those credits must deliver.
          </p>

          <h2>The formula</h2>
          <Callout tone="formula" title="Required average over remaining credits">
            <p>
              <code>
                Required = (Target × TotalCredits − Current × DoneCredits) ÷
                RemainingCredits
              </code>
            </p>
          </Callout>
          <p>
            TotalCredits is simply DoneCredits plus RemainingCredits. Multiplying
            each CGPA by its credit base converts both sides into quality
            points; the difference is the gap your remaining semesters must
            supply.
          </p>

          <AdSlot variant="in-article" />

          <h2>A worked example</h2>
          <p>
            You have a 2.85 CGPA over 75 completed credits — 213.75 quality
            points. Your target is 3.20 by graduation, with 55 credits left, so
            the finishing total must be 3.20 × 130 = 416 quality points. The gap
            is 202.25 points over 55 credits, which calls for an average of
            3.68 in everything remaining. That is achievable on a 4.0 scale —
            demanding, but every A and A&minus; now visibly moves the number.
          </p>

          <h2>What the numbers teach</h2>
          <ul>
            <li>
              <strong>Later credits move the average less.</strong> With 120
              credits locked in, a single semester can only nudge the CGPA.
              Early semesters feel light and are secretly the heaviest.
            </li>
            <li>
              <strong>The gap is a rate, not a verdict.</strong> &ldquo;Needs
              3.68&rdquo; is not a moral judgment; it is the exchange rate
              between your remaining effort and your target.
            </li>
            <li>
              <strong>Check the ceiling before committing.</strong> The planner
              shows the best CGPA still possible. If your target sits above it,
              resetting the goal now beats discovering the gap later.
            </li>
          </ul>

          <h2>Use it alongside the calculators</h2>
          <p>
            The{" "}
            <a href="/tools/cgpa-calculator">CGPA calculator</a> keeps the
            current state accurate, the{" "}
            <a href="/tools/semester-gpa-planner">what-if planner</a> rehearses
            upcoming semesters, and this planner turns both into a target. Keep
            in mind that every result here is an estimate built on the numbers
            you enter — your university&rsquo;s records and policies remain the
            final authority.
          </p>
        </>
      }
    >
      <ImprovementPlanner />
    </ToolShell>
  );
}
