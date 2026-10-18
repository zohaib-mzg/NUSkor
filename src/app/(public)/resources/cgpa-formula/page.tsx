import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "The CGPA Formula — Step by Step With Worked Examples",
  description:
    "How CGPA is calculated: quality points over credit hours, semester by semester, with three fully worked examples and the mistakes to avoid.",
  alternates: { canonical: "/resources/cgpa-formula" },
};

export default function CgpaFormulaPage() {
  return (
    <>
      <PageHero
        title="The CGPA formula, step by step"
        description="One fraction, three worked examples, and the four mistakes that quietly corrupt most home-made CGPA calculations."
        crumbs={[
          { name: "Resources", href: "/resources" },
          { name: "CGPA formula", href: "/resources/cgpa-formula" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Ask ten students how CGPA is calculated and you will get several
              confident, incompatible answers. The real formula is short enough
              to fit on a napkin — the complexity lives entirely in doing it in
              the right order, with the right weights. Here is the method,
              walked through three times until it is boring.
            </p>

            <h2>The formula</h2>
            <Callout tone="formula" title="CGPA in three lines">
              <p>
                <code>Quality points (per course) = credit hours × grade points</code>
              </p>
              <p>
                <code>SGPA (per semester) = semester quality points ÷ semester credits</code>
              </p>
              <p>
                <code>CGPA = all quality points ÷ all counted credits</code>
              </p>
            </Callout>
            <p>
              Grade points come from your institution&rsquo;s scale — the{" "}
              <a href="/resources/gpa-scale-explained">scale explainer</a>{" "}
              covers that translation. For these examples we use the commonly
              seen 4.0 values.
            </p>

            <h2>Example 1: one semester, three courses</h2>
            <p>
              A 3-credit course with an A (4.00) → 12.00 quality points. A
              3-credit course with a B&minus; (2.67) → 8.01. A 4-credit course
              with a C+ (2.33) → 9.32. Total: 29.33 quality points over 10
              credit hours. 29.33 ÷ 10 ={" "}
              <strong>2.93 SGPA</strong>. Notice that the 4-credit C+ hurts
              more than the 3-credit B&minus; — credit weighting is not a
              detail, it is the whole mechanism.
            </p>

            <AdSlot variant="in-article" />

            <h2>Example 2: two semesters into a CGPA</h2>
            <p>
              Semester one, from above: 29.33 quality points, 10 credits.
              Semester two: a 3-credit B+ (3.33) → 9.99; a 3-credit A (4.00) →
              12.00; a 2-credit B (3.00) → 6.00; a 4-credit A&minus; (3.67) →
              14.68. Semester two total: 42.67 quality points over 12 credits,
              an SGPA of 3.56. The CGPA combines everything: (29.33 + 42.67) ÷
              (10 + 12) = 72.00 ÷ 22 ={" "}
              <strong>3.27</strong>. Never average the two SGPAs directly
              ((2.93 + 3.56) ÷ 2 = 3.25 is wrong) — the semesters carry
              different credit weights, and the combined fraction is the only
              correct route.
            </p>

            <h2>Example 3: solving for a target</h2>
            <p>
              Current CGPA 3.02 over 60 completed credits — 181.2 quality
              points banked. Target: 3.20 by graduation with 40 credits still
              ahead. The finishing total must be 3.20 × 100 = 320 quality
              points, so the remaining credits must deliver 320 − 181.2 =
              138.8, an average of 138.8 ÷ 40 ={" "}
              <strong>3.47</strong>. That is demanding but possible — and it
              is exactly the calculation the{" "}
              <a href="/tools/cgpa-improvement-planner">
                improvement planner
              </a>{" "}
              automates.
            </p>

            <h2>The four classic mistakes</h2>
            <ul>
              <li>
                <strong>Averaging SGPAs.</strong> As shown above, semesters
                with different credit loads weight differently. Only total
                quality points ÷ total credits is correct.
              </li>
              <li>
                <strong>Counting pending assessments as zero.</strong> In a
                term in progress, only graded work exists. Counting ungraded
                items as zero (or as perfect) invents a CGPA that cannot exist.
              </li>
              <li>
                <strong>Using someone else&rsquo;s scale.</strong> If your
                institution uses 3.70 for an A&minus; and you compute with
                3.67, the error compounds across every course. Set your own
                values.
              </li>
              <li>
                <strong>Forgetting repeats.</strong> If your institution counts
                only the latest attempt of a repeated course, old attempts must
                not stay in the maths. Policies differ — confirm yours, then
                exclude accordingly.
              </li>
            </ul>

            <h2>Doing it with tools instead</h2>
            <p>
              You can run all of this on paper, and the first time you should —
              the mechanics stick. After that, the{" "}
              <a href="/tools/cgpa-calculator">CGPA calculator</a> handles
              multiple semesters, prior records and repeat exclusions in
              seconds, entirely in your browser. Remember the standing rule:
              every result is an estimate for planning, and your
              university&rsquo;s official record is the final authority.
            </p>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Is CGPA rounded at each semester or at the end?",
                a: "It varies by institution — some round per-semester GPAs before combining, most round only the final result. nuSkor rounds only the displayed number, never the underlying sums, which matches the common approach. Check your handbook for the official convention.",
              },
              {
                q: "Do transfer credits change my CGPA?",
                a: "That depends on your institution's transfer policy: some count transferred credit hours in the CGPA denominator without grade points; others exclude them entirely. Our CGPA calculator lets you fold in a prior CGPA and credit count, so you can model whichever rule applies.",
              },
              {
                q: "Can my CGPA go up without my SGPA going up?",
                a: "No — every credit hour you add enters the same fraction. A semester average above your current CGPA raises it; one below lowers it. There is no path around the arithmetic, which is exactly why planning tools matter.",
              },
            ]}
          />
        </div>

        <div className="mt-12 max-w-3xl">
          <CtaCard />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/tools/cgpa-calculator",
                label: "CGPA Calculator",
                description: "Multi-semester planning with an editable scale.",
              },
              {
                href: "/resources/gpa-scale-explained",
                label: "GPA scale explained",
                description: "Letters to points, before the formula runs.",
              },
              {
                href: "/tools/cgpa-improvement-planner",
                label: "Improvement Planner",
                description: "Turn a target CGPA into a required average.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
