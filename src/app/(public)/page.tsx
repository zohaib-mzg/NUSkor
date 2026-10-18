import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { SITE, STUDENT_PORTAL_HREF, TA_LOGIN_HREF } from "@/lib/site";
import ToolGrid from "@/components/public/ToolGrid";

export const metadata: Metadata = {
  title: { absolute: "nuSkor — Free CGPA Calculator & Student Tools" },
  description:
    "Free, independent student tools: CGPA and GPA calculators, final-grade and attendance planners, plus practical guides. Track your marks and evaluation slots on nuSkor.",
  alternates: { canonical: "/" },
};

const features = [
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Your marksheet, the moment it's published",
    desc: "Marks your instructor enters appear in a clean marksheet with class averages, min/max, your rank and a privacy-conscious leaderboard.",
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Evaluation slots without the spreadsheet chaos",
    desc: "Pick an open time slot at a tap. Booking the same slot twice is impossible — enforced by the database, not by hoping.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Privacy enforced by the database",
    desc: "Row-Level Security means students can only ever read their own data. Not hidden buttons — real database rules.",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Announcements in one place",
    desc: "No more chasing group chats. Course announcements reach every student in a single feed.",
  },
];

const steps = [
  {
    icon: <GraduationCap className="h-5 w-5" />,
    step: "01",
    title: "Sign in with Google",
    desc: "Use the Google account you use at your university. Your role decides which portal you land in — student or TA.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    step: "02",
    title: "Track marks & rankings",
    desc: "A full marksheet with class statistics, your rank and an anonymized leaderboard.",
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    step: "03",
    title: "Book your evaluation slot",
    desc: "Pick any open slot at a tap. One booking per evaluation period, guaranteed.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
          style={{
            background:
              "radial-gradient(600px 220px at 50% -40px, rgba(245,197,24,0.22), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-16 text-center sm:pt-24">
          <span className="badge bg-gold/15 text-gold-deep">
            Free · no account needed for tools
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Calculate your CGPA, understand your grades,{" "}
            <span className="text-gold-deep">and track your marks.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            Free, independent, built by students. Every calculator runs entirely
            in your browser — and when you want your real numbers, nuSkor keeps
            your marks, rankings and evaluation slots in one place.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/tools/cgpa-calculator"
              className="btn-primary w-full text-base sm:w-auto"
            >
              Try the CGPA Calculator
            </Link>
            <Link
              href={STUDENT_PORTAL_HREF}
              className="btn-outline w-full text-base sm:w-auto"
            >
              Student Portal →
            </Link>
          </div>
          <p className="mt-5 text-xs text-ink/40">{SITE.independence.short}</p>
        </div>
      </section>

      {/* Tools */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Popular student tools
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink/55">
            Plan your semester with calculators that respect your privacy —
            nothing you type is sent to a server.
          </p>
        </div>
        <ToolGrid />
        <p className="mt-6 text-center">
          <Link
            href="/tools"
            className="text-sm font-semibold text-gold-deep hover:underline"
          >
            Browse all tools →
          </Link>
        </p>
      </section>

      {/* What is nuSkor */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          What is nuSkor?
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="card flex gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-ink">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/55">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/features"
            className="font-semibold text-gold-deep hover:underline"
          >
            See every feature →
          </Link>
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          How the portal works
        </h2>
        <div className="card grid gap-8 p-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="relative">
              <span className="text-4xl font-extrabold text-gold/60">
                {s.step}
              </span>
              <div className="mt-3 flex items-center gap-2 text-gold-deep">
                {s.icon}
              </div>
              <h3 className="mt-2 font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
            style={{
              background:
                "radial-gradient(400px 140px at 50% -30px, rgba(245,197,24,0.25), transparent 70%)",
            }}
          />
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Ready to see your real numbers?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink/55">
            nuSkor tracks the marks your instructors enter, shows class
            statistics and a privacy-conscious rank — and handles evaluation
            slot bookings end to end.
          </p>
          <div className="mx-auto mt-7 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={STUDENT_PORTAL_HREF}
              className="btn-dark w-full sm:w-auto"
            >
              <GraduationCap className="h-4 w-4" /> Sign in as Student
            </Link>
            <Link href={TA_LOGIN_HREF} className="btn-primary w-full sm:w-auto">
              <Users className="h-4 w-4" /> Login as TA
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
