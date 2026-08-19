"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  FolderKanban,
  Star,
  CalendarClock,
  Megaphone,
  ArrowUpRight,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { formatDate, one } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

type RecentBooking = {
  id: string;
  status: string;
  created_at: string;
  evaluation_periods: {
    title: string;
    section: { section_code: string; course: { code: string } };
  } | null;
  students: { profiles: { full_name: string; email: string } } | null;
};
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    assessments: 0,
    marks: 0,
    openPeriods: 0,
    bookingsToday: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [students, courses, assessments, marks, periods, bookings, announcements] =
        await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_archived", false),
          supabase.from("assessments").select("id", { count: "exact", head: true }),
          supabase.from("marks").select("id", { count: "exact", head: true }),
          supabase
            .from("evaluation_periods")
            .select("id", { count: "exact", head: true })
            .eq("is_closed", false),
          supabase
            .from("bookings")
            .select(
              "id, status, created_at, evaluation_periods(title, section:course_sections(section_code, course:courses(code))), students(profiles(full_name, email))",
              { count: "exact", head: true }
            )
            .gte("created_at", new Date().toISOString().slice(0, 10)),
          supabase
            .from("bookings")
            .select(
              "*, evaluation_periods(title, section:course_sections(section_code, course:courses(code))), students(profiles(full_name, email))"
            )
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

      if (cancelled) return;
      setStats({
        students: students.count ?? 0,
        courses: courses.count ?? 0,
        assessments: assessments.count ?? 0,
        marks: marks.count ?? 0,
        openPeriods: periods.count ?? 0,
        bookingsToday: bookings.count ?? 0,
      });
      setRecentBookings((bookings.data ?? []) as unknown as RecentBooking[]);
      if (!announcements.error) setRecentAnnouncements(announcements.data ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading admin dashboard..." />;

  const quickLinks = [
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/assessments", label: "Assessments", icon: FolderKanban },
    { href: "/admin/marks", label: "Marks", icon: Star },
    { href: "/admin/evaluations", label: "Evaluation periods", icon: CalendarClock },
    { href: "/admin/analytics", label: "Analytics", icon: ClipboardList },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Everything you manage, at a glance."
        icon={ShieldCheck}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Students" value={stats.students} accent="gold" />
        <StatCard icon={BookOpen} label="Active courses" value={stats.courses} />
        <StatCard icon={FolderKanban} label="Assessments" value={stats.assessments} />
        <StatCard icon={Star} label="Marks entered" value={stats.marks} accent="dark" />
        <StatCard icon={CalendarClock} label="Open periods" value={stats.openPeriods} accent="gold" />
        <StatCard icon={ArrowUpRight} label="Bookings today" value={stats.bookingsToday} accent="green" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold text-ink">Recent bookings</h2>
          {recentBookings.length === 0 ? (
            <EmptyState title="No bookings yet" description="When students book slots they show up here." />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {recentBookings.map((b: RecentBooking) => {
                const profile = one(b.students?.profiles);
                const period = one(b.evaluation_periods);
                return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-deep">
                    {(profile?.full_name ?? profile?.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {profile?.full_name ?? profile?.email ?? "Student"}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {period?.title ?? "Evaluation"} ·{" "}
                      {period?.section?.course?.code ?? ""} —{" "}
                      {period?.section?.section_code ?? ""}
                    </p>
                  </div>
                  <Badge tone={b.status === "confirmed" ? "green" : b.status === "pending" ? "gold" : "red"}>
                    {b.status}
                  </Badge>
                  <span className="text-xs text-ink/40">{formatDate(b.created_at)}</span>
                </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-bold text-ink">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex flex-col items-start gap-2 rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-gold hover:shadow-lift"
              >
                <q.icon className="h-5 w-5 text-gold-deep" />
                <span className="text-sm font-semibold text-ink group-hover:text-black">
                  {q.label}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-gold/10 p-3">
            <p className="text-xs font-semibold text-gold-deep">Bulk marks upload</p>
            <p className="mt-1 text-xs leading-relaxed text-ink/55">
              CSV import with a full report before anything is written. Go to{" "}
              <Link href="/admin/marks" className="font-semibold text-gold-deep hover:underline">
                Marks →
              </Link>
            </p>
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
          <Megaphone className="h-4 w-4 text-gold-deep" /> Latest announcements
        </h2>
        {recentAnnouncements.length === 0 ? (
          <EmptyState title="Nothing published yet" description="Create one in Announcements." />
        ) : (
          <ul className="space-y-2">
            {recentAnnouncements.map((a: Announcement) => (
              <li key={a.id} className="rounded-lg border border-black/[0.05] bg-paper px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <Badge tone={a.status === "published" ? "green" : "neutral"}>
                    {a.status === "published" ? "Published" : a.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-ink/55">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}