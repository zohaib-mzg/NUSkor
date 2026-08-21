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
import { formatRegNo, gradeFor, one, percent } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface SectionMarks {
  sectionId: string;
  code: string;
  title: string;
  sectionCode: string;
  assessments: {
    id: string;
    title: string;
    type: string;
    total: number;
    weightage: number;
    obtained: number | null;
    stats: AssessmentStats | null;
    myPercent: number;
  }[];
  totalObtained: number;
  totalPossible: number;
  weightedPct: number | null;
  leaderboard: LeaderboardEntry[];
  myRank: LeaderboardEntry | null;
}

export default function MarksPage() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionMarks[]>([]);
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
            .select("section_id, section:course_sections(id, section_code, course:courses(code, title, id))"),
          supabase.from("marks").select("obtained, assessment_id").eq("student_id", user.id),
          supabase.from("assessments").select("id, section_id, title, type, total_marks, weightage"),
        ]);

      if (cancelled) return;

      const enrollments = (enrollRes.data ?? []) as {
        section_id: string;
        section: { id: string; section_code: string; course: { code: string; title: string; id: string }[] }[];
      }[];
      const marks = (markRes.data ?? []) as Mark[];
      const assessments = (assRes.data ?? []) as Assessment[];
      setMyRegNo((studentRes.data as { registration_no: string | null } | null)?.registration_no ?? null);

      const myMarksByAssessment = new Map(
        marks.map((m) => [m.assessment_id, Number(m.obtained)])
      );

      const perSection = await Promise.all(
        enrollments.map(async (en) => {
          const sec = one(en.section);
          if (!sec) return null;
          const course = one(sec.course);
          const courseAssessments = assessments.filter(
            (a) => a.section_id === sec.id
          );
          const rows = courseAssessments.map((a) => {
            const obtained = myMarksByAssessment.get(a.id) ?? null;
            return {
              id: a.id,
              title: a.title,
              type: a.type,
              total: Number(a.total_marks),
              weightage: Number(a.weightage ?? 0),
              obtained,
              stats: null as AssessmentStats | null,
              myPercent: obtained === null ? 0 : percent(obtained, Number(a.total_marks)),
            };
          });

          const [statsRes, leaderboardRes] = await Promise.all([
            supabase.rpc("get_assessment_stats_many", {
              p_assessment_ids: courseAssessments.map((a) => a.id),
            }),
            supabase.rpc("get_leaderboard", { p_section_id: sec.id }),
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
            sectionId: sec.id,
            code: course?.code ?? "",
            title: course?.title ?? "",
            sectionCode: sec.section_code,
            assessments: rows,
            totalObtained: rows.reduce((s, r) => s + (r.obtained ?? 0), 0),
            totalPossible: rows.reduce((s, r) => s + r.total, 0),
            weightedPct: (() => {
              const scored = rows.filter((r) => r.obtained !== null && r.weightage > 0);
              const w = scored.reduce((s, r) => s + r.weightage, 0);
              if (w === 0) return null;
              return (
                scored.reduce(
                  (s, r) => s + (r.obtained! / r.total) * r.weightage,
                  0
                ) /
                w *
                100
              );
            })(),
            leaderboard,
            myRank,
          };
        })
      );

      if (!cancelled) setSections(perSection.filter(Boolean) as SectionMarks[]);
    }

    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const total = sections.reduce((s, c) => s + c.totalObtained, 0);
    const possible = sections.reduce((s, c) => s + c.totalPossible, 0);
    return {
      total,
      possible,
      pct: possible ? percent(total, possible) : 0,
      assessments: sections.reduce((s, c) => s + c.assessments.length, 0),
      topRank: sections.reduce(
        (best, c) => (c.myRank ? Math.min(best, c.myRank.rank) : best),
        Infinity
      ),
    };
  }, [sections]);

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
          label="Enrolled sections"
          value={sections.length}
          hint="With published assessments"
        />
      </div>

      {sections.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No sections yet"
            description="Once your TA enrolls you and publishes marks, they'll show up here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map((sec) => (
            <SectionBlock key={sec.sectionId} section={sec} myRegNo={myRegNo} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionBlock({ section, myRegNo }: { section: SectionMarks; myRegNo: string | null }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-4">
        <div>
          <h2 className="font-bold text-ink">
            {section.code} <span className="font-medium text-ink/45">→</span>{" "}
            <span className="font-medium text-ink/70">{section.title}</span>
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">
            {section.sectionCode} · {section.assessments.length} assessments ·{" "}
            {section.totalPossible > 0
              ? `${percent(section.totalObtained, section.totalPossible).toFixed(1)}% overall · Grade ${gradeFor(section.totalObtained, section.totalPossible).grade}`
              : "No marks published yet"}
            {section.weightedPct !== null && (
              <>
                {" "}·{" "}
                <span className="font-semibold text-gold-deep">
                  Weighted: {section.weightedPct.toFixed(1)}%
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {section.myRank && (
            <Badge tone="gold">
              <Trophy className="h-3 w-3" /> Rank #{section.myRank.rank}
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
              <th className="th text-right">Weight</th>
              <th className="th text-right">Marks</th>
              <th className="th text-right">%</th>
              <th className="th text-right">Grade</th>
              <th className="th text-right">Class avg</th>
              <th className="th text-right">Min / Max</th>
            </tr>
          </thead>
          <tbody>
            {section.assessments.map((a) => (
              <tr key={a.id} className="bg-white">
                <td className="td font-semibold text-ink">{a.title}</td>
                <td className="td">
                  <Badge tone="neutral">{a.type}</Badge>
                </td>
                <td className="td text-right text-ink/70">
                  {a.weightage > 0 ? `${a.weightage}%` : "—"}
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
          {section.leaderboard.length === 0 ? (
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
                  {section.leaderboard.map((e) => {
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
                          {formatRegNo(e.registration_no) ?? "N/A"}
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