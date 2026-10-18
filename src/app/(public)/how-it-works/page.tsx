import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "How nuSkor Works — From Marks Entry to Your Dashboard",
  description:
    "A plain-language walkthrough of nuSkor: how courses set up, how marks are entered and published, and what students see on the other side — plus what nuSkor never does.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="How nuSkor works"
        description="A course tool with two sides: staff run the workflow, students watch their numbers become visible. Here is the whole loop, explained."
        crumbs={[{ name: "How it works", href: "/how-it-works" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <h2>The big picture</h2>
            <p>
              nuSkor is two things wearing one name. The public side — that is,
              everything you can reach without an account — offers free
              calculators and guides to any student anywhere. The private side
              is a course portal: courses that choose to use it run their marks
              workflow there, and their enrolled students get a live view of
              their own results. No course, no portal — the public tools work
              regardless.
            </p>
            <p>
              When a course opts in, a teaching assistant or instructor
              becomes the workflow&rsquo;s driver. They define the course
              structure once — the assessments and their weights, the
              evaluation periods, the sections they teach — and from then on
              the system does the bookkeeping. There are no spreadsheets to
              reconcile, no totals to recompute by hand, and no group-chat
              archaeology when someone asks what the deadline was.
            </p>

            <h2>Step by step: the staff side</h2>
            <ol>
              <li>
                <strong>Set up the course.</strong> Assessments are created
                with names, totals and weightages — quiz 5%, assignment 10%,
                midterm 25%, whatever the outline says. This is the only place
                those numbers need to be typed.
              </li>
              <li>
                <strong>Enter marks.</strong> Results go in by hand for small
                assessments, or through{" "}
                <a href="/features/csv-import">CSV import</a> when a spreadsheet
                already exists — with validation catching typos before anything
                is saved.
              </li>
              <li>
                <strong>Publish.</strong> Marks become visible to students at
                the moment of publishing, not before. Staff can verify quieter,
                correct faster, and answer fewer frantic messages.
              </li>
              <li>
                <strong>Run evaluations.</strong> Slots are opened for the
                evaluation period; students book them; the roster assembles
                itself on the{" "}
                <a href="/features/evaluation-slots">booking grid</a>.
              </li>
              <li>
                <strong>Announce.</strong> Deadline changes, room swaps and
                revisions land in the{" "}
                <a href="/features/announcements">course feed</a> once, for
                everyone.
              </li>
            </ol>

            <AdSlot variant="in-article" />

            <h2>Step by step: the student side</h2>
            <ol>
              <li>
                <strong>Sign in with Google.</strong> If your course uses
                nuSkor, signing in lands you in your own dashboard — your
                sections, your courses.
              </li>
              <li>
                <strong>Watch the marksheet.</strong> Every published
                assessment appears with its weight and your marks, alongside
                class statistics: the average, the range, your position. See{" "}
                <a href="/features/marksheet">the marksheet page</a> for the
                mockup.
              </li>
              <li>
                <strong>Check the leaderboard.</strong> Your rank, computed from
                weighted published marks, with everyone else anonymised —
                context without exposure.
              </li>
              <li>
                <strong>Book your slot.</strong> Evaluation slots are claimed
                with one tap, and the grid guarantees no double-bookings.
              </li>
            </ol>

            <h2>A typical week, in one paragraph</h2>
            <p>
              Monday: a quiz is graded and published; the marksheet updates, and
              the leaderboard quietly re-sorts. Tuesday: evaluation slots for
              next week open, and the grid fills through the day. Wednesday: a
              deadline moves — one announcement, no confusion. Thursday: a
              sessional&rsquo;s spreadsheet is imported in two minutes.
              Friday: someone wonders whether a 71% is enough for their target
              grade, and lands on the{" "}
              <a href="/tools/grade-calculator">final grade calculator</a> to
              find out. Nothing needed a group chat. That is the goal.
            </p>

            <h2>What nuSkor never does</h2>
            <ul>
              <li>
                No official records: nuSkor can never replace your
                university&rsquo;s results process, and it does not try.
              </li>
              <li>
                No ads on private pages: sign-in, admin and portal pages carry
                no advertising scripts, cookies or units — at all.
              </li>
              <li>
                No data browsing between students: database rules, not UI
                choices, decide who can read what.
              </li>
              <li>
                No invented numbers: every example and mockup on the public
                site is clearly fictional sample data.
              </li>
            </ul>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Do I need an account to use the calculators?",
                a: "No. Every public calculator works without an account, and nothing you type is sent anywhere. Accounts exist only for the portal side of nuSkor.",
              },
              {
                q: "How does a course start using the portal?",
                a: "Through its teaching staff — a TA or instructor sets up the course, sections and assessments. Students of the course simply sign in and see their own dashboard.",
              },
              {
                q: "Is nuSkor an official university system?",
                a: "No. It is an independent, student-built project. It shows marks that course staff entered for you, and it holds no official records — your university remains the authority for anything official.",
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
                href: "/features",
                label: "Features",
                description: "Every part of the portal, one card each.",
              },
              {
                href: "/for-students",
                label: "For students",
                description: "What you get out of nuSkor.",
              },
              {
                href: "/for-tas",
                label: "For teaching assistants",
                description: "The staff-side workflow in detail.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
