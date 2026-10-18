import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "For Students — Marks, Ranks and Slots in One Place",
  description:
    "What nuSkor gives students: a live marksheet, class statistics, a privacy-conscious rank, evaluation slot booking and one announcements feed. Free, independent.",
  alternates: { canonical: "/for-students" },
};

export default function ForStudentsPage() {
  return (
    <>
      <PageHero
        title="For students"
        description="Your marks, as soon as they exist — with the context to understand them and none of the exposure you didn't ask for."
        crumbs={[{ name: "For students", href: "/for-students" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Most academic stress is not really about the mark — it is about
              the not-knowing. Where do I stand? Did the deadline move? Is 74%
              fine? nuSkor exists to shrink the not-knowing: the numbers arrive
              when they exist, the context arrives with them, and nothing about
              you is displayed to anyone you did not choose to tell.
            </p>

            <h2>What you get</h2>
            <ul>
              <li>
                <strong>A live marksheet.</strong> Each published assessment
                with its weight and your marks — plus, for every one of them,
                the class average, the range and your position. You stop doing
                your own rounding at midnight.{" "}
                <a href="/features/marksheet">See what it looks like →</a>
              </li>
              <li>
                <strong>A rank that respects the class.</strong> The{" "}
                <a href="/features/leaderboard">leaderboard</a> shows your
                weighted standing with anonymised neighbours — useful context,
                zero score-walls.
              </li>
              <li>
                <strong>Evaluation slots without the scramble.</strong> Book a{" "}
                <a href="/features/evaluation-slots">slot</a> with one tap. The
                grid physically cannot double-book you or anyone else.
              </li>
              <li>
                <strong>One announcements feed.</strong> Deadline changes and
                schedule updates live in one place, attached to the course —
                not at the mercy of who checked which chat.{" "}
                <a href="/features/announcements">How the feed works →</a>
              </li>
              <li>
                <strong>Free planning tools for everyone.</strong> Even without
                the portal, the{" "}
                <a href="/tools">nine public calculators</a> answer the
                &ldquo;what do I need?&rdquo; questions — privately, in your
                browser.
              </li>
            </ul>

            <h2>Why the privacy story is real, not marketing</h2>
            <p>
              Your marks are protected by database-level rules: requests can
              only ever read your own rows — yours, not your classmates&rsquo;,
              not last year&rsquo;s, not the section next door&rsquo;s. Your
              teaching staff can see the sections they run, because they need to
              to do their jobs; nobody else can see anything. And the public
              calculators you use to plan are a completely separate world:
              nothing you type into them is uploaded, stored or attached to
              you.
            </p>
            <p>
              There is one more boundary students appreciate once they hear it:{" "}
              <strong>no advertising exists on the private side of nuSkor</strong>
              . Sign-in pages, dashboards, marksheets — no ad scripts, no
              ad cookies, no units. Ads support the public guides, never your
              marks. The full picture is on the{" "}
              <a href="/features/security">security page</a>.
            </p>

            <h2>Getting in</h2>
            <p>
              If one of your courses uses nuSkor, sign in with the Google
              account your course expects and you will land in your own
              dashboard — the courses, marks and bookings that belong to you.
              If no course of yours uses it yet, the public side still works
              for you today: calculators, guides, glossary and FAQs, free of
              charge, free of accounts.
            </p>
            <p>
              One honest note to keep expectations straight: nuSkor is an
              independent, student-built project. It is not an official
              university system, it holds no official records, and your
              institution remains the final authority for everything formal.
              What nuSkor brings is clarity along the way.
            </p>

            <AdSlot variant="display" />
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Does using nuSkor cost anything as a student?",
                a: "No. The tools are free, and the portal is free for students of participating courses. The project is supported by unobtrusive advertising on public pages only.",
              },
              {
                q: "Will my classmates see my marks?",
                a: "No. Database rules limit reads to your own rows; the leaderboard around you is anonymised. Course staff see the sections they run — that is the entire audience.",
              },
              {
                q: "My course does not use nuSkor. Is anything still useful to me?",
                a: "Yes — the entire public side: nine calculators, guides, the glossary and the FAQ. They are built for any university student and need no account.",
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
                href: "/tools",
                label: "All student tools",
                description: "Nine free calculators, no account needed.",
              },
              {
                href: "/features",
                label: "Portal features",
                description: "Marksheet, slots, leaderboard and more.",
              },
              {
                href: "/faq",
                label: "FAQ",
                description: "25+ questions, grouped and answered.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
