import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Disclaimer — Independence & Estimates",
  description:
    "nuSkor is an independent student-built project, not affiliated with any university. Calculators are estimates for planning; your university's rules and records are final.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <>
      <PageHero
        title="Disclaimer"
        description="The short version: nuSkor is independent, the calculators are planning estimates, and your university's own rules and records always come first."
        crumbs={[{ name: "Disclaimer", href: "/disclaimer" }]}
        meta={<>Last updated: October 2026</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <Callout title="Independence, stated plainly">
              <p>{SITE.independence.line}</p>
            </Callout>

            <p>
              nuSkor is an independent, student-built project. It is not
              affiliated with, endorsed by, or operated by any university. No
              page on this site is official, authorized, approved or partnered
              by any institution — and nothing here should be read as such.
              Wherever this site mentions rules — grading, attendance, repeats,
              anything — it does so generically and asks you to check with your
              own institution.
            </p>

            <h2>Calculators and guides are estimates</h2>
            <p>
              Every calculator on nuSkor is a planning tool. It performs
              standard, transparent arithmetic — weighted averages, credit-hour
              maths, fractions — on the numbers you enter. It does not know
              your university&rsquo;s specific policies, rounding conventions,
              curve rules or exceptions, and it cannot foresee how an
              instructor will treat a borderline case. Treat its output as{" "}
              <strong>an estimate for planning, never as an official result</strong>
              .
            </p>
            <p>
              The same applies to guides, formulas and examples on the public
              site: they explain commonly used concepts, using a commonly used
              4.0 grade scale as an editable default. Your institution and your
              course outline are the final authority on what any rule actually
              is.
            </p>

            <h2>Not academic, legal or financial advice</h2>
            <p>
              Content on nuSkor is provided for general information and study
              planning. It is not academic advice, not legal advice, and not
              financial advice. Decisions about courses, repeats, withdrawals,
              targets or study strategies are yours — ideally made together
              with your advisor or instructor, who can see your actual record.
            </p>

            <h2>No official records</h2>
            <p>
              nuSkor holds no official records. The portal displays only the
              marks that an instructor or teaching assistant entered for you in
              a course that has chosen to use it, and it exists to make that
              information legible — not to replace any official transcript or
              university system. For anything official — transcripts,
              enrolment, fees, deadlines — use your university&rsquo;s own
              services.
            </p>

            <h2>Accuracy and corrections</h2>
            <p>
              We work to keep every page accurate and clearly dated, and we
              correct mistakes when they are pointed out. If you find an error
              — a wrong formula, a misleading sentence, a broken link — please
              report it via the <a href="/contact">contact page</a> or email{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
              Because nuSkor is independent and self-hosted, response times are
              best-effort.
            </p>

            <h2>External links</h2>
            <p>
              Some pages link to third-party sites, such as Google&rsquo;s ad
              policies. We choose those links carefully, but we do not control
              external content and are not responsible for it. Following an
              external link means leaving nuSkor and accepting that site&rsquo;s
              own terms and policies.
            </p>

            <h2>Changes</h2>
            <p>
              This disclaimer may be updated as the project evolves; the
              &ldquo;last updated&rdquo; note at the top of the page reflects
              the current version. Continuing to use nuSkor after a change
              means you accept the updated text.
            </p>
          </Prose>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/about",
                  label: "About nuSkor",
                  description: "Who builds this, and why.",
                },
                {
                  href: "/terms",
                  label: "Terms of use",
                  description: "The ground rules for using nuSkor.",
                },
                {
                  href: "/contact",
                  label: "Contact",
                  description: "Report an error or ask a question.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
