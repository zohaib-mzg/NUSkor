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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Assessment,
  Mark,
  AssessmentStats,
  LeaderboardEntry,
} from "@/lib/types";
import { formatRegNo, one, percent } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
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
  totalObtained: number;
  totalPossible: number;
  weightedPct: number | null;
  myRank: { rank: number; registration_no: string } | null;
}

function truncate2(value: number): string {
  return (Math.floor(value * 100) / 100).toFixed(2);
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

      const [studentRes, enrollRes, markRes, assRes] = await Promise.all([
        supabase
          .from("students")
          .select("registration_no")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("enrollments")
          .select(
            "section_id, section:course_sections(id, section_code, course:courses(code, title, id))"
          ),
        supabase
          .from("marks")
          .select("obtained, assessment_id")
          .eq("student_id", user.id),
        supabase
          .from("assessments")
          .select(
            "id, section_id, title, type, total_marks, weightage"
          ),
      ]);

      if (cancelled) return;

      const enrollments = (enrollRes.data ?? []) as {
        section_id: string;
        section: {
          id: string;
          section_code: string;
          course: {
            code: string;
            title: string;
            id: string;
          }[];
        }[];
      }[];
      const marks = (markRes.data ?? []) as Mark[];
      const assessments = (assRes.data ?? []) as Assessment[];
      setMyRegNo(
        (studentRes.data as { registration_no: string | null } | null)
          ?.registration_no ?? null
      );

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

          // Fetch stats and leaderboard for ALL assessments at once
          const [statsRes] = await Promise.all([
            supabase.rpc("get_assessment_stats_many", {
              p_assessment_ids: courseAssessments.map((a) => a.id),
            }),
          ]);

          if (cancelled) return;

          const statsById = new Map(
            (
              (statsRes.data ?? []) as (AssessmentStats & {
                assessment_id: string;
              })[]
            ).map((s) => [s.assessment_id, s])
          );

          // Fetch per-assessment leaderboards
          const leaderboardResults = await Promise.all(
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
          );

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

          const myRankEntry = rows
            .flatMap((r) => r.leaderboard)
            .find(
              (e) =>
                myRegNo &&
                e.registration_no ===
                  (
                    studentRes.data as {
                      registration_no: string | null;
                    } | null
                  )?.registration_no
            );

          return {
            sectionId: sec.id,
            code: course?.code ?? "",
            title: course?.title ?? "",
            sectionCode: sec.section_code,
            assessments: rows,
            totalObtained: rows.reduce(
              (s, r) => s + (r.obtained ?? 0),
              0
            ),
            totalPossible: rows.reduce((s, r) => s + r.total, 0),
            weightedPct: (() => {
              const scored = rows.filter(
                (r) => r.obtained !== null && r.weightage > 0
              );
              const w = scored.reduce((s, r) => s + r.weightage, 0);
              if (w === 0) return null;
              return (
                (scored.reduce(
                  (s, r) =>
                    s + (r.obtained! / r.total) * r.weightage,
                  0
                ) /
                  w) *
                100
              );
            })(),
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
    // myRegNo is set inside this same effect — adding it would cause infinite rerenders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = sections.reduce(
      (s, c) => s + c.totalObtained,
      0
    );
    const possible = sections.reduce(
      (s, c) => s + c.totalPossible,
      0
    );
    return {
      total,
      possible,
      pct: possible ? percent(total, possible) : 0,
      assessments: sections.reduce(
        (s, c) => s + c.assessments.length,
        0
      ),
      topRank: sections.reduce(
        (best, c) =>
          c.myRank ? Math.min(best, c.myRank.rank) : best,
        Infinity
      ),
    };
  }, [sections]);

  if (loading)
    return <Spinner label="Loading your marks..." />;

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
          value={
            summary.possible
              ? `${summary.pct.toFixed(1)}%`
              : "N/A"
          }
          hint={
            summary.possible
              ? `${summary.total} / ${summary.possible}`
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
          value={
            summary.topRank === Infinity
              ? "N/A"
              : `#${summary.topRank}`
          }
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
            <SectionBlock
              key={sec.sectionId}
              section={sec}
              myRegNo={myRegNo}
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
}: {
  a: AssessmentRow;
  myRegNo: string | null;
}) {
  const [showLb, setShowLb] = useState(false);
  const absolute =
    a.obtained !== null && a.weightage > 0
      ? (a.obtained / a.total) * a.weightage
      : null;
  const isMe = (entry: LeaderboardEntry) =>
    myRegNo && entry.registration_no === myRegNo;

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-ink">{a.title}</h3>
            <Badge tone="neutral">{a.type}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink/50">
            Weight: {a.weightage > 0 ? `${a.weightage}%` : "—"}
          </p>
        </div>
        <div className="text-right">
          {a.obtained !== null ? (
            <>
              <p className="text-lg font-bold text-ink">
                {a.obtained}{" "}
                <span className="text-sm font-normal text-ink/40">
                  / {a.total}
                </span>
              </p>
              <p className="text-xs text-ink/50">
                {a.myPercent.toFixed(1)}%
              </p>
            </>
          ) : (
            <p className="text-sm text-ink/35">
              Not published
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink/60">
        {/* Absolute */}
        {absolute !== null && (
          <span>
            Absolute:{" "}
            <span className="font-semibold text-ink">
              {truncate2(absolute)}
            </span>
          </span>
        )}

        {/* Class Average */}
        {a.stats?.avg_marks != null && (
          <span>
            Class Avg:{" "}
            <span className="font-semibold text-ink">
              {a.stats.avg_marks} / {a.total}
            </span>
          </span>
        )}

        {/* Min / Max */}
        {a.stats?.min_marks != null && (
          <span>
            Min / Max:{" "}
            <span className="font-semibold text-ink">
              {a.stats.min_marks} / {a.stats.max_marks}
            </span>
          </span>
        )}

        {a.obtained === null && (
          <span className="text-ink/35">
            Awaiting marks
          </span>
        )}
      </div>

      {/* Per-assessment leaderboard */}
      {a.leaderboard.length > 0 && (
        <div className="mt-3 border-t border-black/[0.06] pt-3">
          <button
            onClick={() => setShowLb((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold-deep hover:underline"
          >
            <Trophy className="h-3 w-3" />
            {showLb
              ? "Hide leaderboard"
              : "View leaderboard"}
            {showLb ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {showLb && (
            <div className="mt-2 overflow-x-auto rounded-lg bg-paper/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06]">
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
                      className={`border-b border-black/[0.03] ${
                        isMe(e) ? "bg-gold/15" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 font-semibold text-ink/60">
                        {e.rank <= 3 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
                            #{e.rank}
                          </span>
                        ) : (
                          `#${e.rank}`
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-ink">
                        {formatRegNo(e.registration_no) ??
                          "N/A"}
                        {isMe(e) && (
                          <Badge
                            tone="dark"
                            className="ml-1.5"
                          >
                            You
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-ink/70">
                        {e.total ?? "N/A"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-ink/70">
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
    </div>
  );
}

function SectionBlock({
  section,
  myRegNo,
}: {
  section: SectionMarks;
  myRegNo: string | null;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-4">
        <div>
          <h2 className="font-bold text-ink">
            {section.code}{" "}
            <span className="font-medium text-ink/45">
              →
            </span>{" "}
            <span className="font-medium text-ink/70">
              {section.title}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">
            {section.sectionCode} ·{" "}
            {section.assessments.length} assessments ·{" "}
            {section.totalPossible > 0
              ? `${percent(
                  section.totalObtained,
                  section.totalPossible
                ).toFixed(1)}% overall`
              : "No marks published yet"}
            {section.weightedPct !== null && (
              <>
                {" "}·{" "}
                <span className="font-semibold text-gold-deep">
                  Weighted:{" "}
                  {section.weightedPct.toFixed(1)}%
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {section.myRank && (
            <Badge tone="gold">
              <Trophy className="h-3 w-3" /> Rank #
              {section.myRank.rank}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {section.assessments.map((a) => (
          <AssessmentCard
            key={a.id}
            a={a}
            myRegNo={myRegNo}
          />
        ))}
      </div>
    </section>
  );
}
