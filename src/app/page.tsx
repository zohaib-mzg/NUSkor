import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  Star,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Your marksheet, the moment it's published",
    desc: "Detailed marks per assessment with grades, class averages, min/max, your rank and a privacy-conscious leaderboard.",
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Evaluation slots, zero spreadsheet chaos",
    desc: "Pick a time slot for evaluations. Booking the same slot twice is impossible, guaranteed at the database level.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Enforced authorization, not just hidden buttons",
    desc: "Every read and write is guarded by Supabase Row-Level Security. Students can only ever touch their own data.",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "No more chasing the TA",
    desc: "Announcements reach every student in one place. Marks imports from CSV save hours of spreadsheet work.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-gold">
              <Image src="/logo.png" alt="NUSkor logo" fill sizes="36px" className="object-cover" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-ink">
              NUS<span className="text-gold-deep">kor</span>
            </span>
          </div>
          <Link href="/login" className="btn-outline hidden sm:inline-flex">
            Student / Admin Login
          </Link>
        </div>
      </header>

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
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-full shadow-lift ring-4 ring-gold/40">
              <Image src="/logo.png" alt="NUSkor logo" fill sizes="96px" className="object-cover" />
            </div>
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Marks, evaluations and bookings,{" "}
            <span className="text-gold-deep">no more spreadsheets.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            NUSkor is the evaluation &amp; marks portal for FAST-NUCES Lahore.
            Students see their marks and book evaluation slots; TAs run everything
            from one clean dashboard.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink/40">
            Empowering Students. Elevating Futures.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Student / TA Sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-ink">
          Built for <span className="text-gold-deep">1 TA</span> and{" "}
          <span className="text-gold-deep">400+ students</span>
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="card flex gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-ink">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/55">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="card grid gap-8 p-8 sm:grid-cols-3">
          {[
            {
              icon: <GraduationCap className="h-5 w-5" />,
              step: "01",
              title: "Sign in with your FAST email",
              desc: "Choose your side: sign in as a student or as the TA. Your role decides which portal you land in.",
            },
            {
              icon: <TrendingUp className="h-5 w-5" />,
              step: "02",
              title: "Track marks & rankings",
              desc: "Full marksheet with grades, class stats, your rank and a leaderboard.",
            },
            {
              icon: <CalendarDays className="h-5 w-5" />,
              step: "03",
              title: "Book your evaluation slot",
              desc: "Pick any open slot at a tap. One booking per evaluation period, guaranteed.",
            },
          ].map((s) => (
            <div key={s.step} className="relative">
              <span className="text-4xl font-extrabold text-gold/60">{s.step}</span>
              <div className="mt-3 flex items-center gap-2 text-gold-deep">{s.icon}</div>
              <h3 className="mt-2 font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-8 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5">
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-gold">
            <Image src="/logo.png" alt="NUSkor logo" fill sizes="40px" className="object-cover" />
          </div>
          <p className="text-sm font-bold text-ink">
            NUS<span className="text-gold-deep">kor</span>
          </p>
          <p className="text-xs text-ink/45">
            Empowering Students. Elevating Futures. · FAST-NUCES Lahore
          </p>
          <Link href="/login" className="mt-2 text-sm font-semibold text-gold-deep hover:underline">
            Sign in to your portal →
          </Link>
        </div>
      </footer>
    </div>
  );
}