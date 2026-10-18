import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Evaluation Prep Checklist — Before Your Viva or Demo",
  description:
    "A realistic checklist for evaluation slots and vivas: what to prepare a week out, the day before, and in the room — plus the questions TAs actually ask.",
  alternates: { canonical: "/resources/evaluation-prep-checklist" },
};

export default function EvaluationPrepChecklistPage() {
  return (
    <>
      <PageHero
        title="Evaluation prep checklist"
        description="Ten minutes of evaluation usually represents weeks of work. Here is how to make those ten minutes go well."
        crumbs={[
          { name: "Resources", href: "/resources" },
          {
            name: "Evaluation prep checklist",
            href: "/resources/evaluation-prep-checklist",
          },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              An evaluation — viva, demo, or one-on-one marking session — is a
              strange performance: your work is already finished, and now it
              gets interrogated. Most disappointing evaluations are not caused
              by weak work. They are caused by a demo that would not run, an
              explanation that wandered, or a question nobody expected. All
              three are preventable in advance.
            </p>

            <h2>A week before</h2>
            <ul>
              <li>
                <strong>Read the evaluation brief properly.</strong> What is
                being assessed — the artifact, the explanation, or both? The
                rubric (if published) is the syllabus of your preparation.
              </li>
              <li>
                <strong>Run the project from a clean state.</strong> Fresh
                checkout, on a different machine if possible. Every hard-coded
                path and missing dependency reveals itself now instead of in
                the room.
              </li>
              <li>
                <strong>Prepare a 60-second summary.</strong> What it does, how
                it is built, what you would improve. Practise it out loud —
                twice.
              </li>
              <li>
                <strong>List your decisions and their reasons.</strong> The
                most common viva question is &ldquo;why did you do it this
                way?&rdquo; — have honest answers ready, including the weakest
                one.
              </li>
              <li>
                <strong>Book your slot.</strong> If the course uses nuSkor,
                slots come from the{" "}
                <a href="/features/evaluation-slots">booking grid</a> — first
                pick, no double-booking. Book before the good times are gone.
              </li>
            </ul>

            <h2>The day before</h2>
            <ul>
              <li>
                <strong>Touch nothing risky.</strong> No refactors, no
                last-minute features. Freeze the version you will present.
              </li>
              <li>
                <strong>Package the demo.</strong> Dependencies installed,
                sample data ready, README with run instructions — assume a
                grader will run it without you.
              </li>
              <li>
                <strong>Prepare a fallback.</strong> A screen recording or a
                set of screenshots means a broken environment costs you minutes
                instead of the evaluation.
              </li>
              <li>
                <strong>Sleep.</strong> This is on the checklist because it is
                on the exam, and its effect on explanation quality is enormous.
              </li>
            </ul>

            <AdSlot variant="in-article" />

            <h2>In the room</h2>
            <ul>
              <li>
                <strong>State the summary first.</strong> Orientation before
                detail: one minute of &ldquo;what this is&rdquo; makes every
                later question land better.
              </li>
              <li>
                <strong>Drive the demo deliberately.</strong> Follow a path you
                rehearsed; narrate what you are doing and why. Silence while
                typing reads as confusion even when it is focus.
              </li>
              <li>
                <strong>Answer the question that was asked.</strong> Short
                answer first, then justification if invited. Rambling is read
                as not knowing.
              </li>
              <li>
                <strong>It is fine to say &ldquo;I don&rsquo;t know&rdquo;
                — followed by method.</strong> &ldquo;I don&rsquo;t know, but
                I would find out by X&rdquo; scores better than a confident
                guess, every time.
              </li>
            </ul>

            <h2>Questions worth rehearsing</h2>
            <ul>
              <li>Walk me through the overall design in one minute.</li>
              <li>Which part was hardest, and how did you solve it?</li>
              <li>What breaks if input X is missing or hostile?</li>
              <li>What would you change with one more week?</li>
              <li>Which of these code lines are you least happy with?</li>
            </ul>

            <h2>After</h2>
            <p>
              Write down what got asked while it is fresh — patterns repeat
              across evaluations, and your notes become next semester&rsquo;s
              preparation. If something went wrong (a demo that misbehaved, a
              question you could not parse), mention it politely to the
              evaluator: a calm follow-up often lands fine, and the portal-side
              record stays accurate through course staff. Then close the
              laptop. You prepared; that is the part you controlled.
            </p>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "What if my project does not run in the evaluation room?",
                a: "That is exactly what the fallback recording or screenshots are for. Present from the fallback, explain the environment issue briefly, and move to the substance — evaluators care about your understanding far more than the room's Wi-Fi.",
              },
              {
                q: "How much should I let the evaluator talk?",
                a: "Interruptions are usually steering, not criticism: the evaluator is directing you toward what they want to assess. Follow the direction honestly, and do not steamroll back to your script.",
              },
              {
                q: "Does a bad evaluation ruin my course grade?",
                a: "One assessment rarely determines a course — check its weightage on your course outline, and use the course total calculator to see the actual effect on your running total before catastrophising.",
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
                description: "How slots work inside nuSkor — no double-bookings.",
              },
              {
                href: "/resources/study-resources",
                label: "Study resources",
                description: "Methods that fit the course type.",
              },
              {
                href: "/tools/course-total-calculator",
                label: "Course Total Calculator",
                description: "See what an evaluation moves in your total.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
