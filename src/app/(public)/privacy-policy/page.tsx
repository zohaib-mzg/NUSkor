import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "nuSkor's privacy policy in plain English: what the portal stores, what the calculators never send, how cookies and advertising work, and how to reach us.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        description="Plain English, no dark patterns: what nuSkor stores, what it never sees, and the choices you control."
        crumbs={[{ name: "Privacy policy", href: "/privacy-policy" }]}
        meta={<>Effective date: October 2026 · Last updated: October 2026</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <Callout title="The short version">
              <p>
                The public calculators run entirely in your browser — nothing
                you type into them reaches us. The portal stores only what a
                course needs to run its marks workflow, protected by database
                rules. Advertising cookies are used only if you accept them, and
                you can change that choice at any time.
              </p>
            </Callout>

            <h2>Who runs nuSkor</h2>
            <p>
              nuSkor is an independent, student-built project — not affiliated
              with, endorsed by, or operated by any university. It has two
              halves: a public website with calculators and guides, and a
              course portal where participating courses run marks, evaluations
              and announcements. For any privacy question, the contact address
              is{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
            </p>

            <h2>What we collect</h2>
            <h3>Portal accounts</h3>
            <p>
              To sign in, we use Google sign-in, and we store the basic profile
              that comes with it — your name, email address and profile image
              URL — plus your role in the system (student, teaching assistant or
              administrator). Beyond that, the portal stores what the workflow
              requires: the marks that instructors or teaching assistants enter
              for your courses, evaluation slot bookings, and your
              notification-related interactions with announcements. We do not
              ask for phone numbers, addresses or national identifiers, and the
              portal is not connected to any university&rsquo;s official
              systems.
            </p>
            <h3>Public tools</h3>
            <p>
              Every calculator on the public site — CGPA, GPA, grade,
              attendance and the rest — computes locally in your browser. The
              numbers you enter are never sent to a server, never logged, and
              never associated with you. There is no sign-in and no tracking of
              inputs on those pages.
            </p>
            <h3>Contact</h3>
            <p>
              The contact form opens your own email app; messages you send
              arrive in our inbox with whatever you chose to include. We keep
              correspondence only as long as needed to handle it.
            </p>

            <h2>Cookies and similar technologies</h2>
            <p>
              Cookies are small files a site can store in your browser. nuSkor
              uses:
            </p>
            <ul>
              <li>
                <strong>Essential storage</strong> — the sign-in session cookie
                for the portal (so you stay logged in), and a local storage
                entry on public pages that remembers your cookie choice. These
                are necessary for the site to work and are set without consent,
                as permitted for strictly functional storage.
              </li>
              <li>
                <strong>Advertising cookies</strong> — only after you press
                &ldquo;Accept&rdquo; in the consent banner. See below.
              </li>
            </ul>

            <h2>Advertising (Google AdSense)</h2>
            <p>
              Public pages may show advertising served by Google AdSense, which
              helps keep the project free. Ads only load if you gave consent; if
              you reject or ignore the banner, no advertising scripts or
              third-party advertising cookies run, and no ad units are shown.
              When consent is given, Google and its partners may use cookies or
              similar identifiers to serve and measure ads, as described in{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&rsquo;s advertising technologies policies
              </a>
              . Depending on your region and settings, ads may be personalised
              or non-personalised. Ads are never shown on sign-in, admin or
              portal pages.
            </p>

            <h2>How data is protected</h2>
            <p>
              Portal data lives in a managed database with row-level security:
              access rules are enforced at the database level, not just in the
              interface. A student can read their own marks; teaching assistants
              can read the sections they run; and no public page can query
              portal data at all. Sessions use secure, HTTP-only cookies where
              supported, and the site is served over HTTPS.
            </p>

            <h2>Retention, deletion and your choices</h2>
            <p>
              Portal data is kept while the course runs and your account
              exists. You can request deletion of your portal account and its
              data at any time — the portal includes a deletion-request feature,
              or you can email{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
              You can also withdraw advertising consent whenever you like via
              the &ldquo;Cookie settings&rdquo; link in the footer. Depending
              on where you live, you may have additional rights (access,
              correction, portability, objection) — email us and we will do our
              best to help.
            </p>

            <h2>Children</h2>
            <p>
              nuSkor is built for university students and is not directed at
              children under the age of digital consent in their country. If
              you believe a child has provided personal data through the
              portal, contact us and we will remove it.
            </p>

            <h2>Third-party services</h2>
            <p>
              The project uses reputable cloud providers for hosting and
              database services, and Google for sign-in and (consented)
              advertising. Each processes data under its own terms and privacy
              policy. We choose providers carefully and share with them only
              what the service requires.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this policy as the project evolves. The
              &ldquo;effective date&rdquo; and &ldquo;last updated&rdquo; notes
              above will always reflect the current version; significant
              changes will be called out on the site.
            </p>

            <h2>Contact</h2>
            <p>
              Questions, requests or concerns:{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> —
              nuSkor&rsquo;s own address, never a university one.
            </p>
          </Prose>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/cookie-policy",
                  label: "Cookie policy",
                  description: "Essential vs advertising cookies, in detail.",
                },
                {
                  href: "/terms",
                  label: "Terms of use",
                  description: "The ground rules for using nuSkor.",
                },
                {
                  href: "/contact",
                  label: "Contact",
                  description: "Ask a privacy question or request deletion.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
