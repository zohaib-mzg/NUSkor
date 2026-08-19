"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { BarChart3, TrendingUp, Users, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Assessment, Course } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [assessmentBars, setAssessmentBars] = useState<
    { name: string; avg: number; max: number; normalized: number }[]
  >([]);
  const [gradeDist, setGradeDist] = useState<{ name: string; count: number }[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [focusAssessment, setFocusAssessment] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("courses")
        .select("*")
        .eq("is_archived", false)
        .order("code");
      if (!cancelled) {
        if (!err) setCourses((data ?? []) as Course[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function analyze(courseId: string) {
    if (!courseId) return;
    setLoading(true);
    const supabase = createClient();
    const [assRes, markRes, enRes, allMarksRes] = await Promise.all([
      supabase
        .from("assessments")
        .select("*")
        .eq("course_id", courseId),
      supabase
        .from("marks")
        .select("obtained, assessment_id, assessments(total_marks, title, course_id)")
        .order("created_at"),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      supabase.from("marks").select("obtained"),
    ]);

    const assessments = (assRes.data ?? []) as Assessment[];
    if (!assessments.length) {
      setAssessmentBars([]);
      setGradeDist([]);
      setSummary({});
      setAssessments([]);
      setFocusAssessment("");
      setLoading(false);
      return;
    }

    const enrolled = enRes.count ?? 0;
    const marksOfCourse = (markRes.data ?? []) as {
      obtained: number;
      assessment_id: string;
      assessments: {
        total_marks: number;
        title: string;
        course_id: string;
      }[] | null;
    }[];
    const byAss = new Map<string, { sum: number; max: number; n: number }>();

    marksOfCourse.forEach((m) => {
      if (m.assessments?.[0]?.course_id !== courseId) return;
      const rec = byAss.get(m.assessment_id) ?? { sum: 0, max: 0, n: 0 };
      rec.sum += Number(m.obtained);
      rec.n += 1;
      rec.max = Math.max(rec.max, Number(m.assessments?.[0]?.total_marks ?? m.obtained));
      byAss.set(m.assessment_id, rec);
    });

    const bars = assessments.map((a) => {
      const rec = byAss.get(a.id);
      const avg = rec ? rec.sum / rec.n : 0;
      return {
        name: a.title.length > 18 ? a.title.slice(0, 18) + "…" : a.title,
        avg: Number(avg.toFixed(1)),
        max: Number(a.total_marks),
        normalized: rec && a.total_marks > 0 ? Number(((rec.sum / rec.n / a.total_marks) * 100).toFixed(1)) : 0,
      };
    });

    // Grade distribution for first assessment
    const firstAss = assessments[0];
    const grades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];
    const buckets = new Map(grades.map((g) => [g, 0]));
    const firstMarks = marksOfCourse.filter((m) => m.assessment_id === firstAss.id);
    firstMarks.forEach((m) => {
      const pct = (Number(m.obtained) / Number(m.assessments?.[0]?.total_marks || 1)) * 100;
      buckets.set(gradeFor(pct), (buckets.get(gradeFor(pct)) ?? 0) + 1);
    });
    const dist = [...buckets.entries()]
      .map(([name, count]) => ({ name, count }))
      .filter((d) => d.count > 0)
      .sort((a, b) => grades.indexOf(a.name) - grades.indexOf(b.name));

    const totalMarks = (allMarksRes.data ?? []) as { obtained: number }[];
    const sumAll = totalMarks.reduce((s, m) => s + Number(m.obtained), 0);
    const avgAll = totalMarks.length ? sumAll / totalMarks.length : 0;

    setAssessments(assessments);
    setFocusAssessment(firstAss.id);
    setGradeDist(dist);
    setAssessmentBars(bars);
    setSummary({
      assessments: assessments.length,
      enrolled,
      avgOverall: Number(avgAll.toFixed(1)),
      gradesGiven: totalMarks.length,
    });
    setLoading(false);
  }

  function gradeFor(pct: number) {
    if (pct >= 90) return "A+";
    if (pct >= 85) return "A";
    if (pct >= 80) return "A-";
    if (pct >= 75) return "B+";
    if (pct >= 70) return "B";
    if (pct >= 65) return "B-";
    if (pct >= 60) return "C+";
    if (pct >= 55) return "C";
    if (pct >= 50) return "C-";
    if (pct >= 45) return "D+";
    if (pct >= 40) return "D";
    return "F";
  }

  const gradeColors: Record<string, string> = {
    "A+": "#F5C518",
    A: "#F5C518",
    "A-": "#E8C32A",
    "B+": "#D8C02B",
    B: "#C4B82F",
    "B-": "#B0B033",
    "C+": "#9CA83A",
    C: "#889F42",
    "C-": "#74964A",
    "D+": "#A0762F",
    D: "#C55A2B",
    F: "#E04028",
  };

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Class performance at a glance — computed live from the database."
        icon={BarChart3}
      />

      <div className="card mb-6 p-5">
        <label className="label">Course</label>
        <select
          className="input sm:max-w-md"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            analyze(e.target.value);
          }}
        >
          <option value="">Select a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title}
            </option>
          ))}
        </select>
      </div>

      {!courseId ? (
        <div className="card">
          <EmptyState
            title="Pick a course to see analytics"
            description="Charts show assessment averages, grade distribution and overall class health."
          />
        </div>
      ) : loading ? (
        <Spinner label="Crunching the numbers..." />
      ) : !assessmentBars.length ? (
        <div className="card">
          <EmptyState
            title="No data yet"
            description="Add assessments and marks for this course to see analytics."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Percent} label="Avg mark" value={summary.avgOverall ?? 0} accent="gold" />
            <StatCard icon={TrendingUp} label="Marks entered" value={summary.gradesGiven ?? 0} />
            <StatCard icon={BarChart3} label="Assessments" value={summary.assessments ?? 0} accent="dark" />
            <StatCard icon={Users} label="Enrolled" value={summary.enrolled ?? 0} />
          </div>

          <div className="card mt-6 p-6">
            <h2 className="mb-4 font-bold text-ink">Assessment averages (as % of total)</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assessmentBars} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e2d8" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Class average"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
                  />
                  <Bar dataKey="normalized" fill="#F5C518" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-ink">Grade distribution</h2>
                <select
                  className="input max-w-[220px] py-1.5 text-xs"
                  value={focusAssessment}
                  onChange={(e) => {
                    setFocusAssessment(e.target.value);
                    const supabase = createClient();
                    supabase
                      .from("marks")
                      .select("obtained, assessments(total_marks)")
                      .eq("assessment_id", e.target.value)
                      .then(({ data }) => {
                        const grades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];
                        const buckets = new Map(grades.map((g) => [g, 0]));
                        (data ?? []).forEach((m: {
                          obtained: number;
                          assessments: { total_marks: number }[] | null;
                        }) => {
                          const pct = (Number(m.obtained) / Number(m.assessments?.[0]?.total_marks || 1)) * 100;
                          buckets.set(gradeFor(pct), (buckets.get(gradeFor(pct)) ?? 0) + 1);
                        });
                        setGradeDist(
                          [...buckets.entries()]
                            .map(([name, count]) => ({ name, count }))
                            .filter((d) => d.count > 0)
                            .sort((a, b) => grades.indexOf(a.name) - grades.indexOf(b.name))
                        );
                      });
                  }}
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
              {gradeDist.length === 0 ? (
                <EmptyState title="No marks for this assessment" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDist} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e2d8" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: "rgba(245,197,24,0.08)" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {gradeDist.map((entry) => (
                          <Cell key={entry.name} fill={gradeColors[entry.name] ?? "#888"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="card p-6">
              <h2 className="mb-4 font-bold text-ink">Health of the class</h2>
              <div className="space-y-4">
                {assessmentBars.map((b) => {
                  const level =
                    b.normalized >= 75
                      ? { label: "Strong", tone: "green" as const }
                      : b.normalized >= 50
                        ? { label: "OK", tone: "gold" as const }
                        : { label: "Needs attention", tone: "red" as const };
                  return (
                    <div key={b.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink">{b.name}</span>
                        <span className="flex items-center gap-2">
                          <Badge tone={level.tone}>{level.label}</Badge>
                          <span className="text-ink/50">{b.normalized}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full bg-gold transition-all"
                          style={{ width: `${Math.min(100, b.normalized)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 rounded-xl bg-gold/10 p-4 text-xs leading-relaxed text-ink/60">
                <p className="font-semibold text-gold-deep">How to read this</p>
                Averages are normalized as a percentage of each assessment&apos;s
                total marks so quizzes and midterms can be compared fairly.
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}