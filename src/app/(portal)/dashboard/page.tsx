"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ClipboardList,
  CalendarDays,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Announcement,
  Booking,
  EvaluationPeriod,
} from "@/lib/types";
import { cn, formatDate, formatTime, gradeFor, one, percent } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [periods, setPeriods] = useState<(EvaluationPeriod & { booking: Booking | null })[]>([]);
  const [myMarks, setMyMarks] = useState<{ total: number; possible: number }>({
    total: 0,
    possible: 0,
  });
  const [enrollCount, setEnrollCount] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      setName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");

      const [annRes, enrollRes, perRes, markRes, bookingRes] = await Promise.all([
        supabase
          .from("announcements")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", user.id),
        supabase
          .from("evaluation_periods")
          .select("*, course:courses(code, title)")
          .eq("is_closed", false)
          .gt("ends_on", new Date().toISOString().slice(0, 10))
          .order("starts_on", { ascending: true })
          .limit(5),
        supabase
          .from("marks")
          .select("obtained, assessment_id, assessments(total_marks)")
          .eq("student_id", user.id),
        supabase
          .from("bookings")
          .select("*, evaluation_slots(slot_date, slot_time)")
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
        assessments: { total_marks: number }[] | null;
      }[];
      const total = marks.reduce((s, m) => s + Number(m.obtained), 0);
      const possible = marks.reduce(
        (s, m) => s + Number(one(m.assessments)?.total_marks ?? 0),
        0
      );
      setMyMarks({ total, possible });
    }
    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading your dashboard..." />;

  const overall = percent(myMarks.total, myMarks.possible);
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
          label={myMarks.possible > 0 ? "Overall performance" : "Marks"
          }
          value={myMarks.possible > 0 ? `${overall.toFixed(1)}%` : "N/A"}
          hint={
            myMarks.possible > 0
              ? `${gradeFor(myMarks.total, myMarks.possible).grade} · ${myMarks.total} / ${myMarks.possible}`
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

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
                return (
                  <li key={p.id} className="rounded-xl border border-black/[0.07] bg-paper p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                          {p.course?.code ?? "Course"}
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
                            ? `${formatDate(p.booking.evaluation_slots.slot_date)}, ${formatTime(p.booking.evaluation_slots.slot_time)}`
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
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/45">
            <Badge tone="gold">Tip</Badge>
            One booking per evaluation period is enforced by the database.
            No student can book twice, ever.
          </div>
        </section>
      </div>

      {/* Courses summary */}
      <section className="card mt-6 p-6">
        <h2 className="font-bold text-ink">Your courses</h2>
        <p className="mt-1 text-sm text-ink/55">
          You are enrolled in <span className="font-semibold text-ink">{enrollCount}</span>{" "}
          {enrollCount === 1 ? "course" : "courses"}.
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