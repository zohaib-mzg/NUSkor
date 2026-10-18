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
  title: "Evaluation Slot Booking — No Double-Bookings, Ever",
  description:
    "nuSkor's evaluation booking turns slot chaos into a tap: open slots, one booking per student, double-booking impossible by database rule.",
  alternates: { canonical: "/features/evaluation-slots" },
};

export default function EvaluationSlotsFeaturePage() {
  return (
    <>
      <PageHero
        title="Evaluation slot booking"
        description="The part of the semester where group chats melt down — solved with a simple grid of slots and one database rule."
        crumbs={[
          { name: "Features", href: "/features" },
          { name: "Evaluation slots", href: "/features/evaluation-slots" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>The problem</h2>
              <p>
                Evaluations, vivas and demos all need the same scarce resource:
                ten minutes of a teaching assistant&rsquo;s time, multiplied by
                a whole class. The usual mechanism — a message thread where
                people claim times — produces collisions, silent double-bookings
                and an afternoon of manual reconciliation. Students refresh a
                chat instead of preparing for the evaluation.
              </p>

              <h2>How it works</h2>
              <p>
                Course staff define an evaluation period and open a set of time
                slots. Students see the grid and book an open slot with one
                tap. The critical part is what happens next: the booking is
                written to the database with a uniqueness rule — one student,
                one booking per evaluation; one slot, one booking, period. If
                two people tap the same slot within the same second, exactly
                one succeeds; the other politely gets an error and picks
                another. No race conditions, no &ldquo;I thought I had
                4 o&rsquo;clock&rdquo;.
              </p>

              <h2>What staff and students get</h2>
              <ul>
                <li>
                  <strong>Students:</strong> a live grid of slots with their
                  own booking visibly confirmed, and the ability to see the
                  date, time and location the course set for each slot.
                </li>
                <li>
                  <strong>Teaching assistants:</strong> a roster view of who
                  booked what, in order — ready for the evaluation session,
                  with no spreadsheet to rebuild.
                </li>
                <li>
                  <strong>The course:</strong> a full audit trail. Bookings are
                  tied to accounts, not to messages, so &ldquo;did I book?&rdquo;
                  has one authoritative answer.
                </li>
              </ul>

              <h2>The design decisions behind it</h2>
              <p>
                Two choices matter most. First, the uniqueness enforcement
                lives in the database, not in the interface — hiding a button
                is not a guarantee; a constraint is. Second, the flow is
                deliberately minimal: students do not need to exchange
                messages, confirmations or screenshots, because the system state
                itself is the confirmation. Anything the course needs to change
                — opening more slots, moving a session — happens on the
                staff side and is visible to everyone instantly.
              </p>
              <p>
                Rescheduling follows the course&rsquo;s own rules: how late
                bookings are allowed, whether cancellations reopen a slot, and
                what happens in exceptional cases are configured by the course
                staff, since they differ from course to course.
              </p>

              <AdSlot variant="display" />
            </Prose>
          </div>

          <SampleMockup title="Evaluation slots — Course Y">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { time: "10:00", state: "taken" },
                { time: "10:15", state: "open" },
                { time: "10:30", state: "mine" },
                { time: "10:45", state: "open" },
                { time: "11:00", state: "taken" },
                { time: "11:15", state: "open" },
                { time: "11:30", state: "taken" },
                { time: "11:45", state: "open" },
                { time: "12:00", state: "open" },
              ].map((slot) => (
                <div
                  key={slot.time}
                  className={
                    slot.state === "mine"
                      ? "rounded-lg border border-gold bg-gold-faint px-3 py-2.5 text-center"
                      : slot.state === "taken"
                        ? "rounded-lg border border-black/[0.06] bg-paper px-3 py-2.5 text-center opacity-50"
                        : "rounded-lg border border-black/10 bg-white px-3 py-2.5 text-center"
                  }
                >
                  <p className="text-sm font-bold text-ink">{slot.time}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                    {slot.state === "mine"
                      ? "Booked — you"
                      : slot.state === "taken"
                        ? "Taken"
                        : "Open"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-paper px-4 py-3 text-sm text-ink/70">
              Your booking: <strong className="text-ink">10:30</strong> —
              confirmed. One booking per student; slots lock the instant they
              are taken.
            </div>
          </SampleMockup>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Can I book two slots to be safe?",
                a: "No — one booking per student per evaluation period. That rule is what keeps the grid honest, and it is enforced by the database, not by trust.",
              },
              {
                q: "What happens if I need to change my slot?",
                a: "It depends on the rules the course staff set. Some courses allow cancelling and re-booking while slots remain; others lock bookings near the session. Ask your course staff — they control it.",
              },
              {
                q: "Is the booking official?",
                a: "It is the course's own scheduling record inside nuSkor. Whether it doubles as an official attendance document is up to your course and institution.",
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
                href: "/features/marksheet",
                label: "Live marksheet",
                description: "Where evaluation results end up, cleanly recorded.",
              },
              {
                href: "/for-students",
                label: "For students",
                description: "The full student-side picture of the portal.",
              },
              {
                href: "/tools/attendance-calculator",
                label: "Attendance Calculator",
                description: "Plan attendance against your course's requirement.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
