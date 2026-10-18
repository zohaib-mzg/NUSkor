import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import CtaCard from "@/components/public/CtaCard";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About nuSkor — An Independent Student Project",
  description:
    "nuSkor is a free, independent, student-built project: public calculators and guides plus a marks portal for participating courses. Not affiliated with any university.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About nuSkor"
        description="An independent, student-built project with one goal: make the academic numbers students live with — marks, grades, CGPA — clearer and less stressful."
        crumbs={[{ name: "About", href: "/about" }]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              nuSkor started as a small tool for a classroom problem: the marks
              and evaluation bookkeeping that usually lives in scattered
              spreadsheets was hard for teaching assistants to run and
              impossible for students to see. A marksheet you could actually
              read, evaluation slots that could not be double-booked, and a
              ranking that respected privacy — that was the original idea. It
              grew into two halves: a{" "}
              <a href="/tools">set of free public calculators</a> that help any
              student plan their grades, and a portal where participating
              courses run their marks workflow.
            </p>

            <h2>What nuSkor is — and is not</h2>
            <p>
              nuSkor is an independent student-built project. It is not owned,
              operated, endorsed or approved by any university. It does not
              speak for any institution, it does not publish any university
              &rsquo;s rules, and it deliberately uses neutral language:{" "}
              <strong>your</strong> university, <strong>your</strong> course
              outline, <strong>your</strong> records. The portal displays only
              the marks that an instructor or teaching assistant entered for a
              specific student in a course that has chosen to use it.
            </p>

            <h2>Privacy first, enforced by the database</h2>
            <p>
              The portal is built on row-level security: database rules — not
              just interface choices — decide who can read what. A student can
              read their own marks and their own bookings; teaching assistants
              see the sections they run; nobody can quietly browse another
              person&rsquo;s results. On the public side, the calculators run
              entirely in your browser: nothing you type into them is sent to a
              server, stored, or attached to your identity.
            </p>

            <h2>How we keep the writing honest</h2>
            <p>
              Every guide and page on the public site follows the same
              discipline: original copy written from scratch, hedged claims
              where uncertainty exists, and fixed &ldquo;last updated&rdquo;
              notes so you can see the content is maintained. The calculators
              start from a{" "}
              <a href="/resources/gpa-scale-explained">
                commonly used 4.0 grade scale
              </a>{" "}
              that is editable everywhere, because real grade scales differ
              between institutions — and we never pretend otherwise.
            </p>
            <p>
              Where a topic touches rules — attendance, repeats, cutoffs — we
              say the same thing every time: rules differ between universities,
              and your course outline or handbook is the final authority. If
              you spot an error or something that reads as misleading, tell us
              and we will fix it.
            </p>

            <h2>Who this is for</h2>
            <ul>
              <li>
                <strong>Students</strong> who want their numbers straight:
                graders, planners and guides on the public site; a calm marks
                portal when their course uses it.
              </li>
              <li>
                <strong>Teaching assistants</strong> who want marks entry,
                CSV import, evaluation scheduling and announcements without
                spreadsheet chaos.
              </li>
              <li>
                <strong>Anyone curious</strong> about how GPA arithmetic works
                — the{" "}
                <a href="/resources/cgpa-formula">CGPA formula explained</a>{" "}
                is a good place to start.
              </li>
            </ul>

            <Callout title="The one-line version">
              <p>
                Free, independent, built by students — public tools for
                everyone, a privacy-respecting portal for courses that opt in.
              </p>
            </Callout>
          </Prose>

          <div className="mt-8">
            <CtaCard />
          </div>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/how-it-works",
                  label: "How nuSkor works",
                  description: "The marks-to-ranking flow, in plain words.",
                },
                {
                  href: "/contact",
                  label: "Contact nuSkor",
                  description: "Corrections, bug reports and questions.",
                },
                {
                  href: "/disclaimer",
                  label: "Disclaimer",
                  description: "Independence and estimates, stated plainly.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
