import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "For Teaching Assistants — Run Marks and Evaluations Cleanly",
  description:
    "nuSkor for TAs: structured marks entry, CSV import with validation, evaluation slot management, announcements — one workflow instead of spreadsheets and chats.",
  alternates: { canonical: "/for-tas" },
};

export default function ForTasPage() {
  return (
    <>
      <PageHero
        title="For teaching assistants"
        description="You already know the workflow: checkers, spreadsheets, a group chat on fire. nuSkor is what happens when all three become one quiet system."
        crumbs={[{ name: "For TAs", href: "/for-tas" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Teaching assistants run the academic supply chain: quizzes get
              graded, totals get computed, evaluations get scheduled, and
              questions get answered — usually across Microsoft Excel, a
              messaging app and memory. nuSkor replaces that arrangement with a
              structured workflow, without adding bureaucracy. Set the course
              up once, and every routine that follows becomes a two-minute
              operation instead of an evening.
            </p>

            <h2>The TA workflow, start to finish</h2>
            <ol>
              <li>
                <strong>Structure once.</strong> Create the assessments with
                their names, totals and weightages the first week. Every total
                downstream computes itself.
              </li>
              <li>
                <strong>Enter marks your way.</strong> Small checkers go in by
                hand; anything that already lives in a spreadsheet comes
                through <a href="/features/csv-import">CSV import</a>, where
                every row is validated against the roster before a single mark
                is saved. Typos surface as flagged rows, not as students with
                missing marks.
              </li>
              <li>
                <strong>Publish when ready.</strong> Marks stay invisible to
                students until you publish. Verify in private, release in
                public, correct calmly.
              </li>
              <li>
                <strong>Open evaluation slots.</strong> Define the period and
                the slots; students claim them; the roster assembles itself on
                the <a href="/features/evaluation-slots">booking grid</a>. No
                double-bookings, no claim threads.
              </li>
              <li>
                <strong>Announce once.</strong> Deadline changes and schedule
                shifts go into the{" "}
                <a href="/features/announcements">course feed</a>, where the
                whole course sees the same current version.
              </li>
            </ol>

            <AdSlot variant="in-article" />

            <h2>What this saves you</h2>
            <ul>
              <li>
                <strong>Arithmetic.</strong> Weighted totals, percentages and
                standings compute themselves from what you entered. You check
                numbers; you do not maintain them.
              </li>
              <li>
                <strong>Message traffic.</strong> &ldquo;Where do I
                stand?&rdquo; and &ldquo;did I book?&rdquo; have visible
                answers, which removes a surprising share of your inbox.
              </li>
              <li>
                <strong>Reconciliation.</strong> One record, one source of
                truth: the spreadsheet, the notebook and the chat history stop
                competing to be believed.
              </li>
              <li>
                <strong>Rooms full of speculation.</strong> The{" "}
                <a href="/features/leaderboard">anonymised leaderboard</a> and
                class statistics let students read their own situation without
                asking you to confirm it line by line.
              </li>
            </ul>

            <h2>You stay in control</h2>
            <p>
              Nothing publishes without your action. Access is scoped to the
              sections you run — you cannot see, and are not responsible for,
              data outside your scope. Corrections flow through your own
              entries: fix the mark, republish, and everyone downstream sees
              the corrected version. The portal records who can do what at the
              database level, which means your rights and your responsibilities
              are aligned, not merely assumed.
            </p>
            <p>
              And when the semester ends, there is no great spreadsheet cleanup
              — the record already looks the way you would have wanted it to
              look. If your course is considering the portal, the{" "}
              <a href="/resources/ta-guide">TA guide</a> walks through running
              a full course week with it, and the{" "}
              <a href="/how-it-works">how it works</a> page shows the
              student-side view you will be feeding.
            </p>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Do I need special training to run a course?",
                a: "No. The workflow follows the semester's natural shape — assessments, marks, evaluations, announcements. If you can run a course on a spreadsheet, you will find this lighter, not heavier.",
              },
              {
                q: "Can I fix a mark after publishing?",
                a: "Yes. Correct the entry and republish; students see the current version, and the change is recorded against your account.",
              },
              {
                q: "What can I see as a TA?",
                a: "The courses and sections you run, and the marks and bookings that belong to them. Nothing outside that scope — enforced by database rules.",
              },
              {
                q: "How do I get started?",
                a: "Sign in through the TA login with the Google account your course expects. If your course is not set up on nuSkor yet, contact us through the contact page.",
              },
            ]}
          />
        </div>

        <div className="mt-12 max-w-3xl">
          <CtaCard
            title="Ready to run your course without the spreadsheet chaos?"
            description="Sign in as a TA to reach your sections, or read the TA guide for a walkthrough of the full workflow."
          />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/resources/ta-guide",
                label: "TA guide",
                description: "Running marks and evaluations, step by step.",
              },
              {
                href: "/features/csv-import",
                label: "CSV marks import",
                description: "From spreadsheet to checked records.",
              },
              {
                href: "/features/security",
                label: "Security",
                description: "What scoped access means in practice.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
