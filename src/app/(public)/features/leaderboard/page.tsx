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
  title: "Privacy-Conscious Leaderboard — Your Rank, Nobody Exposed",
  description:
    "nuSkor's leaderboard shows where you stand using anonymised entries and credit-weighted scores — competition without exposure.",
  alternates: { canonical: "/features/leaderboard" },
};

export default function LeaderboardFeaturePage() {
  return (
    <>
      <PageHero
        title="Privacy-conscious leaderboard"
        description="Knowing where you stand is useful. Knowing what everyone else scored is not. nuSkor ranks without exposing anyone."
        crumbs={[
          { name: "Features", href: "/features" },
          { name: "Leaderboard", href: "/features/leaderboard" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>The problem</h2>
              <p>
                Two failures haunt every leaderboard. The first is cruelty: a
                public wall of scores, sorted by performance, with names
                attached — turning marks into a spectator sport. The second is
                uselessness: no leaderboard at all, so students have no idea
                whether their 74% is strong, average or concerning in the
                context of their class.
              </p>

              <h2>How it works</h2>
              <p>
                nuSkor threads the needle. Rankings are computed from the
                <strong> weighted overall score</strong> — every published
                assessment, weighted as the course defined — and displayed
                around your own row. Your entry shows your position and score;
                the entries around you are anonymised, so you can read the shape
                of the class (&ldquo;the top ten cluster in the low
                90s&rdquo;) without reading a class list.
              </p>
              <p>
                Discovery is bounded, too: you see your neighbours in the
                ranking and aggregate statistics, not the full ordered list of
                everyone with scores attached. And your own row is the only one
                with your name on it. The leaderboard answers &ldquo;where do I
                stand?&rdquo; — not &ldquo;what did everyone else get?&rdquo;
              </p>

              <h2>The rules behind the ranking</h2>
              <ul>
                <li>
                  <strong>Only published marks count.</strong> An assessment
                  that has not been published contributes nothing — a pending
                  item is not a zero.
                </li>
                <li>
                  <strong>Weighting is the course&rsquo;s.</strong> If the
                  course says the final is 45% of the grade, the leaderboard
                  treats it that way. Ranks move when reality moves.
                </li>
                <li>
                  <strong>Anonymity is structural.</strong> Other students
                  cannot read your name through the leaderboard, because the
                  exposed rows do not carry identifying names.
                </li>
              </ul>

              <h2>Why bother with a leaderboard at all?</h2>
              <p>
                Because aiming blind is miserable. A fair ranking, read
                privately, gives students exactly the information they need to
                decide where their next hour goes — and removes the
                performance-anxiety theatre of public score walls. That balance
                is the point: see yourself clearly, see everyone else only in
                aggregate.
              </p>

              <AdSlot variant="display" />
            </Prose>
          </div>

          <SampleMockup title="Course Z — your neighbourhood">
            <div className="space-y-1.5">
              {[
                { rank: 1, label: "Student A", score: "91.2", you: false },
                { rank: 2, label: "Student B", score: "90.8", you: false },
                { rank: 3, label: "You", score: "90.1", you: true },
                { rank: 4, label: "Student C", score: "89.7", you: false },
                { rank: 5, label: "Student D", score: "89.1", you: false },
              ].map((row) => (
                <div
                  key={row.rank}
                  className={
                    row.you
                      ? "flex items-center justify-between rounded-lg border border-gold bg-gold-faint px-3.5 py-2.5"
                      : "flex items-center justify-between rounded-lg border border-black/[0.05] bg-paper px-3.5 py-2.5"
                  }
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-ink/45">
                      {row.rank}
                    </span>
                    <span
                      className={
                        row.you
                          ? "text-sm font-bold text-ink"
                          : "text-sm text-ink/60"
                      }
                    >
                      {row.label}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {row.score}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink/45">
              Other entries anonymised · scores are weighted overall
              percentages from published assessments only.
            </p>
          </SampleMockup>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Can other students see my name or score?",
                a: "No. Around your own row, other entries are anonymised — they carry a position and a score, not a name. Your name only ever appears on your own row, visible to you.",
              },
              {
                q: "How is the score computed?",
                a: "It is the weighted overall percentage: each published assessment contributes (marks earned ÷ marks total) × its weight. Pending assessments contribute nothing until published.",
              },
              {
                q: "What if I do not want my score included?",
                a: "Anonymous aggregate scores are part of how the course's ranking works inside nuSkor. If you have a specific concern, raise it with your course staff — they control how the course uses the portal.",
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
                href: "/features/security",
                label: "Security, enforced by the database",
                description: "How access rules actually work in plain language.",
              },
              {
                href: "/blog/why-leaderboards-should-be-anonymous",
                label: "Why leaderboards should be anonymous",
                description: "The thinking behind the design, in a blog post.",
              },
              {
                href: "/features/marksheet",
                label: "Live marksheet",
                description: "The numbers the ranking is computed from.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
