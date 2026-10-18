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
  title: "CSV Marks Import — Spreadsheets In, Clean Records Out",
  description:
    "TAs can bring a spreadsheet of marks into nuSkor with row-by-row validation: unknown emails and bad scores are caught before anything is saved.",
  alternates: { canonical: "/features/csv-import" },
};

export default function CsvImportFeaturePage() {
  return (
    <>
      <PageHero
        title="CSV marks import (TAs)"
        description="Most marks live in spreadsheets before they live anywhere else. This feature meets them there — with validation, previews and zero silent errors."
        crumbs={[
          { name: "Features", href: "/features" },
          { name: "CSV import", href: "/features/csv-import" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>The problem</h2>
              <p>
                Ask any teaching assistant where their marks live and you will
                get the same answer: a spreadsheet. Checkers, quizzes and
                hard-copies accumulate in rows and columns, and there comes a
                day when all of it has to become entries in a system — by hand,
                one row at a time, hoping nobody&rsquo;s email address has a
                typo. Manual entry is slow, and its failures are silent: a
                mistyped address means a student never sees their mark.
              </p>

              <h2>How it works</h2>
              <p>
                CSV import turns that spreadsheet into a checked import.
                Teaching staff paste or upload CSV rows — an email and a score
                per line — and the portal validates everything before saving
                anything. Each row is checked against the course roster: is
                this a real enrolled student? Is the score a valid number,
                within the allowed range? Rows that pass are previewed as they
                will be saved; rows that fail are listed with the reason, right
                there, so they can be fixed and re-imported without touching
                the good rows twice.
              </p>
              <p>
                The import writes to the same underlying records as manual entry
                — it is not a parallel system with different rules. Whatever
                happens next (publishing, the marksheet, the leaderboard) sees
                exactly what a manual entry would have produced.
              </p>

              <h2>Why validation-first matters</h2>
              <ul>
                <li>
                  <strong>Silent failures become visible.</strong> An unknown
                  email is a row-level error, not a student quietly missing
                  their marks.
                </li>
                <li>
                  <strong>Retries are cheap.</strong> Fix only the flagged
                  rows in your spreadsheet and import them again.
                </li>
                <li>
                  <strong>Nothing half-saves.</strong> The preview step means
                  staff see the effect before committing, exactly as with
                  hand-entered marks.
                </li>
              </ul>

              <h2>Built for the middle of the semester</h2>
              <p>
                The feature is designed for the moment it is actually needed:
                scores just arrived, the class is large, and time is short.
                That is why it never demands a particular spreadsheet template
                — two columns are enough — and why it reports problems in bulk
                rather than stopping at the first one. A mid-semester import
                should take minutes, not an evening.
              </p>

              <AdSlot variant="display" />
            </Prose>
          </div>

          <SampleMockup title="Import preview — Quiz 2 (10 marks)">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink/40">
                  <th className="pb-2">Row</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["1", "student.a@example.edu", "8", "ok"],
                  ["2", "student.b@example.edu", "9.5", "ok"],
                  ["3", "student.c@exmaple.edu", "7", "unknown"],
                  ["4", "student.d@example.edu", "eleven", "invalid"],
                  ["5", "student.e@example.edu", "10", "ok"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-black/[0.06]">
                    <td className="py-2 text-ink/50">{row[0]}</td>
                    <td className="py-2 text-ink/70">{row[1]}</td>
                    <td className="py-2 text-ink/70">{row[2]}</td>
                    <td className="py-2">
                      {row[3] === "ok" ? (
                        <span className="badge bg-green-100 text-green-800">
                          Ready
                        </span>
                      ) : row[3] === "unknown" ? (
                        <span className="badge bg-amber-100 text-amber-900">
                          Not enrolled
                        </span>
                      ) : (
                        <span className="badge bg-red-100 text-red-800">
                          Not a number
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-ink/45">
              3 rows ready · 2 need fixing — correct them and import again; the
              ready rows are shown before anything is saved.
            </p>
          </SampleMockup>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "What should the CSV look like?",
                a: "Two columns, one row per student: an email address and a score. Comma-separated, one header line optional. That is the whole format — no template to download.",
              },
              {
                q: "What if a student is not on the roster yet?",
                a: "That row is flagged as 'not enrolled' and skipped, so nobody else's marks are affected. Once the roster includes the student, importing that single row works.",
              },
              {
                q: "Do imported marks publish immediately?",
                a: "Importing creates the marks; publishing shows them to students. Keeping the two steps separate is deliberate — it gives staff a chance to verify before the class sees anything.",
              },
            ]}
          />
        </div>

        <div className="mt-12 max-w-3xl">
          <CtaCard
            title="Running a course on nuSkor?"
            description="Marks entry, CSV import, evaluation slots and announcements — sign in as a TA and run the whole workflow from one place."
          />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/features/marksheet",
                label: "Live marksheet",
                description: "Where imported marks immediately appear.",
              },
              {
                href: "/for-tas",
                label: "For teaching assistants",
                description: "The TA-side workflow, end to end.",
              },
              {
                href: "/resources/ta-guide",
                label: "TA guide",
                description: "How to run marks and evaluations efficiently.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
