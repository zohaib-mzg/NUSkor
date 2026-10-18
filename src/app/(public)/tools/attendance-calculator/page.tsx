import type { Metadata } from "next";
import ToolShell from "@/components/public/ToolShell";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import AttendanceCalculator from "@/components/public/tools/AttendanceCalculator";
import { TOOLS_LAST_REVIEWED } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Attendance Calculator — Can I Still Miss a Class?",
  description:
    "Free attendance calculator: enter classes held, attended and the percentage your course requires to see what you can miss and what it takes to recover.",
  alternates: { canonical: "/tools/attendance-calculator" },
};

export default function AttendanceCalculatorPage() {
  return (
    <ToolShell
      title="Attendance Calculator"
      description="Your current attendance, the classes you can still miss, and the run of classes needed to recover — all against the percentage you enter."
      path="/tools/attendance-calculator"
      updated={TOOLS_LAST_REVIEWED}
      faqs={[
        {
          q: "What attendance percentage should I enter?",
          a: "Whatever your own course outline or classroom policy states. nuSkor deliberately does not assume a rule: the requirement is an input, not a default, because acceptable attendance differs between institutions, courses and instructors.",
        },
        {
          q: "What does “consecutive classes” mean in the results?",
          a: "The calculator models the future one class at a time. “You can miss 3” means that after three skipped classes your percentage would still meet the requirement; “attend 10 in a row” means ten attended classes in sequence bring you back over the line. If future classes have unequal weight — for example labs — treat the numbers as an approximation.",
        },
        {
          q: "Why can a 100% requirement never be recovered?",
          a: "Attending classes raises the fraction attended ÷ held, but it can only approach 100%, never reach it if any class was missed. If a course truly requires perfection, a missed class has no mathematical fix — which is why the calculator says so plainly instead of inventing a number.",
        },
        {
          q: "Does the tool know my university's attendance rule?",
          a: "No, and it never will — nuSkor is an independent, university-neutral project. It computes fractions from the numbers you provide. Official attendance records and policies are managed by your institution.",
        },
      ]}
      related={[
        {
          href: "/tools/course-total-calculator",
          label: "Course Total Calculator",
          description:
            "Combine attendance, quizzes, sessional and exams into one total.",
        },
        {
          href: "/tools/cgpa-improvement-planner",
          label: "CGPA Improvement Planner",
          description: "Plan the average your remaining credits need to deliver.",
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
            Attendance policies are as varied as universities themselves: some
            require a high percentage formally, others apply softer classroom
            rules, and plenty sit in between. That variety is exactly why this
            calculator asks for the requirement instead of assuming it. Enter
            the percentage that applies to your course, the classes held so far
            and how many you attended — the tool answers the two questions
            students actually have:{" "}
            <strong>how many can I still miss?</strong> and{" "}
            <strong>what does it take to recover?</strong>
          </p>

          <h2>The maths, without hand-waving</h2>
          <Callout tone="formula" title="Attendance as fractions">
            <p>
              <code>Current = attended ÷ held × 100</code>
            </p>
            <p>
              <code>
                Can miss k more: attended ÷ (held + k) ≥ requirement
              </code>
            </p>
            <p>
              <code>
                Attend m to recover: (attended + m) ÷ (held + m) ≥ requirement
              </code>
            </p>
          </Callout>
          <p>
            Both future-events formulas are solved algebraically. Missing k
            classes lowers the fraction, so the largest safe k is the point
            where attendance exactly touches the requirement. Attending m
            classes raises it, with diminishing gains — each new class is one
            more attended in a growing total.
          </p>

          <AdSlot variant="in-article" />

          <h2>Two worked examples</h2>
          <p>
            <strong>Comfortably above.</strong> Thirty classes held, twenty-seven
            attended: 90%. With an 80% requirement, missing three more classes
            still leaves 27 ÷ 33 = 81.8% — so the tool reports “3” — while a
            fourth would drop you to 79.4%.
          </p>
          <p>
            <strong>Behind the pace.</strong> Thirty held, twenty-two attended:
            73.3%, against an 80% requirement. Solving for m: you need ten
            consecutive attended classes to cross back over the line, since 32 ÷
            40 = 80%. The longer you wait, the larger m grows — recovery gets
            harder with every class that passes.
          </p>

          <h2>Using it well</h2>
          <ul>
            <li>
              <strong>Update it weekly.</strong> Two numbers per course — held
              and attended — keep the picture accurate without any spreadsheet
              gymnastics.
            </li>
            <li>
              <strong>Ask before relying on a number.</strong> If your course
              outline mentions medical concessions, condoned absences or
              aggregate rules, those change the arithmetic in ways no generic
              calculator can see.
            </li>
            <li>
              <strong>Treat results as projections.</strong> The maths is exact
              for equal-weight classes and an approximation otherwise — a
              reasonable planning lens, not an official record.
            </li>
          </ul>

          <h2>Why a neutral tool says less</h2>
          <p>
            You will notice the calculator never tells you what the minimum
            attendance &ldquo;should&rdquo; be, and never guesses your
            university&rsquo;s rule. That is deliberate: rules differ, change
            between courses, and are published by your institution — not by us.
            nuSkor supplies the arithmetic; you supply the policy. Estimates
            for planning only; official records always win.
          </p>
        </>
      }
    >
      <AttendanceCalculator />
    </ToolShell>
  );
}
