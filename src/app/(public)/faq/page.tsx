import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import RelatedLinks from "@/components/public/RelatedLinks";
import JsonLd from "@/components/public/JsonLd";
import { faqSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ — 28 Questions About nuSkor, Answered",
  description:
    "Frequently asked questions about nuSkor: using the tools, marks and ranking, evaluation booking, privacy, calculators, TA workflows and account access.",
  alternates: { canonical: "/faq" },
};

const GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Using nuSkor",
    items: [
      {
        q: "What is nuSkor?",
        a: "nuSkor is an independent, student-built project with two halves: free public tools (calculators, guides, a glossary) that work for any university student, and a course portal where participating courses run their marks, evaluations and announcements.",
      },
      {
        q: "Do I need an account to use it?",
        a: "Not for the public side. Every calculator, guide and reference page works without one. An account is only relevant if one of your courses uses the portal.",
      },
      {
        q: "Does it cost anything?",
        a: "No. The tools are free, and the portal is free for students of participating courses. The project is supported by advertising on public pages only — never on sign-in, admin or portal pages.",
      },
      {
        q: "Is nuSkor connected to any university?",
        a: "No. It is not affiliated with, endorsed by, or operated by any university. It speaks generically about academic concepts and always tells you to check your own institution's rules.",
      },
    ],
  },
  {
    title: "Marks & ranking",
    items: [
      {
        q: "Where do the marks on my marksheet come from?",
        a: "From your course's teaching staff, who enter them into the portal. nuSkor does not generate, verify or alter marks — it displays what was recorded for you.",
      },
      {
        q: "When do marks appear?",
        a: "The moment course staff publish an assessment. Until then it shows as pending, and unpaid assessments are never counted as zero in your running total.",
      },
      {
        q: "What does the class average include?",
        a: "Only published assessments. Each assessment's statistics (average, min, max) are computed from the marks actually published for that assessment.",
      },
      {
        q: "How is my rank computed?",
        a: "By weighted overall score: every published assessment contributes its share (marks earned ÷ total × weight), and ranks are ordered by that sum. Pending items contribute nothing until published.",
      },
    ],
  },
  {
    title: "Evaluation booking",
    items: [
      {
        q: "How do I book an evaluation slot?",
        a: "Open the evaluations page for the course and tap an open slot. Your booking is confirmed instantly and visibly in the grid.",
      },
      {
        q: "Can two students end up in the same slot?",
        a: "No. The database enforces one booking per student per evaluation period and one student per slot, so collisions are impossible even if two people tap at the same instant.",
      },
      {
        q: "Can I change or cancel my booking?",
        a: "It depends on the rules the course staff configured — whether rebooking is allowed, and whether it closes near the evaluation. Ask your course staff; they control the settings.",
      },
      {
        q: "Is the booking the same as official attendance?",
        a: "It is the course's scheduling record inside nuSkor. Whether it doubles as an official document is up to your course and institution.",
      },
    ],
  },
  {
    title: "Privacy & security",
    items: [
      {
        q: "Who can see my marks?",
        a: "You, and the teaching staff of the sections you are enrolled in. Database-level rules mean other students cannot read your rows at all — the protection is structural, not cosmetic.",
      },
      {
        q: "Does nuSkor sell or share my data?",
        a: "No. There is no data selling, and portal data is never exposed on public pages, sitemaps or social previews. See the privacy policy for the full account.",
      },
      {
        q: "What do the calculators do with what I type?",
        a: "Nothing — they compute locally in your browser. Nothing is uploaded, logged or associated with you, so there is nothing to leak even in principle.",
      },
      {
        q: "Will I ever see ads on my marksheet?",
        a: "No. Sign-in, admin and portal pages never load advertising scripts, cookies or units. Ads exist only on the public side of the site, and only after cookie consent.",
      },
    ],
  },
  {
    title: "Calculators",
    items: [
      {
        q: "Which calculators are available?",
        a: "Nine: CGPA, GPA/SGPA, final grade, course total, CGPA improvement planner, attendance, grade point converter, weighted percentage, and the semester what-if planner — all under the tools section.",
      },
      {
        q: "Why does my result differ from the official one?",
        a: "Almost always because of rounding conventions, grade point values, or cutoffs that differ from the defaults. Every nuSkor tool lets you edit the scale; match it to your handbook and compare again.",
      },
      {
        q: "Can I use a non-4.0 scale?",
        a: "Yes. Open 'Use my university's scale' in any tool and set the grade point values your institution uses — the arithmetic is scale-agnostic.",
      },
      {
        q: "Are my calculator results saved?",
        a: "No. Reloading the page resets everything. If you want a record, every major tool has a copy-result button that puts the summary on your clipboard.",
      },
    ],
  },
  {
    title: "TA & admin",
    items: [
      {
        q: "How does a course start using the portal?",
        a: "Through its teaching staff. A TA or instructor sets up the course, sections and assessments; students of that course then sign in and see their own dashboard. Interested courses can reach us via contact.",
      },
      {
        q: "What can teaching assistants do?",
        a: "Run the course workflow: create assessments with weightages, enter marks by hand or CSV import, publish and correct them, open evaluation slots, and post announcements.",
      },
      {
        q: "Can a TA see sections that are not theirs?",
        a: "No. Staff access is scoped by database rules to the sections they run — being staff for one section is not a key to the whole course.",
      },
      {
        q: "What is the admin role for?",
        a: "A narrow, explicit role for project-level coordination — managing course setup and support tasks. It is not a general window into student data; every access is governed by the same row-level policies.",
      },
    ],
  },
  {
    title: "Account & access",
    items: [
      {
        q: "How do I sign in?",
        a: "With Google sign-in. nuSkor never handles passwords; it receives only the basic profile that comes with sign-in.",
      },
      {
        q: "I signed in but see no courses — why?",
        a: "Your courses either have not been set up on nuSkor yet, or your enrolment has not been added by course staff. If one of your courses uses the portal, ask its teaching staff to check your enrolment.",
      },
      {
        q: "How do I delete my account or data?",
        a: "Use the portal's deletion-request feature, or email us from the contact page. We will process the request and confirm what was removed.",
      },
      {
        q: "Who do I contact about a problem?",
        a: "The contact page — nuSkor's own email address. For anything about official records, enrolment or institutional rules, contact your own university; those sit outside nuSkor entirely.",
      },
    ],
  },
];

export default function FaqPage() {
  const all = GROUPS.flatMap((g) => g.items);

  return (
    <>
      <JsonLd data={faqSchema(all)} />
      <PageHero
        title="Frequently asked questions"
        description={`${all.length} questions we actually get — grouped so you can find yours and move on.`}
        crumbs={[{ name: "FAQ", href: "/faq" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Most questions about nuSkor fall into seven buckets. If yours is
              not here, the <a href="/contact">contact page</a> is the next
              stop — and if it was asked often enough to reach this page, it
              will land here after the next revision.
            </p>
          </Prose>

          {GROUPS.map((group, gi) => (
            <section key={group.title} className="mt-10">
              <h2 className="text-xl font-extrabold tracking-tight text-ink">
                {group.title}
              </h2>
              <div className="mt-4 space-y-2">
                {group.items.map((item) => (
                  <details key={item.q} className="card group overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-ink/40 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="px-5 pb-5 text-sm leading-relaxed text-ink/60">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
              {gi === 2 && <AdSlot variant="display" />}
            </section>
          ))}

          <div className="mt-12">
            <CtaCard />
          </div>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/glossary",
                  label: "Glossary",
                  description: "Academic terms, defined generically.",
                },
                {
                  href: "/tools",
                  label: "All student tools",
                  description: "Nine calculators, no account required.",
                },
                {
                  href: "/contact",
                  label: "Contact",
                  description: "Ask the question this page missed.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
