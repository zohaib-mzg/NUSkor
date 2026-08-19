"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Trophy,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Assessment,
  Mark,
  AssessmentStats,
  LeaderboardEntry,
} from "@/lib/types";
import { gradeFor, one, percent } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface CourseMarks {
  courseId: string;
  code: string;
  title: string;
  assessments: {
    id: string;
    title: string;
    type: string;
    total: number;
    obtained: number | null;
    stats: AssessmentStats | null;
    myPercent: number;
  }[];
  totalObtained: number;
  totalPossible: number;
  leaderboard: LeaderboardEntry[];
  myRank: LeaderboardEntry | null;
}

export default function MarksPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseMarks[]>([]);
  const [myRegNo, setMyRegNo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [studentRes, enrollRes, markRes, assRes] =
        await Promise.all([
          supabase
            .from("students")
            .select("registration_no")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("enrollments")
            .select("course_id, course:courses(code, title, id)"),
          supabase.from("marks").select("obtained, assessment_id").eq("student_id", user.id),
          supabase.from("assessments").select("id, course_id, title, type, total_marks"),
        ]);

      if (cancelled) return;

      const enrollments = (enrollRes.data ?? []) as {
        course_id: string;
        course: { code: string; title: string; id: string }[];
      }[];
      const marks = (markRes.data ?? []) as Mark[];
      const assessments = (assRes.data ?? []) as Assessment[];
      setMyRegNo((studentRes.data as { registration_no: string | null } | null)?.registration_no ?? null);

      const myMarksByAssessment = new Map(
        marks.map((m) => [m.assessment_id, Number(m.obtained)])
      );

      const perCourse = await Promise.all(
        enrollments.map(async (en) => {
          const course = one(en.course);
          if (!course) return null;
          const courseAssessments = assessments.filter(
            (a) => a.course_id === course.id
          );
          const rows = courseAssessments.map((a) => {
            const obtained = myMarksByAssessment.get(a.id) ?? null;
            return {
              id: a.id,
              title: a.title,
              type: a.type,
              total: Number(a.total_marks),
              obtained,
              stats: null as AssessmentStats | null,
              myPercent: obtained === null ? 0 : percent(obtained, Number(a.total_marks)),
            };
          });

          const [statsRes, leaderboardRes] = await Promise.all([
            supabase.rpc("get_assessment_stats_many", {
              p_assessment_ids: courseAssessments.map((a) => a.id),
            }),
            supabase.rpc("get_leaderboard", { p_course_id: course.id }),
          ]);

          if (cancelled) return;

          const statsById = new Map(
            ((statsRes.data ?? []) as (AssessmentStats & { assessment_id: string })[]).map(
              (s) => [s.assessment_id, s]
            )
          );
          rows.forEach((r) => (r.stats = statsById.get(r.id) ?? null));

          const leaderboard = (leaderboardRes.data ?? []) as LeaderboardEntry[];
          const myRank =
            leaderboard.find(
              (e) => e.registration_no === (studentRes.data as { registration_no: string | null } | null)?.registration_no
            ) ?? null;

          return {
            courseId: course.id,
            code: course.code,
            title: course.title,
            assessments: rows,
            totalObtained: rows.reduce((s, r) => s + (r.obtained ?? 0), 0),
            totalPossible: rows.reduce((s, r) => s + r.total, 0),
            leaderboard,
            myRank,
          };
        })
      );

      if (!cancelled) setCourses(perCourse.filter(Boolean) as CourseMarks[]);
    }

    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const total = courses.reduce((s, c) => s + c.totalObtained, 0);
    const possible = courses.reduce((s, c) => s + c.totalPossible, 0);
    return {
      total,
      possible,
      pct: possible ? percent(total, possible) : 0,
      assessments: courses.reduce((s, c) => s + c.assessments.length, 0),
      topRank: courses.reduce(
        (best, c) => (c.myRank ? Math.min(best, c.myRank.rank) : best),
        Infinity
      ),
    };
  }, [courses]);

  if (loading) return <Spinner label="Loading your marks..." />;

  return (
    <div>
      <PageHeader
        title="My Marks"
        subtitle="Full marksheet with class stats and your standing."
        icon={ClipboardList}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Overall"
          value={summary.possible ? `${summary.pct.toFixed(1)}%` : "N/A"}
          hint={
            summary.possible
              ? `${gradeFor(summary.total, summary.possible).grade} · ${summary.total} / ${summary.possible}`
              : "No marks yet"
          }
        />
        <StatCard
          icon={Target}
          label="Assessments"
          value={summary.assessments}
          hint="Across your courses"
          accent="dark"
        />
        <StatCard
          icon={Trophy}
          label="Best rank"
          value={summary.topRank === Infinity ? "N/A" : `#${summary.topRank}`}
          hint="Within a course leaderboard"
          accent="gold"
        />
        <StatCard
          icon={Users}
          label="Enrolled courses"
          value={courses.length}
          hint="With published assessments"
        />
      </div>

      {courses.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No courses yet"
            description="Once your TA enrolls you and publishes marks, they'll show up here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {courses.map((course) => (
            <CourseSection key={course.courseId} course={course} myRegNo={myRegNo} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseSection({ course, myRegNo }: { course: CourseMarks; myRegNo: string | null }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-4">
        <div>
          <h2 className="font-bold text-ink">
            {course.code} <span className="font-medium text-ink/45">·</span>{" "}
            <span className="font-medium text-ink/70">{course.title}</span>
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">
            {course.assessments.length} assessments ·{" "}
            {course.totalPossible > 0
              ? `${percent(course.totalObtained, course.totalPossible).toFixed(1)}% overall · Grade ${gradeFor(course.totalObtained, course.totalPossible).grade}`
              : "No marks published yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {course.myRank && (
            <Badge tone="gold">
              <Trophy className="h-3 w-3" /> Rank #{course.myRank.rank}
            </Badge>
          )}
          <button
            onClick={() => setShowLeaderboard((v) => !v)}
            className="btn-outline px-3 py-1.5 text-xs"
          >
            {showLeaderboard ? "Hide leaderboard" : "Leaderboard"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-paper">
            <tr>
              <th className="th">Assessment</th>
              <th className="th">Type</th>
              <th className="th text-right">Marks</th>
              <th className="th text-right">%</th>
              <th className="th text-right">Grade</th>
              <th className="th text-right">Class avg</th>
              <th className="th text-right">Min / Max</th>
            </tr>
          </thead>
          <tbody>
            {course.assessments.map((a) => (
              <tr key={a.id} className="bg-white">
                <td className="td font-semibold text-ink">{a.title}</td>
                <td className="td">
                  <Badge tone="neutral">{a.type}</Badge>
                </td>
                <td className="td text-right font-medium">
                  {a.obtained === null ? (
                    <span className="text-ink/35">Not published</span>
                  ) : (
                    <>
                      <span className="font-bold text-ink">{a.obtained}</span>
                      <span className="text-ink/40"> / {a.total}</span>
                    </>
                  )}
                </td>
                <td className="td text-right">
                  {a.obtained === null ? (
                    <span className="text-ink/35">N/A</span>
                  ) : (
                    <span className="font-semibold">{a.myPercent.toFixed(1)}%</span>
                  )}
                </td>
                <td className="td text-right">
                  {a.obtained === null ? (
                    <span className="text-ink/35">N/A</span>
                  ) : (
                    <span className="inline-flex h-7 w-9 items-center justify-center rounded-lg bg-gold/20 font-bold text-gold-deep">
                      {gradeFor(a.obtained, a.total).grade}
                    </span>
                  )}
                </td>
                <td className="td text-right text-ink/70">
                  {a.stats?.avg_marks != null
                    ? `${a.stats.avg_marks} / ${a.total}`
                    : "N/A"}
                </td>
                <td className="td text-right text-ink/70">
                  {a.stats?.min_marks != null
                    ? `${a.stats.min_marks} / ${a.stats.max_marks}`
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showLeaderboard && (
        <div className="border-t border-black/[0.06] bg-paper px-5 py-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <Trophy className="h-4 w-4 text-gold-deep" /> Leaderboard
            <span className="text-xs font-medium text-ink/45">
              (student IDs only: privacy protected)
            </span>
          </h3>
          {course.leaderboard.length === 0 ? (
            <EmptyState title="No marks on the board yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr>
                    <th className="th">Rank</th>
                    <th className="th">Student ID</th>
                    <th className="th text-right">Total</th>
                    <th className="th text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {course.leaderboard.map((e) => {
                    const isMe =
                      myRegNo && e.registration_no === myRegNo;
                    return (
                      <tr
                        key={e.registration_no ?? e.rank}
                        className={
                          isMe
                            ? "bg-gold/15"
                            : e.rank <= 3
                              ? "bg-white"
                              : "bg-white/60"
                        }
                      >
                        <td className="td">
                          {e.rank <= 3 ? (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
                              #{e.rank}
                            </span>
                          ) : (
                            <span className="font-semibold text-ink/60">#{e.rank}</span>
                          )}
                        </td>
                        <td className="td font-semibold text-ink">
                          {e.registration_no ?? "N/A"}
                          {isMe && <Badge tone="dark" className="ml-2">You</Badge>}
                        </td>
                        <td className="td text-right font-medium">{e.total}</td>
                        <td className="td text-right font-medium">{e.percent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}