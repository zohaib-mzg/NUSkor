import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  FileSpreadsheet,
  Lock,
  Table2,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Features — Marks, Slots, Rankings & More",
  description:
    "What nuSkor's portal does: a live marksheet, evaluation slot booking, a privacy-conscious leaderboard, course announcements, CSV marks import and database-enforced security.",
  alternates: { canonical: "/features" },
};

const FEATURES: {
  href: string;
  icon: ReactNode;
  title: string;
  blurb: string;
}[] = [
  {
    href: "/features/marksheet",
    icon: <Table2 className="h-5 w-5" />,
    title: "Live marksheet",
    blurb:
      "Every published assessment in one table, with class statistics and your standing.",
  },
  {
    href: "/features/evaluation-slots",
    icon: <CalendarCheck className="h-5 w-5" />,
    title: "Evaluation slot booking",
    blurb:
      "Pick an open slot at a tap; double-booking is impossible by database rule.",
  },
  {
    href: "/features/leaderboard",
    icon: <Trophy className="h-5 w-5" />,
    title: "Privacy-conscious leaderboard",
    blurb:
      "See where you stand without exposing anyone else — anonymised names, aggregate scores.",
  },
  {
    href: "/features/announcements",
    icon: <Bell className="h-5 w-5" />,
    title: "Course announcements",
    blurb: "One feed per course instead of five group chats and a lost email.",
  },
  {
    href: "/features/csv-import",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "CSV marks import (TAs)",
    blurb:
      "Bring a spreadsheet of marks in cleanly, with row-by-row validation before anything is saved.",
  },
  {
    href: "/features/security",
    icon: <Lock className="h-5 w-5" />,
    title: "Security, enforced by the database",
    blurb:
      "Row-level security in plain language: students read their own data, TAs their sections, nobody else.",
  },
];

export default function FeaturesHubPage() {
  return (
    <>
      <PageHero
        title="Everything nuSkor does"
        description="A marks workflow built for courses — legible for students, efficient for teaching assistants, with privacy enforced by database rules rather than promises."
        crumbs={[{ name: "Features", href: "/features" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              nuSkor&rsquo;s portal covers the parts of a course that usually
              live in spreadsheets and group chats: entering and publishing
              marks, showing students where they stand, booking evaluation
              slots, and keeping announcements in one place. Every feature below
              is part of the same small, privacy-first system — and each page
              explains the problem it solves and how it works, with imaginary
              sample data so you can see the shape of it.
            </p>
          </Prose>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                {f.icon}
              </div>
              <div>
                <p className="font-bold text-ink group-hover:text-gold-deep">
                  {f.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/55">
                  {f.blurb}
                </p>
              </div>
              <span className="mt-auto text-xs font-semibold text-gold-deep opacity-0 transition-opacity group-hover:opacity-100">
                Read more →
              </span>
            </Link>
          ))}
        </div>

        <AdSlot variant="display" />

        <div className="max-w-3xl">
          <Prose>
            <h2>How the pieces fit together</h2>
            <p>
              A course&rsquo;s workflow starts with structure: a teaching
              assistant or instructor sets up sections and assessments with
              weightages. From there, everything is a loop —{" "}
              <a href="/features/marksheet">marks get entered</a> (by hand or
              via <a href="/features/csv-import">CSV import</a>), published to
              students, and reflected immediately in the marksheet and the{" "}
              <a href="/features/leaderboard">leaderboard</a>. Evaluations get{" "}
              <a href="/features/evaluation-slots">booked through slots</a>{" "}
              instead of message threads, and anything the whole class needs to
              know lands in the{" "}
              <a href="/features/announcements">announcements feed</a>. The
              whole loop sits inside{" "}
              <a href="/features/security">database-enforced access rules</a>,
              so the privacy story is structural, not aspirational.
            </p>

            <h2>What the portal deliberately is not</h2>
            <p>
              nuSkor is not an official university system: it stores no
              official records, it does not replace any institution&rsquo;s
              results process, and it never publishes anyone&rsquo;s personal
              data. It behaves like a well-organised course tool — one that
              makes the people in a course better informed, and then gets out
              of the way. If you want to see the mechanics end-to-end, the{" "}
              <a href="/how-it-works">how it works</a> page walks through a
              typical week.
            </p>
          </Prose>
        </div>

        <div className="mt-10 max-w-3xl">
          <CtaCard />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/how-it-works",
                label: "How it works",
                description: "A typical week on nuSkor, step by step.",
              },
              {
                href: "/for-students",
                label: "For students",
                description: "What students get out of the portal.",
              },
              {
                href: "/for-tas",
                label: "For teaching assistants",
                description: "Marks, imports and slots without spreadsheets.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
