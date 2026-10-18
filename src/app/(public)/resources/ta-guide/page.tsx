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
  title: "TA Guide — Running Marks and Evaluations Efficiently",
  description:
    "A practical guide for teaching assistants: setting up a course, entering and importing marks, publishing safely, running evaluation slots and fewer questions.",
  alternates: { canonical: "/resources/ta-guide" },
};

export default function TaGuidePage() {
  return (
    <>
      <PageHero
        title="The TA guide"
        description="How to run a course's marks and evaluations on nuSkor — efficiently, correctly, and without becoming your students' search engine."
        crumbs={[
          { name: "Resources", href: "/resources" },
          { name: "TA guide", href: "/resources/ta-guide" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Teaching assistants hold a course together between lectures:
              marks get graded, totals get tracked, evaluations get scheduled,
              and questions get answered. This guide is about doing that work
              once instead of three times — the workflow patterns that keep a
              semester calm, written for the way courses actually run.
            </p>

            <h2>Set-up week: the 30 minutes that save the semester</h2>
            <p>
              The most valuable TA session of the semester is the first one.
              Create the assessments with their exact names, totals and
              weightages while the course outline is open in front of you —
              every downstream total computes itself from this one
              transcription. Decide the evaluation plan early too: how many
              slots, where, and whether students can rebook. A five-line
              announcement that closes with &ldquo;details are on the
              portal&rdquo; replaces fifty replies.
            </p>

            <h2>Weekly rhythm: enter, verify, publish</h2>
            <ul>
              <li>
                <strong>Enter marks in batches.</strong> Small checkers go in
                by hand; anything that reached a spreadsheet goes through{" "}
                <a href="/features/csv-import">CSV import</a>, which validates
                every row against the roster before saving. Flagged rows mean
                typos, not mysteries.
              </li>
              <li>
                <strong>Verify before publishing.</strong> Marks stay invisible
                to students until you publish. Do the totals read sensibly?
                Any suspiciously uniform scores? Ten seconds of scepticism per
                batch outlives ten messages per student.
              </li>
              <li>
                <strong>Publish, then announce deliberately.</strong> One{" "}
                <a href="/features/announcements">announcement</a> stating what
                was published and what students should check, instead of the
                information leaking unevenly through the week.
              </li>
            </ul>

            <h2>Evaluations: make the roster build itself</h2>
            <p>
              Open the{" "}
              <a href="/features/evaluation-slots">slot grid</a> with a
              deadline for booking and let the class self-serve. The database
              enforces one booking per student and prevents collisions, which
              removes the two failure modes that eat evaluation weeks:
              double-booked slots and &ldquo;I asked in the chat first&rdquo;.
              On the day, bring the portal&rsquo;s roster view — who is next,
              with their booking timestamps — and the session runs on rails.
            </p>

            <Callout title="The golden rule of TA communication">
              <p>
                Say it once, in a place everyone will look, and point at it
                afterwards. The announcements feed plus the marksheet answers
                the questions you would otherwise answer individually.
              </p>
            </Callout>

            <AdSlot variant="in-article" />

            <h2>Corrections and disputes, handled calmly</h2>
            <ul>
              <li>
                <strong>Correct through the system.</strong> Fix the entry,
                republish, and everyone downstream sees the corrected version.
                No errata threads.
              </li>
              <li>
                <strong>Keep a consistent standard.</strong> Apply the rubric
                (or marking scheme) the same way across the batch; students
                compare, and consistency is the fairness they can see.
              </li>
              <li>
                <strong>Route policy questions upward.</strong> Attendance
                rules, extensions, exam eligibility — these belong to the
                instructor or the institution, not your inbox. A polite redirect
                protects both your time and the course&rsquo;s consistency.
              </li>
            </ul>

            <h2>End of semester: the quiet payoff</h2>
            <p>
              Because the record was structured from week one, the final
              audits are painless: totals compute themselves, the history of
              what was published when is already there, and the students who
              checked the{" "}
              <a href="/resources/evaluation-prep-checklist">
                evaluation checklist
              </a>{" "}
              arrived ready. Compare that to the spreadsheet-and-chat
              semester — and decide which one to sign up for again. The{" "}
              <a href="/for-tas">for TAs page</a> has the workflow overview;
              this guide is the operating manual.
            </p>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "How early should marks be published after an assessment?",
                a: "Sooner is almost always better — ints removed from the anxiety cycle. A useful pattern: enter, verify, publish within days of grading, with one announcement. Oscar-worthy delays only generate email.",
              },
              {
                q: "What if two TAs grade differently?",
                a: "Calibrate before grading: mark a handful of scripts together and align on the rubric's application. After that, spot-check each other's batches. The portal records who entered what, which makes buddy-checking easy.",
              },
              {
                q: "How do I handle a student disputing a mark?",
                a: "Check the entry against the source first — simple typos happen and are quick to fix. If the mark was applied per the scheme, show the working; if it was wrong, correct it and republish. Document the decision in your own notes either way.",
              },
            ]}
          />
        </div>

        <div className="mt-12 max-w-3xl">
          <CtaCard
            title="Running a course this semester?"
            description="Sign in as a TA to reach your sections — marks entry, CSV import, evaluation slots and announcements in one workflow."
          />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/for-tas",
                label: "For teaching assistants",
                description: "The TA-side overview of the portal.",
              },
              {
                href: "/features/csv-import",
                label: "CSV marks import",
                description: "From spreadsheet to validated records.",
              },
              {
                href: "/features/evaluation-slots",
                label: "Evaluation slots",
                description: "How the booking grid prevents collisions.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
