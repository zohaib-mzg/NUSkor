import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  Compass,
  GraduationCap,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Resources — Guides for Grades, Study and Evaluations",
  description:
    "Free student resources: the GPA scale explained, the CGPA formula with worked examples, study strategies, an evaluation checklist and a TA running guide.",
  alternates: { canonical: "/resources" },
};

const RESOURCES: {
  href: string;
  icon: ReactNode;
  title: string;
  blurb: string;
}[] = [
  {
    href: "/resources/gpa-scale-explained",
    icon: <GraduationCap className="h-5 w-5" />,
    title: "GPA scale explained",
    blurb:
      "How letter grades map to grade points on a commonly used 4.0 scale — and why yours may differ.",
  },
  {
    href: "/resources/cgpa-formula",
    icon: <BookOpen className="h-5 w-5" />,
    title: "The CGPA formula",
    blurb:
      "Quality points, credit weighting and the cumulative average — step by step, with three worked examples.",
  },
  {
    href: "/resources/study-resources",
    icon: <Compass className="h-5 w-5" />,
    title: "Study resources",
    blurb:
      "Study methods that fit the course type: programming, mathematics, theory — plus time-boxing and recall.",
  },
  {
    href: "/resources/evaluation-prep-checklist",
    icon: <CalendarCheck className="h-5 w-5" />,
    title: "Evaluation prep checklist",
    blurb:
      "Everything to arrange before a viva or evaluation slot — from demo-ready code to questions you can answer.",
  },
  {
    href: "/resources/ta-guide",
    icon: <Users className="h-5 w-5" />,
    title: "TA guide",
    blurb:
      "How teaching assistants run marks, imports and evaluation slots without spreadsheets or chaos.",
  },
];

export default function ResourcesHubPage() {
  return (
    <>
      <PageHero
        title="Resources & guides"
        description="Practical, generic, university-neutral: the concepts behind your numbers and the habits that move them."
        crumbs={[{ name: "Resources", href: "/resources" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Understanding the arithmetic removes a surprising amount of
              academic anxiety — and understanding how to study removes more.
              These guides cover both halves: how grades are computed and what
              the terms mean, and how to actually prepare for quizzes,
              evaluations and exams. Everything here is written to apply at any
              university; where rules differ between institutions, we say so
              and point you to your own course outline.
            </p>
          </Prose>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                {r.icon}
              </div>
              <div>
                <p className="font-bold text-ink group-hover:text-gold-deep">
                  {r.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/55">
                  {r.blurb}
                </p>
              </div>
              <span className="mt-auto text-xs font-semibold text-gold-deep opacity-0 transition-opacity group-hover:opacity-100">
                Read the guide →
              </span>
            </Link>
          ))}
          <Link
            href="/glossary"
            className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-ink group-hover:text-gold-deep">
                Glossary
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">
                40+ academic terms — from credit hour and weightage to rubric
                and relative grading — defined generically.
              </p>
            </div>
            <span className="mt-auto text-xs font-semibold text-gold-deep opacity-0 transition-opacity group-hover:opacity-100">
              Browse terms →
            </span>
          </Link>
        </div>

        <AdSlot variant="display" />

        <div className="max-w-3xl">
          <Prose>
            <h2>How to use these guides</h2>
            <p>
              Start with the numbers:{" "}
              <a href="/resources/gpa-scale-explained">
                the GPA scale explained
              </a>{" "}
              shows how letters become points, and{" "}
              <a href="/resources/cgpa-formula">the CGPA formula</a> shows how
              points become your cumulative average. Once that arithmetic is
              clear, the planning tools on the{" "}
              <a href="/tools">tools page</a> become much more powerful —
              you can see exactly why a 4-credit course moves the needle more
              than a 1-credit lab, and plan accordingly.
            </p>
            <p>
              Then move to practice:{" "}
              <a href="/resources/study-resources">study resources</a> covers
              methods by course type, the{" "}
              <a href="/resources/evaluation-prep-checklist">
                evaluation checklist
              </a>{" "}
              makes vivas less scary, and the{" "}
              <a href="/resources/ta-guide">TA guide</a> is for those running
              the other side of the course. Standing behind all of it, always:
              your university&rsquo;s own rules and records are the final
              authority — these guides explain concepts, not policy.
            </p>
          </Prose>

          <div className="mt-8">
            <CtaCard />
          </div>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/tools",
                  label: "All student tools",
                  description: "Put the concepts to work with nine calculators.",
                },
                {
                  href: "/glossary",
                  label: "Glossary",
                  description: "Every term, defined generically.",
                },
                {
                  href: "/faq",
                  label: "FAQ",
                  description: "Project questions, grouped and answered.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
