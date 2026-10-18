import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import ToolGrid from "@/components/public/ToolGrid";
import AdSlot from "@/components/public/AdSlot";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free Student Tools — Calculators & Planners",
  description:
    "Nine free student calculators: CGPA, GPA, final grade, course totals, attendance, grade points, weighted percentages and semester planning. Private, no sign-up.",
  alternates: { canonical: "/tools" },
};

export default function ToolsHubPage() {
  return (
    <>
      <PageHero
        title="Free student tools"
        description="Nine calculators for planning grades, GPA and attendance — every one runs entirely in your browser, with an editable grade scale and no sign-up."
        crumbs={[{ name: "Tools", href: "/tools" }]}
        meta={<>{SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              These tools exist for one reason: to answer the questions students
              actually ask — <strong>&ldquo;what is my CGPA now?&rdquo;</strong>{" "}
              and <strong>&ldquo;what do I need to hit my target?&rdquo;</strong>{" "}
              Everything is calculated locally in your browser, so nothing you
              type is stored, transmitted or shared. Each calculator starts with
              a commonly used 4.0 grade scale that you can edit to match your
              own university&rsquo;s handbook.
            </p>
            <p>
              New here? Start with the{" "}
              <a href="/tools/cgpa-calculator">CGPA calculator</a> for a
              multi-semester overview, or use the{" "}
              <a href="/tools/gpa-calculator">GPA calculator</a> for a single
              semester. Planning ahead? The{" "}
              <a href="/tools/cgpa-improvement-planner">
                improvement planner
              </a>{" "}
              shows the average GPA you need in your remaining credits.
            </p>
          </Prose>
        </div>

        <div className="mt-8">
          <ToolGrid tools={TOOLS.slice(0, 3)} />
        </div>

        <AdSlot variant="display" />

        <ToolGrid tools={TOOLS.slice(3)} />

        <div className="mt-14">
          <RelatedLinks
            links={[
              {
                href: "/tools/cgpa-calculator",
                label: "CGPA Calculator",
                description:
                  "Multiple semesters, editable scale, SGPA plus cumulative CGPA.",
              },
              {
                href: "/tools/grade-calculator",
                label: "Final Grade Calculator",
                description:
                  "The score you need on the final to reach your target.",
              },
              {
                href: "/tools/attendance-calculator",
                label: "Attendance Calculator",
                description:
                  "Your current percentage, classes you can miss, and recovery.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
