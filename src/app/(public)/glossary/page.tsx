import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import RelatedLinks from "@/components/public/RelatedLinks";
import JsonLd from "@/components/public/JsonLd";
import { definedTermSetSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Student Glossary — 40+ Academic Terms, Defined Plainly",
  description:
    "A generic glossary of academic terms: CGPA, SGPA, credit hours, weightage, sessional, viva, rubric, relative grading and more — university-neutral definitions.",
  alternates: { canonical: "/glossary" },
};

/**
 * Generic, university-neutral definitions. Where a term touches rules that
 * differ between institutions, the definition says so instead of stating any
 * university's policy as fact.
 */
const TERMS: { term: string; definition: string }[] = [
  {
    term: "Absolute grading",
    definition:
      "Grading against fixed score boundaries (for example, 90+ is an A) rather than against classmates' performance. Compare with relative grading. Institutions differ in how strictly boundaries are applied.",
  },
  {
    term: "Assignment",
    definition:
      "A piece of assessed work completed outside class, usually with a deadline. Its weight in the course total is defined by the course outline.",
  },
  {
    term: "Assessment",
    definition:
      "Any graded component of a course — quiz, assignment, sessional, midterm, final, project or viva. Each carries a weightage, and the weights define how much it matters.",
  },
  {
    term: "Attendance policy",
    definition:
      "A course or institution's rules about missed classes and any consequences. Policies differ widely, so the authoritative version is always your own course outline — never assume a general rule applies to you.",
  },
  {
    term: "Audit course",
    definition:
      "A course taken for learning rather than a grade — attendance and participation without a grade point contribution. Whether audits appear on transcripts differs by institution.",
  },
  {
    term: "CGPA",
    definition:
      "Cumulative Grade Point Average: the credit-weighted average of grade points across every counted course so far. It is total quality points divided by total credit hours, and it changes with every new semester.",
  },
  {
    term: "Class average",
    definition:
      "The mean score of a class on an assessment or course. Useful context: the same raw mark reads very differently above or below the class average.",
  },
  {
    term: "Core course",
    definition:
      "A course required by a program rather than chosen freely. Core status affects what you must take, not how the course's GPA maths works.",
  },
  {
    term: "Course outline",
    definition:
      "The document defining a course's assessments, their weights, grading approach, schedule and policies. When any general guidance conflicts with your course outline, the outline wins.",
  },
  {
    term: "Course withdrawal",
    definition:
      "Formally leaving a course before completion, with transcript effects that depend entirely on institutional rules and timing. Check your institution's process before assuming an outcome.",
  },
  {
    term: "Credit hour",
    definition:
      "The unit measuring a course's size, roughly one hour of instruction per week over a term. Credit hours are GPA's weighting mechanism: a 4-credit course counts more than a 3-credit one.",
  },
  {
    term: "Cutoff",
    definition:
      "The minimum percentage for a letter grade. Cutoffs differ between institutions and often between courses, so any table of cutoffs is only valid where it was issued.",
  },
  {
    term: "Elective",
    definition:
      "A course chosen from a set of options rather than required. Electives count toward GPA exactly like core courses — their grade points carry the same weight per credit hour.",
  },
  {
    term: "Evaluation",
    definition:
      "An assessed session — often a viva, demo or one-on-one marking meeting — where work is presented and questioned. Many courses schedule evaluations through booked time slots.",
  },
  {
    term: "Final exam",
    definition:
      "The end-of-term assessment, usually carrying the largest single weight in a course. Its exact weight comes from the course outline, not from tradition.",
  },
  {
    term: "GPA",
    definition:
      "Grade Point Average: the credit-weighted average of grade points for a defined set of courses. In common usage, GPA often refers to one semester (see SGPA) while CGPA refers to the cumulative record.",
  },
  {
    term: "Grade appeal",
    definition:
      "A formal request to review a grade, following an institution's own process. nuSkor is not part of any appeal process — appeals go through your institution's procedures.",
  },
  {
    term: "Grade point",
    definition:
      "The numeric value assigned to a letter grade on a university's scale (for example, A = 4.00 on a common 4.0 scale). Grade points are the raw material of every GPA calculation.",
  },
  {
    term: "Incomplete grade",
    definition:
      "A temporary grade given when coursework is unfinished, converted later per institutional rules. The conversion timeline and consequences are defined by your institution, not by a general convention.",
  },
  {
    term: "Instructor",
    definition:
      "The person responsible for a course — lectures, assessment design and final grade decisions. Teaching assistants usually operate under their direction.",
  },
  {
    term: "Leaderboard",
    definition:
      "A ranking view of scores. A privacy-conscious leaderboard shows your position with anonymised neighbours rather than a public wall of names and marks.",
  },
  {
    term: "Marksheet",
    definition:
      "A table of assessment results — what was graded, what it was worth, and what you earned. A digital marksheet can show running totals and class statistics; an official transcript it is not.",
  },
  {
    term: "Median",
    definition:
      "The middle value when scores are ordered. Less sensitive to outliers than the average, which is why a class median can tell a more honest story than a mean pulled up by two perfect papers.",
  },
  {
    term: "Midterm",
    definition:
      "A mid-semester assessment, typically carrying weight somewhere between quizzes and the final. Its exact share is set by the course outline.",
  },
  {
    term: "Office hours",
    definition:
      "Scheduled times when course staff are available for questions. An underused resource — a five-minute clarification often beats an hour of guessing.",
  },
  {
    term: "Pass/fail course",
    definition:
      "A course graded pass or fail without grade points, so it does not move a GPA (whether it affects credit totals depends on institutional rules).",
  },
  {
    term: "Percentage",
    definition:
      "A score expressed out of 100. In weighted courses, percentages per component are combined by weightage to produce an overall course percentage.",
  },
  {
    term: "Prerequisite",
    definition:
      "A requirement that must be completed before taking a course. Prerequisites are institutional rules — confirm them in the course catalogue, not by tradition.",
  },
  {
    term: "Quality points",
    definition:
      "Credit hours multiplied by grade points for a course. GPA and CGPA are simply total quality points divided by total credit hours.",
  },
  {
    term: "Quiz",
    definition:
      "A short assessment, often frequent and low-weight. Individually they move little; collectively they quietly decide whether you sit comfortably inside a letter boundary or just outside it.",
  },
  {
    term: "Rank",
    definition:
      "Your position relative to others, usually by weighted overall score. Rank is context for your own performance, not a judgement of it — class difficulty varies enormously.",
  },
  {
    term: "Relative grading (curve)",
    definition:
      "Grading partly by position within the class rather than only by fixed boundaries. Curves are course-specific and often adjusted by instructors, so no general formula describes them.",
  },
  {
    term: "Repeated course",
    definition:
      "Taking a course again after completing it once. Whether the old attempt stays in your CGPA, is replaced, or both count varies by institution — check your own rules before planning around a repeat.",
  },
  {
    term: "Rubric",
    definition:
      "A breakdown of how marks are awarded for an assessment — criteria and their relative importance. Reading the rubric before starting work is the cheapest grade improvement available.",
  },
  {
    term: "Semester",
    definition:
      "An academic term, typically 15–18 weeks, at the end of which grades are issued and SGPAs are computed.",
  },
  {
    term: "Sessional",
    definition:
      "Ongoing in-semester assessment — frequently quizzes, assignments and classwork combined into one weighted component. Exact composition is set by the course outline.",
  },
  {
    term: "SGPA",
    definition:
      "Semester Grade Point Average: the credit-weighted average of grade points for one semester. CGPA combines every semester's SGPA — but never as a plain average of the SGPAs themselves.",
  },
  {
    term: "Syllabus",
    definition:
      "The content plan for a course — topics, readings and sequence. The syllabus tells you what will be studied; the course outline tells you how it will be graded.",
  },
  {
    term: "Teaching assistant (TA)",
    definition:
      "A student or junior staff member who supports a course — running sections, grading, evaluations and student questions — under the instructor's direction.",
  },
  {
    term: "Transcript",
    definition:
      "The official record of courses and grades issued by an institution. GPA math on any website is a convenience; the transcript is the record that exists.",
  },
  {
    term: "Weightage",
    definition:
      "The percentage of the final course grade that an assessment contributes. Weightage is the single most useful number on a course outline: it tells you where effort converts into grade.",
  },
  {
    term: "Weighted average",
    definition:
      "An average where each value is multiplied by a weight before summing — the method behind course totals (weights = weightage) and GPAs (weights = credit hours).",
  },
  {
    term: "Viva",
    definition:
      "An oral examination or defence of work, often part of an evaluation session. Preparation is mostly rehearsal: explaining your work aloud, then answering follow-up questions.",
  },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function GlossaryPage() {
  const sorted = [...TERMS].sort((a, b) => a.term.localeCompare(b.term));
  const letters = Array.from(
    new Set(sorted.map((t) => t.term[0].toUpperCase()))
  );

  return (
    <>
      <JsonLd data={definedTermSetSchema({ terms: TERMS, path: "/glossary" })} />
      <PageHero
        title="Glossary of student terms"
        description={`${TERMS.length} academic terms, defined generically — no institution's rules smuggled in as fact.`}
        crumbs={[{ name: "Glossary", href: "/glossary" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Academic vocabulary is full of words everyone uses and few
              define: sessional, weightage, rubric, curve. This glossary covers
              the terms you will meet in course outlines, marksheets and
              corridor conversations — written to be true at{" "}
              <em>any</em> university. Where a term involves rules that differ
              between institutions, the definition says so and points you to
              the only authority: your own course outline or handbook.
            </p>
          </Prose>
        </div>

        <nav aria-label="Jump to letter" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {letters.map((letter) => (
              <li key={letter}>
                <a
                  href={`#letter-${letter.toLowerCase()}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-sm font-bold text-ink/70 transition-colors hover:border-gold hover:text-gold-deep"
                >
                  {letter}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 max-w-3xl space-y-10">
          {letters.map((letter, groupIndex) => (
            <section key={letter} id={`letter-${letter.toLowerCase()}`}>
              <h2 className="mb-4 border-b border-black/[0.08] pb-2 text-xl font-extrabold text-gold-deep">
                {letter}
              </h2>
              <dl className="space-y-5">
                {sorted
                  .filter((t) => t.term[0].toUpperCase() === letter)
                  .map((t) => (
                    <div key={t.term} id={slugify(t.term)} className="scroll-mt-28">
                      <dt className="font-bold text-ink">{t.term}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-ink/65">
                        {t.definition}
                      </dd>
                    </div>
                  ))}
              </dl>
              {/* One mid-page ad, after the second letter group. */}
              {groupIndex === 1 && <AdSlot variant="display" />}
            </section>
          ))}
        </div>

        <div className="mt-12 max-w-3xl">
          <Callout title="Missing a term?">
            <p>
              If a word you keep meeting is not here, tell us via{" "}
              <a href="/contact">contact</a> and it joins the next revision.
            </p>
          </Callout>
        </div>

        <div className="mt-10 max-w-3xl">
          <CtaCard />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/resources/gpa-scale-explained",
                label: "GPA scale explained",
                description: "Grade points and quality points, worked through.",
              },
              {
                href: "/tools/cgpa-calculator",
                label: "CGPA Calculator",
                description: "Apply the vocabulary to your own numbers.",
              },
              {
                href: "/faq",
                label: "FAQ",
                description: "28 questions about nuSkor itself.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
