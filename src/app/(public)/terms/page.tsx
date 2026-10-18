import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms for using nuSkor: acceptable use, account responsibilities, accuracy of marks, intellectual property, availability, liability and governing law.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        title="Terms of Use"
        description="Straightforward rules for using nuSkor — written to be read, not to be skipped."
        crumbs={[{ name: "Terms", href: "/terms" }]}
        meta={<>Effective date: October 2026 · Last updated: October 2026</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              By using nuSkor — the public website and the course portal — you
              agree to these terms. If you do not agree, please do not use the
              site. These terms apply to everyone: students, teaching
              assistants, administrators and casual visitors.
            </p>

            <h2>1. What nuSkor is</h2>
            <p>
              nuSkor is an independent, student-built project offering free
              public tools (calculators, guides, reference pages) and a portal
              that participating courses use to manage marks, evaluations and
              announcements. It is <strong>not</strong> affiliated with,
              endorsed by, or operated by any university, and it holds no
              official academic records. It is provided free of charge,
              as-is.
            </p>

            <h2>2. Acceptable use</h2>
            <ul>
              <li>
                Use the site lawfully and respectfully — no harassment, no
                unlawful content, no attempts to disrupt or overload the
                service.
              </li>
              <li>
                Do not attempt to access data that is not yours: no probing,
                scraping, crawling beyond normal browsing, or circumventing
                access controls.
              </li>
              <li>
                Do not misrepresent yourself or impersonate anyone, and do not
                use the portal to submit marks or bookings other than your own
                where the workflow expects them from you.
              </li>
              <li>
                Do not copy the site wholesale: short quotes with attribution
                and links are fine; bulk reproduction or republishing is not.
              </li>
            </ul>

            <h2>3. Accounts and access</h2>
            <p>
              Sign-in happens through Google, and roles (student, teaching
              assistant, administrator) determine what you can see. Keep your
              account secure and tell us promptly if you believe it has been
              compromised. Teaching assistants and administrators are
              responsible for the marks and content they enter: enter accurate
              information, and correct mistakes promptly through the
              portal&rsquo;s own tools or by contacting us.
            </p>

            <h2>4. Accuracy of marks and estimates</h2>
            <p>
              The portal displays marks as entered by course staff; nuSkor does
              not verify them and they are not official results. The
              calculators and guides are estimates for planning only — your
              university&rsquo;s rules and records are the final authority.
              See the <a href="/disclaimer">disclaimer</a> for the full
              statement.
            </p>

            <h2>5. Intellectual property</h2>
            <p>
              The nuSkor name, logo, design and written content belong to the
              project and its maintainer. You may use the site normally, link
              to it freely, and quote short excerpts with attribution.
              Data you enter into the portal (such as marks as a teaching
              assistant) remains subject to your course&rsquo;s and
              institution&rsquo;s own arrangements; we store it only to
              operate the service.
            </p>

            <h2>6. Availability and termination</h2>
            <p>
              nuSkor runs on a best-effort basis. Features may change, pause or
              be discontinued at any time — especially during exam periods,
              holidays or maintenance. We may suspend or terminate access for
              behaviour that violates these terms or endangers the service or
              other users. You may stop using nuSkor at any time and request
              account deletion as described in the{" "}
              <a href="/privacy-policy">privacy policy</a>.
            </p>

            <h2>7. Disclaimers and liability</h2>
            <p>
              The service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo;, without warranties of any kind, express or
              implied, including fitness for a particular purpose or
              uninterrupted availability. To the maximum extent permitted by
              law, nuSkor and its maintainer are not liable for any indirect,
              incidental or consequential damages arising from your use of the
              site — including academic, scheduling or data decisions made on
              the basis of estimates shown here. Nothing in these terms limits
              liability that cannot be limited by law.
            </p>

            <h2>8. Governing law</h2>
            <p>
              These terms are governed by the laws of Pakistan. Disputes will
              be handled in good faith first by contacting us at{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>,
              and otherwise by the competent courts of Pakistan.
            </p>

            <h2>9. Changes</h2>
            <p>
              We may update these terms as the project evolves. The effective
              date above tracks the current version; continued use after a
              change means you accept the updated terms.
            </p>

            <Callout title="Questions?">
              <p>
                Write to{" "}
                <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>{" "}
                — the one and only contact address for nuSkor.
              </p>
            </Callout>
          </Prose>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/privacy-policy",
                  label: "Privacy policy",
                  description: "Your data, in plain English.",
                },
                {
                  href: "/disclaimer",
                  label: "Disclaimer",
                  description: "Independence, estimates, and what we are not.",
                },
                {
                  href: "/cookie-policy",
                  label: "Cookie policy",
                  description: "Essential vs advertising cookies.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
