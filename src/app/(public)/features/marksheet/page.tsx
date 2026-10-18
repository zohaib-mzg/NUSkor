import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import SampleMockup from "@/components/public/SampleMockup";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live Marksheet — Every Mark, One Clear Table",
  description:
    "nuSkor's marksheet shows each published assessment, its weightage, class statistics and your standing — updated the moment a TA publishes marks.",
  alternates: { canonical: "/features/marksheet" },
};

export default function MarksheetFeaturePage() {
  return (
    <>
      <PageHero
        title="Live marksheet"
        description="Every published assessment — with its weight, the class picture and your place in it — on one calm page."
        crumbs={[
          { name: "Features", href: "/features" },
          { name: "Marksheet", href: "/features/marksheet" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>The problem</h2>
              <p>
                Marks arrive in fragments: a quiz result announced in class, an
                assignment score in a message thread, a sessional total written
                on a board. Nothing is in one place, so students do the
                arithmetic themselves — usually at 2 a.m., usually wrongly —
                and the honest questions (&ldquo;where do I actually
                stand?&rdquo;) stay unanswered until the semester&rsquo;s end.
              </p>

              <h2>How it works</h2>
              <p>
                In courses that use nuSkor, each assessment carries a weight
                the course defines — quiz 5%, assignment 10%, sessional 15%,
                midterm 25%, final 45%, or whatever the outline says. When an
                instructor or teaching assistant publishes marks for an
                assessment, they appear immediately in the student&rsquo;s
                marksheet: earned marks, the total, the assessment&rsquo;s
                weight, and the contribution to the running total.
              </p>
              <p>
                The marksheet is more than a list. For each published
                assessment you also see the class picture — the average, the
                highest and the lowest score — and your standing within the
                course. That context is often the difference between panic and
                perspective: a 33 out of 40 looks very different when the class
                average is 28.
              </p>

              <h2>What students see</h2>
              <ul>
                <li>
                  A row per assessment with weight, marks and percentage.
                </li>
                <li>
                  A running weighted total — computed from published marks
                  only, so an unpublished assessment never silently counts as
                  zero in the overview.
                </li>
                <li>
                  Class statistics per assessment: average, min, max and your
                  position.
                </li>
                <li>
                  A clear distinction between what is published and what is
                  still pending.
                </li>
              </ul>

              <h2>Why it is built this way</h2>
              <p>
                Because visibility changes behaviour. When students can see
                exactly how much each assessment weighs and where they stand,
                the end-of-semester surprise largely disappears — for everyone.
                And because the numbers come straight from what the course
                staff entered, there is no ambiguity about the source: the
                portal shows what was recorded, and course staff can correct
                entries when needed.
              </p>

              <AdSlot variant="display" />
            </Prose>
          </div>

          <SampleMockup title="Student marksheet — Course X">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink/40">
                  <th className="pb-2">Assessment</th>
                  <th className="pb-2">Weight</th>
                  <th className="pb-2">Marks</th>
                  <th className="pb-2">Your %</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Quiz 1", "5%", "8 / 10", "80%"],
                  ["Assignment 1", "10%", "18 / 20", "90%"],
                  ["Sessional 1", "15%", "27 / 30", "90%"],
                  ["Midterm", "25%", "33 / 40", "82.5%"],
                  ["Final", "45%", "—", "pending"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-black/[0.06]">
                    <td className="py-2 font-medium text-ink">{row[0]}</td>
                    <td className="py-2 text-ink/60">{row[1]}</td>
                    <td className="py-2 text-ink/70">{row[2]}</td>
                    <td className="py-2 font-semibold text-ink">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-black/[0.06] pt-3 text-center">
              <div>
                <p className="text-xs text-ink/45">Class average</p>
                <p className="font-bold text-ink">67.9%</p>
              </div>
              <div>
                <p className="text-xs text-ink/45">Highest</p>
                <p className="font-bold text-ink">89.2%</p>
              </div>
              <div>
                <p className="text-xs text-ink/45">Your rank</p>
                <p className="font-bold text-ink">3rd</p>
              </div>
            </div>
          </SampleMockup>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "When do marks appear?",
                a: "The moment course staff publish an assessment in the portal. Until then it shows as pending — unpublished assessments are never counted as zero.",
              },
              {
                q: "Who can see my marks?",
                a: "You, and the teaching staff of the courses you are enrolled in. Database-level access rules mean other students cannot read your rows at all — see the security page for the plain-language explanation.",
              },
              {
                q: "What if a mark is wrong?",
                a: "Contact the course's teaching staff — only they can correct or re-publish an entry. nuSkor simply shows what was recorded for you.",
              },
              {
                q: "Is the total the same as my official result?",
                a: "No. It is a running total of what has been published so far, weighted as the course defined. Official results come from your university at the end of the process.",
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
                href: "/features/leaderboard",
                label: "Privacy-conscious leaderboard",
                description: "Where the marksheet's numbers end up ranking you.",
              },
              {
                href: "/features/csv-import",
                label: "CSV marks import",
                description: "How TAs get spreadsheet marks in cleanly.",
              },
              {
                href: "/tools/cgpa-calculator",
                label: "CGPA Calculator",
                description: "Turn course results into a cumulative average.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
