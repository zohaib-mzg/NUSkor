"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ClipboardList,
  CalendarDays,
  Megaphone,
  ArrowRight,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPushSubscription, listDeviceSubscriptions } from "@/lib/push";
import type {
  Announcement,
  Booking,
  EvaluationPeriod,
} from "@/lib/types";
import { cn, cleanName, formatDate, one, weightedOverallPct } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [periods, setPeriods] = useState<(EvaluationPeriod & { booking: Booking | null })[]>([]);
  const [myMarks, setMyMarks] = useState<{ weighted: number | null }>({
    weighted: null,
  });
  const [enrollCount, setEnrollCount] = useState(0);
  const [name, setName] = useState("");
  const [pushOn, setPushOn] = useState(false);
  const [pushChecked, setPushChecked] = useState(false);
  const [latest, setLatest] = useState<{
    title: string;
    type: string;
    obtained: number;
    total: number;
    pct: number;
    sectionLabel: string;
  } | null>(null);
  const [recent, setRecent] = useState<
    {
      title: string;
      obtained: number;
      total: number;
      pct: number;
      sectionLabel: string;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      setName(cleanName(user.user_metadata?.full_name) || user.email?.split("@")[0] || "");

      const [annRes, enrollRes, perRes, markRes, bookingRes] =
        await Promise.all([
          supabase
            .from("announcements")
            .select("*")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("enrollments")
            .select("id")
            .eq("student_id", user.id),
          supabase
            .from("evaluation_periods")
            .select("*, section:course_sections(section_code, course:courses(code, title))")
            .eq("is_closed", false)
            .gt("ends_on", new Date().toISOString().slice(0, 10))
            .order("starts_on", { ascending: true })
            .limit(5),
          supabase
            .from("marks")
            .select("obtained, assessment_id, assessments(total_marks, weightage, status, title, type, release_date, created_at, section:course_sections(section_code, course:courses(code)))")
            .eq("student_id", user.id),
          supabase
            .from("bookings")
            .select("*, evaluation_slots(slot_date, start_time, end_time)")
            .eq("student_id", user.id),
        ]);

      if (cancelled) return;

      if (!annRes.error) setAnnouncements(annRes.data as Announcement[]);
      if (!enrollRes.error) setEnrollCount(enrollRes.data.length);

      const periodsRaw = (perRes.data ?? []) as EvaluationPeriod[];
      if (perRes.data) {
        const bookingByPeriod = new Map(
          ((bookingRes.data ?? []) as Booking[]).map((b) => [
            b.evaluation_period_id,
            b,
          ])
        );
        setPeriods(
          periodsRaw.map((p) => ({
            ...p,
            booking: bookingByPeriod.get(p.id) ?? null,
          }))
        );
      }

      const marks = (markRes.data ?? []) as {
        obtained: number;
        assessment_id: string;
        assessments:
          | {
              total_marks: number;
              weightage: number | null;
              status: string;
              title: string;
              type: string;
              release_date: string | null;
              created_at: string;
              section?: {
                section_code: string;
                course?: { code: string }[] | null;
              }[] | null;
            }[]
          | null;
      }[];
      // Weighted Overall % — same formula as My Marks & overall rank
      // (utils.weightedOverallPct / get_leaderboard SQL):
      // SUM over PUBLISHED assessments of (obtained / total) × weightage
      const publishedMarks = marks.filter(
        (m) => one(m.assessments)?.status === "published"
      );
      const weighted = weightedOverallPct(
        publishedMarks.map((m) => {
          const a = one(m.assessments)!;
          return {
            obtained: Number(m.obtained),
            total: Number(a.total_marks),
            weightage: Number(a.weightage ?? 0),
          };
        })
      );
      setMyMarks({
        weighted: publishedMarks.length > 0 ? weighted : null,
      });

      const today = new Date().toISOString().slice(0, 10);
      const scored = marks
        .map((m) => {
          const a = one(m.assessments);
          const sec = a ? one(a.section) : null;
          const released = !a?.release_date || a.release_date <= today;
          if (!a || !released) return null;
          const totalMarks = Number(a.total_marks);
          return {
            title: a.title,
            type: a.type,
            obtained: Number(m.obtained),
            total: totalMarks,
            pct: totalMarks > 0 ? (Number(m.obtained) / totalMarks) * 100 : 0,
            releasedAt: a.release_date ?? a.created_at,
            sectionLabel: sec
              ? `${one(sec.course)?.code ?? "Course"} Sec ${sec.section_code}`
              : "",
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
      setLatest(scored[0] ?? null);
      setRecent(scored.slice(0, 4));
    }
    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const sub = await getPushSubscription();
      const dev = await listDeviceSubscriptions();
      setPushOn(!!sub && dev.length > 0);
      setPushChecked(true);
    })();
  }, []);

  if (loading) return <Spinner label="Loading your dashboard..." />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${name.split(" ")[0] || "Student"}`}
        subtitle="Here's what's happening in your courses."
        icon={GraduationCap}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label={myMarks.weighted !== null ? "Overall Absolutes" : "Marks"}
          value={
            myMarks.weighted !== null
              ? myMarks.weighted.toFixed(1)
              : "N/A"
          }
          hint={
            myMarks.weighted !== null
              ? "Weighted across published assessments"
              : "No marks published yet"
          }
        />
        <StatCard
          icon={CalendarDays}
          label="Open evaluations"
          value={periods.length}
          hint="Ready to book your slot"
          accent="dark"
        />
        <StatCard
          icon={Megaphone}
          label="Latest announcements"
          value={announcements.length}
          hint="Newest first"
        />
      </div>

      {pushChecked && !pushOn && (
        <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 border-gold/40 bg-gold/[0.06] p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-ink">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-ink">Stay updated</h2>
              <p className="text-sm text-ink/55">
                Turn on browser notifications so you never miss announcements, marks or
                evaluation slots.
              </p>
            </div>
          </div>
          <Link href="/settings" className="btn-primary">
            Enable notifications <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 border-blue-500/30 bg-blue-500/[0.04] p-6">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-ink">Become a TA</h2>
            <p className="text-sm text-ink/55">
              Want to manage courses, invite students, and track marks? Apply to become a Teaching Assistant.
            </p>
          </div>
        </div>
        <Link href="/ta-apply" className="btn-primary">
          Apply now <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Latest + recent assessments */}
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink">Latest assessment</h2>
            <Link
              href="/marks"
              className="flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
            >
              View marks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!latest ? (
            <EmptyState
              title="No released assessments yet"
              description="When your TA publishes and releases marks, the latest one appears here."
            />
          ) : (
            <div className="rounded-xl border border-black/[0.07] bg-paper p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                {latest.sectionLabel}
              </p>
              <h3 className="mt-1 font-bold text-ink">{latest.title}</h3>
              <p className="mt-1 text-xs text-ink/50">
                <Badge tone="neutral">{latest.type}</Badge>
              </p>
              <p className="mt-3 text-2xl font-extrabold text-ink">
                {latest.obtained} <span className="text-ink/40">/ {latest.total}</span>
              </p>
              <p className="text-sm font-semibold text-gold-deep">
                {latest.pct.toFixed(1)}%
              </p>
            </div>
          )}

          {recent.length > 1 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink/40">
                Recent assessments
              </h3>
              <ul className="space-y-2">
                {recent.map((r) => (
                  <li
                    key={r.title + r.sectionLabel}
                    className="flex items-center justify-between rounded-lg border border-black/[0.05] bg-white px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-ink">{r.title}</span>
                    <span className="text-sm text-ink/70">
                      {r.obtained} / {r.total}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Announcements */}
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink">Announcements</h2>
            <Link
              href="/announcements"
              className="flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            <ul className="space-y-4">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-black/[0.05] pb-4 last:border-0 last:pb-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-deep">
                    {formatDate(a.created_at)}
                  </p>
                  <h3 className="mt-1 font-semibold text-ink">{a.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/55">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming evaluations */}
        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink">Evaluation scheduling</h2>
            <Link
              href="/evaluations"
              className="flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
            >
              Book a slot <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {periods.length === 0 ? (
            <EmptyState
              title="No open evaluation periods"
              description="When your TA opens an evaluation period, it will appear here."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {periods.map((p) => {
                const ongoing = p.starts_on <= today && p.ends_on >= today;
                const sec = one(p.section);
                return (
                  <li key={p.id} className="rounded-xl border border-black/[0.07] bg-paper p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                          {sec
                            ? `${sec.course?.code ?? "Course"} → ${sec.section_code}`
                            : "Course"}
                        </p>
                        <h3 className="font-semibold text-ink">{p.title}</h3>
                      </div>
                      <Badge tone={ongoing ? "gold" : "neutral"}>
                        {ongoing ? "Open now" : "Upcoming"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-ink/55">
                      {formatDate(p.starts_on)} to {formatDate(p.ends_on)}
                    </p>
                    <div className="mt-3">
                      {p.booking ? (
                        <Badge tone="green" className="w-full justify-center">
                          Booked ·{" "}
                          {p.booking.evaluation_slots
                            ? `${formatDate(p.booking.evaluation_slots.slot_date)}, ${p.booking.evaluation_slots.start_time}–${p.booking.evaluation_slots.end_time}`
                            : "see details"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="w-full justify-center">
                          No slot booked yet
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Courses summary */}
      <section className="card mt-6 p-6">
        <h2 className="font-bold text-ink">Your sections</h2>
        <p className="mt-1 text-sm text-ink/55">
          You are enrolled in <span className="font-semibold text-ink">{enrollCount}</span>{" "}
          {enrollCount === 1 ? "section" : "sections"}.
        </p>
        <div className={cn("mt-4 flex flex-wrap gap-2")}>
          <Link href="/marks" className="btn-outline">
            <ClipboardList className="h-4 w-4" /> View full marksheet
          </Link>
        </div>
      </section>
    </div>
  );
}