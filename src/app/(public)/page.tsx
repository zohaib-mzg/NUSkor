import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { SITE, TA_LOGIN_HREF } from "@/lib/site";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import JsonLd from "@/components/public/JsonLd";
import PortalButton from "@/components/public/PortalButton";
import AdSlot from "@/components/public/AdSlot";

export const metadata: Metadata = {
  title: { absolute: "nuSkor — Free CGPA Calculator & Student Tools" },
  description:
    "Free, independent student tools: CGPA and GPA calculators, final-grade and attendance planners, plus practical guides. Track your marks and evaluation slots on nuSkor.",
  alternates: { canonical: "/" },
};

const destinations = [
  {
    href: "/tools",
    icon: <Calculator className="h-5 w-5" />,
    title: "Free student tools",
    desc: "Nine calculators for CGPA, GPA, final grades, attendance and semester planning — all in your browser.",
  },
  {
    href: "/blog",
    icon: <BookOpen className="h-5 w-5" />,
    title: "Guides",
    desc: "Practical, university-neutral reads on grades, study habits, projects and university life.",
  },
  {
    href: "/features",
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "The portal",
    desc: "Your marksheet, class statistics, rankings and evaluation slots in one private place.",
  },
  {
    href: "/faq",
    icon: <HelpCircle className="h-5 w-5" />,
    title: "FAQ",
    desc: "Straight answers about accounts, privacy, advertising and how the calculations work.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webSiteSchema()} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
          style={{
            background:
              "radial-gradient(600px 220px at 50% -40px, rgba(245,197,24,0.22), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-5xl px-5 pb-14 pt-16 text-center sm:pt-24">
          <span className="badge bg-gold/15 text-gold-deep">
            Independent · Free tools · No account needed
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
            <PortalButton
              className="btn-primary w-full text-base sm:w-auto"
              signedOutLabel={
                <>
                  <GraduationCap className="h-4 w-4" /> Login as Student
                </>
              }
              signedInLabel={
                <>
                  <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                </>
              }
            />
            <Link
              href="/tools"
              className="btn-outline w-full text-base sm:w-auto"
            >
              Explore free tools <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-xs text-ink/40">{SITE.independence.short}</p>
        </div>
      </section>

      {/* Start here — links to the dedicated pages instead of repeating them */}
      <section
        className="mx-auto max-w-6xl px-5 pb-12"
        aria-labelledby="start-here"
      >
        <div className="mb-8 text-center">
          <h2
            id="start-here"
            className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            Start here
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink/55">
            Pick a page and go straight to what you need.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-ink group-hover:text-gold-deep">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/55">
                  {item.desc}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-gold-deep">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* The home page's single display ad */}
      <section className="mx-auto max-w-4xl px-5 pb-4" aria-label="Advertisement">
        <AdSlot variant="display" />
      </section>

      {/* Short explanation */}
      <section className="mx-auto max-w-4xl px-5 py-8">
        <div className="card p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            What is nuSkor?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/60 sm:text-base">
            nuSkor is an independent, student-built project. It is not affiliated
            with, endorsed by or connected to any university. The public
            calculators and guides are free, need no account, and keep your
            inputs in your browser.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/60 sm:text-base">
            When your instructors publish marks, the optional portal brings your
            marksheet, class statistics, rankings and evaluation slots together.
            Database-level rules mean students can only ever read their own data.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link href="/about" className="text-gold-deep hover:underline">
              About nuSkor
            </Link>
            <Link
              href="/how-it-works"
              className="text-gold-deep hover:underline"
            >
              How it works
            </Link>
            <Link href="/features" className="text-gold-deep hover:underline">
              See the features
            </Link>
          </div>
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
            Sign in with the Google account your university uses. Your role
            decides whether you land in the student or TA portal.
          </p>
          <div className="mx-auto mt-7 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
            <PortalButton
              className="btn-dark w-full sm:w-auto"
              signedOutLabel={
                <>
                  <GraduationCap className="h-4 w-4" /> Login as Student
                </>
              }
              signedInLabel={
                <>
                  <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                </>
              }
            />
            <Link href={TA_LOGIN_HREF} className="btn-primary w-full sm:w-auto">
              <Users className="h-4 w-4" /> Login as TA
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
