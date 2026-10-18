import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import SampleMockup from "@/components/public/SampleMockup";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security & Row-Level Security, Explained Plainly",
  description:
    "How nuSkor protects portal data: database-level row rules, scoped staff access, no ads on private pages, and calculators that never send your inputs.",
  alternates: { canonical: "/features/security" },
};

export default function SecurityFeaturePage() {
  return (
    <>
      <PageHero
        title="Security, enforced by the database"
        description="Row-level security in plain language — what it means, what it stops, and why interface hiding is not a security strategy."
        crumbs={[
          { name: "Features", href: "/features" },
          { name: "Security", href: "/features/security" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>The problem with &ldquo;you don&rsquo;t see that
              button&rdquo;</h2>
              <p>
                Many student tools protect data by hiding things in the
                interface: the marks you should not see simply do not appear on
                your screen. That is not security — it is decoration. If the
                underlying data can still be read by a curious visitor with the
                right request, the interface was never the wall. Real protection
                has to live where the data lives.
              </p>

              <h2>What nuSkor does instead</h2>
              <p>
                The portal uses row-level security — database rules that decide,
                for every single request, which rows of data the requesting
                account may read or change. The rules are attached to the data
                itself, so they apply no matter how the request arrives: the
                normal interface, a mis-typed address, or a hand-crafted call.
              </p>
              <p>
                In practice: a student&rsquo;s requests can read their own
                marks, their own bookings and their own profile — and nothing
                belonging to anyone else. A teaching assistant can read and
                write the courses and sections they run, and no more. The
                administrator role is narrow and explicit. Every policy is
                attached to a signed-in identity, and public pages cannot query
                portal data at all.
              </p>

              <h2>The privacy implications, spelled out</h2>
              <ul>
                <li>
                  <strong>No name-and-score walls.</strong> The{" "}
                  <a href="/features/leaderboard">leaderboard</a> is built on
                  top of the same rules, and exposes anonymised entries — the
                  strictest interpretation of &ldquo;see yourself, not
                  others&rdquo; the data allows.
                </li>
                <li>
                  <strong>Staff access is scoped, not universal.</strong> Being
                  a TA for one section does not grant a window into the whole
                  course — the rules follow your role and your section.
                </li>
                <li>
                  <strong>Calculators are a separate world.</strong> Public
                  tools run entirely in your browser. Nothing you type into
                  them reaches any server, which means there is nothing to leak
                  even in principle.
                </li>
              </ul>

              <h2>The other layers</h2>
              <p>
                Database rules sit in the middle of a wider arrangement:
                sign-in through Google (so nuSkor never handles passwords),
                HTTPS for everything in transit, a strict separation between
                public pages and portal pages, and one deliberate boundary
                that surprises nobody twice —{" "}
                <strong>no advertising scripts, cookies or units are ever
                loaded on sign-in, admin or portal pages</strong>. Ads belong to
                the public side of the site only, because private pages contain
                private student data.
              </p>
              <p>
                No system is beyond review, ours included. If you are a
                security-minded reader and you spot something worth improving,
                write to the contact address — corrections and responsible
                reports are genuinely welcome.
              </p>

              <AdSlot variant="display" />
            </Prose>
          </div>

          <SampleMockup title="Access matrix — what each role can read">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink/40">
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Student</th>
                  <th className="pb-2">TA</th>
                  <th className="pb-2">Admin</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Own marks", "✓", "—", "—"],
                  ["Others' marks (own section)", "✗", "✓", "✓"],
                  ["Own evaluation booking", "✓", "—", "—"],
                  ["Section bookings roster", "✗", "✓", "✓"],
                  ["Course announcements (read)", "✓", "✓", "✓"],
                  ["Ad / tracking scripts", "✗", "✗", "✗"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-black/[0.06]">
                    <td className="py-2 text-ink/70">{row[0]}</td>
                    {row.slice(1).map((cell, i) => (
                      <td key={i} className="py-2 font-semibold text-ink">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-ink/45">
              Simplified for readability — the real matrix is enforced by
              database policies attached to every row.
            </p>
          </SampleMockup>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Does nuSkor store my password?",
                a: "No. Sign-in happens through Google, which handles credentials. nuSkor receives only the basic profile that comes with sign-in (name, email, profile image URL) and never sees your Google password.",
              },
              {
                q: "Can a TA from another course see my marks?",
                a: "No. Staff access is scoped to the sections they run. The rules live in the database, so the restriction applies to every kind of request, not just the normal interface.",
              },
              {
                q: "Do the calculators send my data anywhere?",
                a: "No. Every public calculator computes in your browser. There is no upload, no logging of inputs, and no analytics on what you typed — the numbers never leave your device.",
              },
              {
                q: "What if I find a security issue?",
                a: "Report it through the contact page. Responsible reports are welcome, and fixing things quickly is one advantage of being a small project.",
              },
            ]}
          />
        </div>

        <div className="mt-12 max-w-3xl">
          <CtaCard />
        </div>

        <div className="mt-12">
          <RelatedLinks
            links={[
              {
                href: "/privacy-policy",
                label: "Privacy policy",
                description: "The full data story, in plain English.",
              },
              {
                href: "/features/leaderboard",
                label: "Privacy-conscious leaderboard",
                description: "Anonymity as a design rule, not an afterthought.",
              },
              {
                href: "/contact",
                label: "Contact",
                description: "Security reports and questions go here.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
