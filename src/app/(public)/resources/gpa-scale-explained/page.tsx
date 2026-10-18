import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { DEFAULT_GRADE_SCALE } from "@/lib/grading";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "GPA Scale Explained — From Letters to Grade Points",
  description:
    "How letter grades map to grade points on a commonly used 4.0 scale, how quality points work, and why your university's scale may differ — with worked examples.",
  alternates: { canonical: "/resources/gpa-scale-explained" },
};

export default function GpaScaleExplainedPage() {
  return (
    <>
      <PageHero
        title="The GPA scale, explained"
        description="Letters become points, points become averages. Here is the whole conversion, with the caveat that matters: every university's scale is its own."
        crumbs={[
          { name: "Resources", href: "/resources" },
          { name: "GPA scale explained", href: "/resources/gpa-scale-explained" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              A GPA looks like a single number, but it is actually the end of a
              three-step translation: your performance in a course becomes a
              letter grade, the letter becomes a grade point, and grade points
              — weighted by course size — are averaged together. Most confusion
              about GPA comes from somewhere in that chain. This page walks the
              chain end to end.
            </p>

            <h2>Step 1: Letters to grade points</h2>
            <p>
              A grade point is simply the numeric value a university assigns to
              a letter grade. The table below shows the most widely used 4.0
              arrangement — the same values our calculators start with:
            </p>
          </Prose>
        </div>

        <div className="mt-6 max-w-md">
          <table className="card w-full overflow-hidden text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-paper text-left text-xs uppercase tracking-wider text-ink/45">
                <th className="px-4 py-2.5">Letter</th>
                <th className="px-4 py-2.5">Grade points</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_GRADE_SCALE.map((entry) => (
                <tr key={entry.letter} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-4 py-2 font-semibold text-ink">
                    {entry.letter}
                  </td>
                  <td className="px-4 py-2 text-ink/70">
                    {entry.points.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 max-w-3xl">
          <Prose>
            <h2>Step 2: Points meet credit hours</h2>
            <p>
              A grade point alone does not tell you how much a course matters —
              that is the job of credit hours. Multiplying the two produces{" "}
              <strong>quality points</strong>, the currency of every GPA
              calculation:
            </p>
            <Callout tone="formula" title="The core multiplication">
              <p>
                <code>Quality points = credit hours × grade points</code>
              </p>
            </Callout>
            <p>
              So an A&minus; (3.67) in a 3-credit course earns 3 × 3.67 = 11.01
              quality points, while a B+ (3.33) in a 4-credit course earns 4 ×
              3.33 = 13.32. Notice the second course out-earns the first
              despite the lower letter — that is credit weighting doing its
              job, and it is why &ldquo;which course should I focus
              on?&rdquo; usually has a mathematical answer.
            </p>

            <h2>Step 3: Averaging, the weighted way</h2>
            <p>
              A GPA is total quality points divided by total credit hours — not
              the average of the letters. Two semesters with the same letter
              mix can produce different GPAs if the credit hours differ, because
              the bigger courses pull harder.
            </p>

            <AdSlot variant="in-article" />

            <h2>Why your scale may differ</h2>
            <p>
              The table above is common, not universal. Real-world variations
              include A&minus; at 3.70 instead of 3.67, B&minus; at 2.70
              instead of 2.67, different letter sets entirely (some scales skip
              plus/minus grades), and percentage cutoffs that vary between
              institutions or even between courses within one institution. None
              of that is exotic — it is why our{" "}
              <a href="/tools/gpa-calculator">GPA calculator</a> and its
              siblings make every grade point editable, and why every example
              on this site tells you to check your own handbook before relying
              on a number.
            </p>
            <p>
              There is one more wrinkle worth knowing: cutoffs — the minimum
              percentages for each letter — are set per institution and
              sometimes per course. The letter-to-point conversion can be
              universalish; the percentage-to-letter one never is. When you see
              confident internet tables claiming &ldquo;90% is always an
              A&rdquo;, treat them as a clue, not a rule.
            </p>

            <h2>Putting it into practice</h2>
            <p>
              Once the chain is clear, planning gets simpler: find your biggest
              credit-hour courses, learn where their letter boundaries sit (per
              your course outline), and spend your sharpest hours there. The{" "}
              <a href="/tools/grade-point-converter">
                grade point converter
              </a>{" "}
              translates letters to points on your own scale, and the{" "}
              <a href="/tools/cgpa-calculator">CGPA calculator</a> rolls any
              number of semesters into the cumulative figure. Estimates only,
              as ever — your university&rsquo;s records are the final word.
            </p>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Is the 4.0 scale universal?",
                a: "No — it is widely used, not universal. Grade point values, letter sets and percentage cutoffs all vary between institutions. That is why every nuSkor tool lets you edit the scale to match your own handbook.",
              },
              {
                q: "Why do plus and minus grades matter so much?",
                a: "Because each step is roughly 0.33 grade points, and those steps multiply through credit hours. A single B− instead of a B in a 4-credit course swings your semester total by more than a full grade point of quality.",
              },
              {
                q: "Does a 5.0 scale work with nuSkor's tools?",
                a: "Yes — open the scale editor and set your grade point values to match (for example a max of 5.00). The arithmetic is scale-agnostic; only the values change.",
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
                href: "/resources/cgpa-formula",
                label: "The CGPA formula",
                description: "Step-by-step, with three worked examples.",
              },
              {
                href: "/tools/gpa-calculator",
                label: "GPA Calculator",
                description: "Try the maths with your own numbers.",
              },
              {
                href: "/glossary",
                label: "Glossary",
                description: "Grade point, quality points, weightage and more.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
