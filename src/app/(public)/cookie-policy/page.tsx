import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import RelatedLinks from "@/components/public/RelatedLinks";
import CookieSettingsLink from "@/components/public/CookieSettingsLink";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How nuSkor uses cookies: essential storage for sign-in and consent, advertising cookies only after you accept, and how to change your choice at any time.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <>
      <PageHero
        title="Cookie Policy"
        description="What gets stored in your browser, why, and how to change your mind in two clicks."
        crumbs={[{ name: "Cookie policy", href: "/cookie-policy" }]}
        meta={<>Effective date: October 2026 · Last updated: October 2026</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <h2>What cookies are</h2>
            <p>
              Cookies are small files that a website can ask your browser to
              store. They are used for everything from keeping you signed in to
              measuring advertising. Related technologies — like local storage —
              work similarly and are covered by this policy too. What matters
              is <em>who set it</em> and <em>what it is for</em>, which is
              exactly how nuSkor separates its storage.
            </p>

            <h2>Essential storage (always on)</h2>
            <p>
              A few things must work for the site to function at all, so they
              run without asking for consent:
            </p>
            <ul>
              <li>
                <strong>Session cookies for the portal.</strong> When you sign
                in — via Google — we set cookies that keep your session
                secure and recognise you between pages. Signing out clears
                them.
              </li>
              <li>
                <strong>Your consent choice.</strong> The banner&rsquo;s
                decision (accept or reject) is stored in your browser&rsquo;s
                local storage, so we do not nag you on every page. It contains
                no identifiers beyond the choice itself.
              </li>
            </ul>
            <p>
              These contain no advertising identifiers and are never used to
              build a profile of you.
            </p>

            <h2>Advertising cookies (only with your consent)</h2>
            <p>
              Public pages are supported by Google AdSense. Advertising only
              activates after you press <strong>Accept</strong> in the consent
              banner. When it does, Google and its partners may set cookies or
              read identifiers to serve, personalise (where applicable) and
              measure ads. That processing is described in{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&rsquo;s advertising policies
              </a>
              .
            </p>
            <p>
              If you press <strong>Reject</strong> — or simply keep browsing
              without accepting — advertising scripts never load, no ad units
              are rendered, and no advertising cookies are set. The site
              remains fully usable; the only difference is that you see no
              ads.
            </p>

            <h2>What we never use</h2>
            <ul>
              <li>
                No cross-site tracking by nuSkor itself — the calculators
                compute locally and inputs are never transmitted.
              </li>
              <li>
                No advertising or analytics scripts on sign-in, admin or portal
                pages, ever.
              </li>
              <li>
                No sale of personal data. The project has nothing to sell and
                no interest in doing so.
              </li>
            </ul>

            <h2>Changing your choice</h2>
            <p>
              You can change your mind at any time: open cookie settings from
              the footer — <CookieSettingsLink /> — and accept or reject again.
              Rejecting withdraws consent immediately and stops advertising
              storage on your next page loads.
            </p>
            <p>
              You can also control cookies through your browser: every major
              browser lets you view, block and delete cookies, and some offer
              private windows that discard them when closed. Blocking essential
              storage will break sign-in, but blocking only advertising cookies
              will leave the site fully usable.
            </p>

            <h2>Third parties</h2>
            <p>
              The third-party services that can set storage in your browser are
              limited to our sign-in provider (Google) on the portal, and
              Google&rsquo;s advertising services on public pages with consent.
              Each operates under its own policies, linked above.
            </p>

            <h2>Changes and contact</h2>
            <p>
              If this policy changes, the dates at the top of this page will
              reflect the current version. Questions about cookies or consent
              can go to{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
            </p>

            <Callout title="One-sentence version">
              <p>
                Essential storage keeps the site and your session working;
                advertising storage is optional, off by default, and revocable
                from the footer at any time.
              </p>
            </Callout>
          </Prose>

          <div className="mt-12">
            <RelatedLinks
              links={[
                {
                  href: "/privacy-policy",
                  label: "Privacy policy",
                  description: "The full picture on data and choices.",
                },
                {
                  href: "/faq",
                  label: "FAQ",
                  description: "Common questions, grouped by topic.",
                },
                {
                  href: "/contact",
                  label: "Contact",
                  description: "Ask us anything about privacy.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
