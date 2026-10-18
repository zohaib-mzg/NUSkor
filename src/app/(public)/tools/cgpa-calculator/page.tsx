import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import CgpaCalculator from "@/components/public/tools/CgpaCalculator";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "CGPA Calculator — Free, Private & Editable Scale",
  description:
    "Free CGPA calculator: add semesters, credit hours and grades to get SGPA per semester and your cumulative CGPA instantly. Works fully in your browser — no sign-up.",
  alternates: { canonical: "/tools/cgpa-calculator" },
};

export default function CgpaCalculatorPage() {
  return (
    <ToolShell
      title="CGPA Calculator"
      description="Plan multiple semesters with an editable grade scale — SGPA for each semester and your cumulative CGPA, updated as you type."
      path="/tools/cgpa-calculator"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "Is this CGPA calculator free and private?",
          a: "Yes. The calculator is completely free and every number is processed in your browser — nothing you type is sent to a server, stored or shared. There is no account and no sign-up.",
        },
        {
          q: "How do I handle a course I repeated?",
          a: "Add both attempts as separate rows, tick “Repeat” on the older attempt and leave it out of the calculation. That mirrors the common “latest attempt counts” rule, but confirm your own university's policy first — rules differ.",
        },
        {
          q: "What grade scale does it use?",
          a: "It starts with a commonly used 4.0 scale (A = 4.00, A- = 3.67, B+ = 3.33, and so on). Grade scales differ between universities, so open “Use my university's scale” and edit the grade points to match your handbook.",
        },
        {
          q: "What is the difference between GPA, SGPA and CGPA?",
          a: "GPA and SGPA both describe one semester: the credit-weighted average of your grade points that term. CGPA is cumulative — every counted credit hour across all semesters. This tool shows each semester's SGPA and the combined CGPA.",
        },
        {
          q: "Can I include credits I completed somewhere else?",
          a: "Yes — tick “Continue from a previous CGPA”, enter the earlier CGPA and the credit hours behind it, and the tool folds them into your cumulative result.",
        },
      ]}
      related={[
        {
          href: "/tools/gpa-calculator",
          label: "GPA / SGPA Calculator",
          description: "A quick single-semester GPA from credit hours and grades.",
        },
        {
          href: "/tools/cgpa-improvement-planner",
          label: "CGPA Improvement Planner",
          description:
            "The average GPA you need in your remaining credits to reach a target.",
        },
        {
          href: "/tools/semester-gpa-planner",
          label: "Semester What-If Planner",
          description: "Try expected grades before results are published.",
        },
        {
          href: "/tools",
          label: "All student tools",
          description: "Browse all nine free calculators in one place.",
        },
      ]}
      explainer={
        <>
          <p>
            Your CGPA is the single number that follows you through every
            semester — so it pays to understand exactly how it moves. This
            calculator lets you model your whole degree: add each semester, list
            its courses with credit hours and letter grades, and watch the
            semester GPA (SGPA) and cumulative CGPA update as you type. It is
            built for planning as much as for checking: try a scenario before
            results come out, or enter historic semesters to see where you
            stand today.
          </p>

          <h2>The formulas behind the calculator</h2>
          <Callout tone="formula" title="Quality points, SGPA and CGPA">
            <p>
              <code>Quality points = credit hours × grade points</code>
            </p>
            <p>
              <code>SGPA = total quality points ÷ total credit hours</code> (one
              semester)
            </p>
            <p>
              <code>
                CGPA = all quality points across semesters ÷ all counted credit
                hours
              </code>
            </p>
          </Callout>
          <p>
            Grade points come from the letter you earned — for example A = 4.00
            or B+ = 3.33 on a common 4.0 scale. Because scales differ between
            universities, every grade point in this tool is editable. If your
            university prints a different value on its own scale, change it once
            and every calculation follows.
          </p>

          <AdSlot variant="in-article" />

          <h2>A worked example</h2>
          <p>
            Suppose you take three courses: a 3-credit course with an A (4.00), a
            3-credit course with a B&minus; (2.67) and a 4-credit course with a
            C+ (2.33). The quality points are 3 &times; 4.00 = 12.00, 3 &times;
            2.67 = 8.01 and 4 &times; 2.33 = 9.32 — 29.33 in total over 10
            credit hours. Divide 29.33 by 10 and the SGPA is 2.93. Add another
            semester and the calculator simply combines the two sets of quality
            points before dividing — that is the entire secret of a cumulative
            GPA.
          </p>

          <h2>How to use it for planning</h2>
          <ul>
            <li>
              <strong>Enter credits exactly as your transcript does.</strong> A
              3-credit course counts three times more than a 1-credit lab.
            </li>
            <li>
              <strong>Use the Repeat tick for repeated courses.</strong> Add both
              attempts, tick the older one and it stops dragging your CGPA in
              the maths — matching the common &ldquo;latest attempt only&rdquo;
              rule.
            </li>
            <li>
              <strong>Fold in past records.</strong> Studied elsewhere or not
              re-entering older semesters? Enter your previous CGPA and credits
              once and the tool combines them with what you type.
            </li>
            <li>
              <strong>Keep the scale honest.</strong> If your university awards
              3.70 for an A&minus; or 2.70 for a B&minus;, set it in the scale
              editor so the result matches your official one.
            </li>
          </ul>

          <h2>What the number can — and cannot — tell you</h2>
          <p>
            This calculator gives you a mathematically accurate CGPA for the
            inputs you provide. What it cannot know is your university&rsquo;s
            specific rules: how repeats, withdrawals, transfers or rounding are
            treated is defined by your institution, not by arithmetic. Use the
            result to plan and to sanity-check your understanding — your
            university&rsquo;s own records remain the final authority.
          </p>
        </>
      }
    >
      <CgpaCalculator />
    </ToolShell>
  );
}
