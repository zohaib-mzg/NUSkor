import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import CtaCard from "@/components/public/CtaCard";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Updates — What's in nuSkor Today",
  description:
    "A running list of what nuSkor offers right now: public calculators and guides, the student portal, TA workflows, and the platform's privacy boundaries.",
  alternates: { canonical: "/updates" },
};

/**
 * Static changelog. Deliberately undated (no invented dates) — grouped by area,
 * maintained by hand as features ship.
 */
export default function UpdatesPage() {
  return (
    <>
      <PageHero
        title="What's in nuSkor"
        description="A plain inventory of what exists today, grouped by area. Updated as features ship — deliberately without invented dates."
        crumbs={[{ name: "Updates", href: "/updates" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Changelogs usually drown in version numbers and dates. This one
              does the opposite: it describes the current state of nuSkor in
              plain categories, so you can see — at a glance — what the project
              actually does right now. Anything listed here is live on the
              site; when something new ships, it joins the appropriate group.
            </p>

            <h2>Public tools</h2>
            <ul>
              <li>
                Nine free calculators: <a href="/tools/cgpa-calculator">CGPA</a>,{" "}
                <a href="/tools/gpa-calculator">GPA/SGPA</a>,{" "}
                <a href="/tools/grade-calculator">final grade</a>,{" "}
                <a href="/tools/course-total-calculator">course totals</a>,{" "}
                <a href="/tools/cgpa-improvement-planner">
                  improvement planning
                </a>
                , <a href="/tools/attendance-calculator">attendance</a>,{" "}
                <a href="/tools/grade-point-converter">grade points</a>,{" "}
                <a href="/tools/weighted-percentage-calculator">
                  weighted percentages
                </a>{" "}
                and the{" "}
                <a href="/tools/semester-gpa-planner">what-if planner</a>.
              </li>
              <li>
                Every calculator runs entirely in the browser, with an editable
                grade scale and no account required.
              </li>
              <li>
                Guidance content:{" "}
                <a href="/resources/gpa-scale-explained">scale explainer</a>,{" "}
                <a href="/resources/cgpa-formula">CGPA formula</a>,{" "}
                <a href="/resources/study-resources">study resources</a>, an{" "}
                <a href="/resources/evaluation-prep-checklist">
                  evaluation checklist
                </a>{" "}
                and a <a href="/resources/ta-guide">TA guide</a>.
              </li>
              <li>
                Reference pages: a <a href="/glossary">glossary</a> of grade
                terminology and an <a href="/faq">FAQ</a> covering the whole
                project.
              </li>
            </ul>

            <h2>Student portal</h2>
            <ul>
              <li>
                A <a href="/features/marksheet">live marksheet</a> with class
                statistics and per-assessment breakdowns.
              </li>
              <li>
                A <a href="/features/leaderboard">privacy-conscious
                leaderboard</a> built on weighted published marks.
              </li>
              <li>
                <a href="/features/evaluation-slots">Evaluation slot
                booking</a> with database-enforced no-double-booking.
              </li>
              <li>
                Per-course <a href="/features/announcements">announcements</a>{" "}
                in one feed.
              </li>
            </ul>

            <h2>Teaching assistant workflow</h2>
            <ul>
              <li>Structured assessment setup with weightages.</li>
              <li>
                Marks entry by hand or via{" "}
                <a href="/features/csv-import">validated CSV import</a>.
              </li>
              <li>Publish/correct cycles that stay under staff control.</li>
              <li>Evaluation period and slot management.</li>
            </ul>

            <h2>Privacy and platform</h2>
            <ul>
              <li>
                Database-level access rules (
                <a href="/features/security">explained plainly</a>) for every
                portal request.
              </li>
              <li>
                No advertising whatsoever on sign-in, admin or portal pages —
                ads live on public pages only, behind consent.
              </li>
              <li>
                A public site that stays free: guides, tools and reference
                pages with no account requirement.
              </li>
            </ul>

            <p className="mt-6 text-sm text-ink/50">
              Planning to add a course or try the portal? The{" "}
              <a href="/how-it-works">how it works</a> page is the place to
              start — and if something you need is missing, tell us via{" "}
              <a href="/contact">contact</a>.
            </p>
          </Prose>

          <div className="mt-10">
            <CtaCard />
          </div>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/features",
                  label: "Features",
                  description: "Every capability, one card at a time.",
                },
                {
                  href: "/how-it-works",
                  label: "How it works",
                  description: "The whole workflow in plain language.",
                },
                {
                  href: "/blog",
                  label: "Guides & articles",
                  description: "Practical writing for students and TAs.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
