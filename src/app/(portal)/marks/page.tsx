"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Trophy,
  Users,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Award,
  BookOpen,
  TrendingDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Assessment,
  Mark,
  AssessmentStats,
  LeaderboardEntry,
} from "@/lib/types";
import {
  formatRegNo,
  one,
  percent,
  weightedOverallPct,
} from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface AssessmentRow {
  id: string;
  title: string;
  type: string;
  total: number;
  weightage: number;
  obtained: number | null;
  stats: AssessmentStats | null;
  myPercent: number;
  leaderboard: LeaderboardEntry[];
}

interface SectionMarks {
  sectionId: string;
  code: string;
  title: string;
  sectionCode: string;
  assessments: AssessmentRow[];
  weightedOverall: number;
  hasScoredMarks: boolean;
  leaderboardVisible: boolean;
  myRank: { rank: number; registration_no: string } | null;
}

interface OverallEntry {
  registration_no: string | null;
  weighted_pct: number;
  percent: number;
  rank: number;
}

function ScoreRing({
  pct,
  size = 64,
  stroke = 5,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color =
    pct >= 80 ? "#22c55e" : pct >= 60 ? "#F5C518" : pct >= 40 ? "#f97316" : "#ef4444";

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e5e5"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

function ProgressBar({
  obtained,
  total,
}: {
  obtained: number;
  total: number;
}) {
  const pct = total > 0 ? (obtained / total) * 100 : 0;
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-gold" : pct >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-ink/40" />
      <span className="text-xs text-ink/50">{label}</span>
      <span className="text-xs font-semibold text-ink">{value}</span>
    </div>
  );
}

export default function MarksPage() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionMarks[]>([]);
  const [myRegNo, setMyRegNo] = useState<string | null>(null);
  const [hasAnyMarks, setHasAnyMarks] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [studentRes, enrollRes, markRes, assRes] = await Promise.all([
        supabase
          .from("students")
          .select("registration_no")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("enrollments")
          .select(
            "section_id, section:course_sections(id, section_code, leaderboard_visible, course:courses(code, title, id))"
          )
          .eq("student_id", user.id),
        supabase
          .from("marks")
          .select("obtained, assessment_id")
          .eq("student_id", user.id),
        supabase
          .from("assessments")
          .select(
            "id, section_id, title, type, total_marks, weightage, status"
          )
          .eq("status", "published"),
      ]);

      if (cancelled) return;

      const enrollments = (enrollRes.data ?? []) as {
        section_id: string;
        section: {
          id: string;
          section_code: string;
          leaderboard_visible: boolean;
          course: {
            code: string;
            title: string;
            id: string;
          }[];
        }[];
      }[];
      const marks = (markRes.data ?? []) as Mark[];
      const assessments = ((assRes.data ?? []) as Assessment[]).filter(
        (a) => a.status === "published"
      );

      const studentHasMarks = marks.length > 0;
      setHasAnyMarks(studentHasMarks);

      const regNo =
        (studentRes.data as { registration_no: string | null } | null)
          ?.registration_no ?? null;
      setMyRegNo(regNo);

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

          const lbVisible = sec.leaderboard_visible;

          const [statsRes, overallLbRes] =
            studentHasMarks && lbVisible
              ? await Promise.all([
                  supabase.rpc("get_assessment_stats_many", {
                    p_assessment_ids: courseAssessments.map((a) => a.id),
                  }),
                  supabase.rpc("get_leaderboard", { p_section_id: sec.id }),
                ])
              : [{ data: [] }, { data: [] }];

          if (cancelled) return;

          const statsById = new Map(
            (
              (statsRes.data ?? []) as (AssessmentStats & {
                assessment_id: string;
              })[]
            ).map((s) => [s.assessment_id, s])
          );

          const leaderboardResults =
            studentHasMarks && lbVisible
              ? await Promise.all(
                  courseAssessments.map(async (a) => {
                    const { data } = await supabase.rpc(
                      "get_assessment_leaderboard",
                      {
                        p_assessment_id: a.id,
                        p_section_id: sec.id,
                      }
                    );
                    return {
                      assessmentId: a.id,
                      leaderboard: (data ?? []) as LeaderboardEntry[],
                    };
                  })
                )
              : [];

          const lbByAssessment = new Map(
            leaderboardResults.map((r) => [r.assessmentId, r.leaderboard])
          );

          const rows: AssessmentRow[] = courseAssessments.map((a) => {
            const obtained = myMarksByAssessment.get(a.id) ?? null;
            return {
              id: a.id,
              title: a.title,
              type: a.type,
              total: Number(a.total_marks),
              weightage: Number(a.weightage ?? 0),
              obtained,
              stats: statsById.get(a.id) ?? null,
              myPercent:
                obtained === null
                  ? 0
                  : percent(obtained, Number(a.total_marks)),
              leaderboard: lbByAssessment.get(a.id) ?? [],
            };
          });

          const overallLb = (overallLbRes.data ?? []) as OverallEntry[];
          const myRankEntry = regNo
            ? (overallLb.find((e) => e.registration_no === regNo) ?? null)
            : null;

          return {
            sectionId: sec.id,
            code: course?.code ?? "",
            title: course?.title ?? "",
            sectionCode: sec.section_code,
            assessments: rows,
            weightedOverall: weightedOverallPct(rows),
            hasScoredMarks: rows.some((r) => r.obtained !== null),
            leaderboardVisible: lbVisible,
            myRank: myRankEntry
              ? {
                  rank: myRankEntry.rank,
                  registration_no: myRankEntry.registration_no,
                }
              : null,
          };
        })
      );

      if (!cancelled)
        setSections(
          perSection.filter(Boolean) as SectionMarks[]
        );
    }

    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const allRows = sections.flatMap((c) => c.assessments);
    return {
      overallPct: weightedOverallPct(allRows),
      hasMarks: allRows.some((r) => r.obtained !== null),
      assessments: allRows.length,
      overallRank: hasAnyMarks
        ? sections.reduce(
            (best, c) =>
              c.myRank ? Math.min(best, c.myRank.rank) : best,
            Infinity
          )
        : Infinity,
    };
  }, [sections, hasAnyMarks]);

  if (loading) return <Spinner label="Loading your marks..." />;

  return (
    <div>
      <PageHeader
        title="My Marks"
        subtitle="Track your performance across all courses."
        icon={ClipboardList}
      />

      {/* Hero summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall performance ring */}
        <div className="card flex items-center gap-4 p-5">
          <div className="relative">
            <ScoreRing pct={summary.hasMarks ? summary.overallPct : 0} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">
              {summary.hasMarks ? `${summary.overallPct.toFixed(0)}` : "—"}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-ink/50">Overall Score</p>
            <p className="text-lg font-extrabold text-ink">
              {summary.hasMarks ? `${summary.overallPct.toFixed(1)}%` : "N/A"}
            </p>
            <p className="text-[11px] text-ink/40">Weighted average</p>
          </div>
        </div>

        {/* Rank */}
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15">
            <Trophy className="h-6 w-6 text-gold-deep" />
          </div>
          <div>
            <p className="text-xs font-medium text-ink/50">Your Rank</p>
            <p className="text-lg font-extrabold text-ink">
              {summary.overallRank === Infinity
                ? "N/A"
                : `#${summary.overallRank}`}
            </p>
            <p className="text-[11px] text-ink/40">Across all sections</p>
          </div>
        </div>

        {/* Assessments */}
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
            <Target className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-ink/50">Assessments</p>
            <p className="text-lg font-extrabold text-ink">
              {summary.assessments}
            </p>
            <p className="text-[11px] text-ink/40">Published total</p>
          </div>
        </div>

        {/* Sections */}
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
            <BookOpen className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-ink/50">Sections</p>
            <p className="text-lg font-extrabold text-ink">
              {sections.length}
            </p>
            <p className="text-[11px] text-ink/40">Enrolled courses</p>
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title="No sections yet"
            description="Once your TA enrolls you and publishes marks, they'll show up here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {sections.map((sec) => (
            <SectionBlock
              key={sec.sectionId}
              section={sec}
              myRegNo={myRegNo}
              hasAnyMarks={hasAnyMarks}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentCard({
  a,
  myRegNo,
  hasAnyMarks,
  leaderboardVisible,
}: {
  a: AssessmentRow;
  myRegNo: string | null;
  hasAnyMarks: boolean;
  leaderboardVisible: boolean;
}) {
  const [showLb, setShowLb] = useState(false);
  const isMe = (entry: LeaderboardEntry) =>
    myRegNo && entry.registration_no === myRegNo;

  const showLeaderboard = hasAnyMarks && leaderboardVisible && a.leaderboard.length > 0;

  return (
    <div className="group rounded-xl border border-black/[0.06] bg-white p-5 transition-all hover:shadow-lift">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-ink">{a.title}</h3>
            <span className="inline-flex items-center rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
              {a.type}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink/40">
            Weight: {a.weightage > 0 ? `${a.weightage}%` : "—"} · Total: {a.total}
          </p>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          {a.obtained !== null ? (
            <div className="text-right">
              <p className="text-xl font-extrabold text-ink">
                {a.obtained}
                <span className="text-sm font-normal text-ink/30">
                  /{a.total}
                </span>
              </p>
              <p className={`text-xs font-semibold ${
                a.myPercent >= 80 ? "text-green-600" : a.myPercent >= 60 ? "text-gold-deep" : "text-red-500"
              }`}>
                {a.myPercent.toFixed(1)}%
              </p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-ink/40">
              <TrendingDown className="h-3 w-3" />
              Awaiting marks
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {a.obtained !== null && (
        <div className="mt-3">
          <ProgressBar obtained={a.obtained} total={a.total} />
        </div>
      )}

      {/* Stats row */}
      {hasAnyMarks && (
        <div className="mt-3 flex flex-wrap gap-2">
          {a.stats?.avg_marks != null && (
            <StatPill
              label="Class Avg"
              value={`${a.stats.avg_marks}/${a.total}`}
              icon={BarChart3}
            />
          )}
          {a.stats?.min_marks != null && a.stats?.max_marks != null && (
            <StatPill
              label="Range"
              value={`${a.stats.min_marks}–${a.stats.max_marks}`}
              icon={TrendingUp}
            />
          )}
          {a.stats?.total_students != null && (
            <StatPill
              label="Students"
              value={a.stats.total_students}
              icon={Users}
            />
          )}
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="mt-4 border-t border-black/[0.05] pt-3">
          <button
            onClick={() => setShowLb((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold-deep hover:underline"
          >
            <Trophy className="h-3 w-3" />
            {showLb ? "Hide leaderboard" : "View leaderboard"}
            {showLb ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {showLb && (
            <div className="mt-2 overflow-hidden rounded-lg border border-black/[0.05]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-black/[0.02]">
                    <th className="px-3 py-2 text-left font-semibold text-ink/50">
                      Rank
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-ink/50">
                      Student
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-ink/50">
                      Marks
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-ink/50">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {a.leaderboard.map((e, i) => (
                    <tr
                      key={e.registration_no ?? i}
                      className={`border-t border-black/[0.03] transition-colors ${
                        isMe(e) ? "bg-gold/10" : "hover:bg-black/[0.01]"
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold text-ink/60">
                        {e.rank <= 3 ? (
                          <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                            e.rank === 1 ? "bg-gold text-ink" : e.rank === 2 ? "bg-gray-200 text-ink" : "bg-amber-100 text-amber-800"
                          }`}>
                            #{e.rank}
                          </span>
                        ) : (
                          `#${e.rank}`
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">
                        {formatRegNo(e.registration_no) ?? "N/A"}
                        {isMe(e) && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-bold text-white">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-ink/70">
                        {e.obtained != null
                          ? `${e.obtained} / ${e.total_marks ?? "?"}`
                          : "N/A"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-ink/70">
                        {e.percent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard hidden notice */}
      {hasAnyMarks && !leaderboardVisible && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink/30">
          <EyeOff className="h-3 w-3" />
          Leaderboard hidden by TA
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  myRegNo,
  hasAnyMarks,
}: {
  section: SectionMarks;
  myRegNo: string | null;
  hasAnyMarks: boolean;
}) {
  const scored = section.assessments.filter((a) => a.obtained !== null);
  const avgPct =
    scored.length > 0
      ? scored.reduce((s, a) => s + a.myPercent, 0) / scored.length
      : 0;

  return (
    <section className="card overflow-hidden">
      {/* Section header */}
      <div className="border-b border-black/[0.05] bg-gradient-to-r from-ink/[0.02] to-transparent px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15">
              <BookOpen className="h-5 w-5 text-gold-deep" />
            </div>
            <div>
              <h2 className="font-bold text-ink">
                {section.code}{" "}
                <span className="font-medium text-ink/35">→</span>{" "}
                <span className="font-medium text-ink/60">
                  {section.title}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-ink/40">
                {section.sectionCode} · {section.assessments.length} assessments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {section.leaderboardVisible ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                <Eye className="h-3 w-3" /> Lb visible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-semibold text-ink/40">
                <EyeOff className="h-3 w-3" /> Lb hidden
              </span>
            )}
            {hasAnyMarks && section.myRank && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold-deep">
                <Award className="h-3.5 w-3.5" />
                Rank #{section.myRank.rank}
              </span>
            )}
          </div>
        </div>

        {/* Overall progress */}
        {section.hasScoredMarks && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar obtained={avgPct} total={100} />
            </div>
            <span className="text-xs font-bold text-ink">
              {section.weightedOverall.toFixed(1)}%
            </span>
          </div>
        )}
        {!section.hasScoredMarks && (
          <p className="mt-2 text-xs text-ink/35">No marks published yet</p>
        )}
      </div>

      {/* Assessment cards */}
      <div className="divide-y divide-black/[0.04] p-5 space-y-0">
        {section.assessments.map((a) => (
          <div key={a.id} className="py-3 first:pt-0 last:pb-0">
            <AssessmentCard
              a={a}
              myRegNo={myRegNo}
              hasAnyMarks={hasAnyMarks}
              leaderboardVisible={section.leaderboardVisible}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
