import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import Callout from "@/components/public/Callout";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import FAQ from "@/components/public/FAQ";
import RelatedLinks from "@/components/public/RelatedLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Study Resources — Methods That Match the Course",
  description:
    "Study strategies by course type: programming, mathematics and theory — plus time-boxing, active recall and spaced repetition explained for exam season.",
  alternates: { canonical: "/resources/study-resources" },
};

export default function StudyResourcesPage() {
  return (
    <>
      <PageHero
        title="Study resources"
        description="The uncomfortable truth: there is no single study method, only methods that fit the course. Here are the ones that fit each type."
        crumbs={[
          { name: "Resources", href: "/resources" },
          { name: "Study resources", href: "/resources/study-resources" },
        ]}
        meta={<>Last updated: October 2026 · {SITE.independence.short}</>}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <Prose>
            <p>
              Students rarely fail because they studied too little — they fail
              because they studied the wrong way for the subject in front of
              them. Re-reading notes works badly for programming, formula
              sheets work badly for theory papers, and neither works under time
              pressure if you have never tested yourself without them.
            </p>

            <h2>Programming courses: build, break, rebuild</h2>
            <p>
              Programming is a motor skill wearing a thinking hat. Reading
              solutions feels productive but teaches almost nothing; writing
              code that does not run, then fixing it, teaches everything. The
              method that works: attempt problems from a blank editor before
              looking at any solution, and keep a log of the bugs you hit and
              how you found them. Trace code by hand — predict output line by
              line, then run it and compare. The gap between your prediction and
              reality is your syllabus for the day.
            </p>

            <h2>Mathematics: derive, do not memorise</h2>
            <p>
              For maths-based courses, the study loop is unhurried and
              mechanical: work the derivation until you can reproduce it
              without notes, then solve problems past the point of comfort.
              Memorising steps collapses under exam pressure because exams ask
              you to apply, not recite. A useful trick is writing your formula
              sheet from memory and only then comparing it to the real one —
              the discrepancies are exactly what to study next.
            </p>

            <h2>Theory courses: explain, do not highlight</h2>
            <p>
              Theory rewards compression. The test of understanding is whether
              you can explain a concept to someone else in two minutes, without
              jargon hiding the gaps. Write one-paragraph summaries from memory,
              then check them against the source. Highlights make pages pretty;
              summaries make knowledge usable.
            </p>

            <Callout tone="formula" title="The two multipliers that work everywhere">
              <p>
                <code>Active recall: test yourself instead of re-reading</code>
              </p>
              <p>
                <code>
                  Spaced repetition: revisit at growing intervals, not once
                </code>
              </p>
            </Callout>

            <h2>Active recall, concretely</h2>
            <p>
              Instead of highlighting a chapter, close it and write everything
              you remember on a blank page. Then reopen it and mark what you
              missed. That is the entire technique, and it routinely beats
              hour-for-hour of re-reading, because retrieval practice strengthens
              memory in a way that recognition does not.
            </p>

            <AdSlot variant="in-article" />

            <h2>Spaced repetition without flashcards</h2>
            <p>
              Flashcards are one implementation; the principle is scheduling.
              Revisit each topic at expanding intervals — the day after
              learning it, a few days later, a week later, right before the
              exam. A simple three-column table (topic, last reviewed, next
              review) beats an elaborate app you will abandon by week three.
            </p>

            <h2>Time-boxing your week</h2>
            <ul>
              <li>
                <strong>Fixed blocks, not to-do lists.</strong> Put study
                blocks in your calendar like lectures. A to-do list grows; a
                calendar does not.
              </li>
              <li>
                <strong>45/15 over marathon sessions.</strong> Focused blocks
                with real breaks keep quality high. The exact split matters less
                than the rhythm.
              </li>
              <li>
                <strong>Hardest first, while fresh.</strong> Posterior
                probability of the calendar being honoured after 9 p.m. is
                low — spend daylight on the material that fights back.
              </li>
              <li>
                <strong>A weekly review block.</strong> Thirty minutes every
                week to check what is due, what is coming, and whether your
                attendance math needs the{" "}
                <a href="/tools/attendance-calculator">
                  attendance calculator
                </a>
                .
              </li>
            </ul>

            <h2>Where planning tools fit</h2>
            <p>
              Studying well presupposes knowing what is at stake: which
              assessment is worth what, and where your numbers sit. The{" "}
              <a href="/tools/course-total-calculator">course total
              calculator</a> shows your current standing from published marks,
              and the{" "}
              <a href="/tools/grade-calculator">final grade calculator</a>{" "}
              tells you what a target requires from here. Ten minutes of
              arithmetic, then back to the blank editor — your university&rsquo;s
              own outline and records always the final authority.
            </p>
          </Prose>
        </div>

        <div className="mt-12 max-w-3xl">
          <FAQ
            items={[
              {
                q: "How many hours per week is enough?",
                a: "There is no universal number — it depends on your course load and starting point. A practical anchor: treat each course's credit hours as its weekly study baseline, then adjust by how far your current marks sit from your target.",
              },
              {
                q: "Do study groups help?",
                a: "They help when the format is testing each other and explaining aloud — which is recall practice. They hurt when the format is complaining about deadlines. Choose the format deliberately.",
              },
              {
                q: "What if I am behind and cannot catch up everywhere?",
                a: "Prioritise by weightage and the size of the gap: high-weight assessments with realistic room for improvement first. The course total calculator makes the trade-offs visible instead of guessed.",
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
                href: "/resources/evaluation-prep-checklist",
                label: "Evaluation prep checklist",
                description: "For vivas and evaluation slots specifically.",
              },
              {
                href: "/tools",
                label: "All student tools",
                description: "Know the numbers your study time is moving.",
              },
              {
                href: "/glossary",
                label: "Glossary",
                description: "Sessional, rubric, weightage — all defined.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
