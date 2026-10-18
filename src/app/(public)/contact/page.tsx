import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import ContactForm from "@/components/public/ContactForm";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact nuSkor",
  description:
    "The only contact address for nuSkor is our own — never a university address. Send bug reports, corrections or privacy questions by email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact nuSkor"
        description="One address, run by the project's maintainer: reports, corrections, privacy questions — all welcome."
        crumbs={[{ name: "Contact", href: "/contact" }]}
        meta={<>Last updated: October 2026</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>Where to write</h2>
              <p>
                nuSkor&rsquo;s contact address is{" "}
                <a href={`mailto:${SITE.contactEmail}`}>
                  <strong>{SITE.contactEmail}</strong>
                </a>
                . It is the only contact channel on this site — and it is
                deliberately nuSkor&rsquo;s own. We do not publish, forward to,
                or answer for any university&rsquo;s helpdesk: institutions
                have their own official channels, and questions about your
                enrolment, fees or official record belong there.
              </p>

              <h2>What we can help with</h2>
              <ul>
                <li>
                  <strong>Corrections.</strong> Spotted a wrong formula, a
                  misleading sentence or a broken link on any public page? Tell
                  us the page and what you expected — corrections are top
                  priority.
                </li>
                <li>
                  <strong>Bug reports.</strong> Something on the calculators or
                  the portal misbehaving? Include the page address, what you
                  did, what happened, and what you expected instead. A
                  screenshot helps enormously.
                </li>
                <li>
                  <strong>Privacy requests.</strong> Questions about data, or a
                  deletion request for a portal account, can be sent here — see
                  the <a href="/privacy-policy">privacy policy</a> for what the
                  portal stores.
                </li>
                <li>
                  <strong>General questions</strong> about the project, the
                  tools, or how something is calculated.
                </li>
              </ul>

              <h2>What to expect</h2>
              <p>
                nuSkor is maintained by a small, independent team alongside
                studies. We read everything, but replies are best-effort and
                can take a few days. Bug reports with clear reproduction steps
                get looked at first; corrections to content are usually fixed
                quickly once confirmed.
              </p>
              <p>
                Please do not send anyone&rsquo;s personal data — not yours,
                not another student&rsquo;s, not an instructor&rsquo;s. If a
                question needs account-specific details, we will reply and
                arrange the safest way to handle it.
              </p>

              <Callout title="Before you write">
                <p>
                  Questions about rules — attendance, repeats, cutoffs, exam
                  eligibility — are answered by your own course outline or
                  academic office, not by us. Our public guides explain common
                  concepts, but nuSkor has no authority over any
                  university&rsquo;s policy.
                </p>
              </Callout>
            </Prose>
          </div>

          <div>
            <ContactForm />
          </div>
        </div>

        <div className="mt-12 max-w-3xl">
          <RelatedLinks
            links={[
              {
                href: "/faq",
                label: "FAQ",
                description: "Answers to the questions we see most often.",
              },
              {
                href: "/privacy-policy",
                label: "Privacy policy",
                description: "What the portal stores and how consent works.",
              },
              {
                href: "/about",
                label: "About nuSkor",
                description: "The project's background and principles.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
