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
  title: "Course Announcements — One Feed, Zero Chaos",
  description:
    "Course announcements land in a single feed instead of five group chats — with acknowledgements, attachments and a clear history for every student.",
  alternates: { canonical: "/features/announcements" },
};

export default function AnnouncementsFeaturePage() {
  return (
    <>
      <PageHero
        title="Course announcements"
        description="One place for everything the course needs to tell everyone — and a clear record of what was said."
        crumbs={[
          { name: "Features", href: "/features" },
          { name: "Announcements", href: "/features/announcements" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Prose>
              <h2>The problem</h2>
              <p>
                Somewhere between the class group chat, the other class group
                chat, the email nobody checks, and the correction announced at
                the start of a lecture, information goes missing. &ldquo;The
                deadline moved&rdquo; travels faster than any system can track;
                &ldquo;the deadline moved again&rdquo; gets lost. Students
                shouldn&rsquo;t have to mine four channels to know what
                happened, and instructors shouldn&rsquo;t repeat themselves into
                the void.
              </p>

              <h2>How it works</h2>
              <p>
                Announcements in nuSkor live on the course itself. Teaching
                staff post an update — a deadline change, a room swap, a
                revision note — and every enrolled student sees it in a single
                feed, newest first. Because the feed is attached to the course
                rather than to a chat app, it does not care who checked their
                phone or who joined the thread late: the information has one
                canonical location.
              </p>
              <p>
                The feed keeps a natural history, so &ldquo;what did we
                actually get told?&rdquo; has an answer weeks later — no
                scrolling through hundreds of messages, no reconstruction from
                screenshots. Staff can correct a post when reality changes, and
                students see the current version rather than archaeology.
              </p>

              <h2>What this changes</h2>
              <ul>
                <li>
                  <strong>Deadlines stop being folklore.</strong> The change
                  and its details live in one place, visible to the whole
                  course at once.
                </li>
                <li>
                  <strong>Late joiners catch up instantly.</strong> New students
                  read the feed and are current — no one has to forward
                  anything.
                </li>
                <li>
                  <strong>Teaching staff say things once.</strong> One well-made
                  post replaces repeating an announcement in three rooms and two
                  chats.
                </li>
              </ul>

              <h2>How it fits the rest of the portal</h2>
              <p>
                Announcements share the same access model as everything else:
                tied to the course and its enrolled students, protected by the
                same database rules that guard marks and bookings. If a course
                runs entirely on nuSkor, a student&rsquo;s day becomes simple —
                marks on the{" "}
                <a href="/features/marksheet">marksheet</a>, slots on the{" "}
                <a href="/features/evaluation-slots">booking grid</a>, news in
                the announcements feed — instead of a scavenger hunt across
                apps.
              </p>

              <AdSlot variant="display" />
            </Prose>
          </div>

          <SampleMockup title="Announcements — Course X">
            <div className="space-y-3">
              {[
                {
                  title: "Quiz 2 moved to next week",
                  body: "The quiz originally scheduled for this week moves to the same slot next week. The syllabus covered is unchanged.",
                  meta: "Posted by course staff · pinned",
                  pinned: true,
                },
                {
                  title: "Evaluation bookings are open",
                  body: "Slot bookings for the mid-project evaluation close at the end of the week — book from the evaluations page.",
                  meta: "Posted by course staff",
                  pinned: false,
                },
                {
                  title: "Assignment 2 marks published",
                  body: "Marks are now on your marksheet. Recheck submissions with the course office if something looks off.",
                  meta: "Posted by course staff",
                  pinned: false,
                },
              ].map((post) => (
                <div
                  key={post.title}
                  className="rounded-xl border border-black/[0.06] bg-paper px-4 py-3"
                >
                  <p className="text-sm font-bold text-ink">{post.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/60">
                    {post.body}
                  </p>
                  <p className="mt-2 text-[11px] text-ink/40">{post.meta}</p>
                </div>
              ))}
            </div>
          </SampleMockup>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "Can students reply to announcements?",
                a: "The feed is one-directional by design — it is a noticeboard, not another chat. Questions belong in class, in evaluation sessions, or in email to the course staff, so answers reach everyone instead of one thread.",
              },
              {
                q: "Do I need to install anything?",
                a: "No. Announcements live on the web portal; opening the site with your account shows everything for courses you are enrolled in.",
              },
              {
                q: "Can an old announcement be edited?",
                a: "Course staff can correct posts when plans change, so you always see the current version. The feed's history remains legible instead of filling with 'correction to the previous correction' messages.",
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
                href: "/features/evaluation-slots",
                label: "Evaluation slot booking",
                description: "The other half of a calm evaluation season.",
              },
              {
                href: "/how-it-works",
                label: "How nuSkor works",
                description: "The whole flow, from marks entry to your dashboard.",
              },
              {
                href: "/for-tas",
                label: "For teaching assistants",
                description: "Run the course without spreadsheet chaos.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
