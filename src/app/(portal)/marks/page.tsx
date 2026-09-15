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
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  AssessmentStats,
  LeaderboardEntry,
} from "@/lib/types";
import {
  formatRegNo,
  percent,
  weightedOverallPct,
} from "@/lib/utils";
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
  weightedOverall: number;
  hasScoredMarks: boolean;
  leaderboardVisible: boolean;
  myRank: { rank: number; registration_no: string } | null;
}

interface RpcRow {
  section_id: string;
  section_code: string;
  course_code: string;
  course_title: string;
  leaderboard_visible: boolean;
  assessment_id: string;
  assessment_title: string;
  assessment_type: string;
  total_marks: number;
  weightage: number;
  obtained: number | null;
  avg_marks: number | null;
  min_marks: number | null;
  max_marks: number | null;
  stat_total_students: number | null;
  lb_registration_no: string | null;
  lb_obtained: number | null;
  lb_total_marks: number | null;
  lb_percent: number | null;
  lb_rank: number | null;
}

function truncate2(value: number): string {
  return (Math.floor(value * 100) / 100).toFixed(2);
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

      const { data: studentRes } = await supabase
        .from("students")
        .select("registration_no")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      const regNo = (studentRes as { registration_no: string | null } | null)?.registration_no ?? null;
      setMyRegNo(regNo);

      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_student_marks_data", {
        p_student_id: user.id,
      });

      if (cancelled || rpcErr || !rpcData || rpcData.length === 0) {
        setSections([]);
        return;
      }

      const rows = rpcData as RpcRow[];

      const studentHasMarks = rows.some((r) => r.obtained !== null);
      setHasAnyMarks(studentHasMarks);

      const sectionMap = new Map<string, {
        sectionId: string;
        sectionCode: string;
        code: string;
        title: string;
        leaderboardVisible: boolean;
        assessments: Map<string, AssessmentRow>;
        leaderboard: Map<string, LeaderboardEntry[]>;
      }>();

      for (const row of rows) {
        if (!sectionMap.has(row.section_id)) {
          sectionMap.set(row.section_id, {
            sectionId: row.section_id,
            sectionCode: row.section_code,
            code: row.course_code,
            title: row.course_title,
            leaderboardVisible: row.leaderboard_visible,
            assessments: new Map(),
            leaderboard: new Map(),
          });
        }
        const sec = sectionMap.get(row.section_id)!;

        if (!sec.assessments.has(row.assessment_id)) {
          const obtained = row.obtained;
          sec.assessments.set(row.assessment_id, {
            id: row.assessment_id,
            title: row.assessment_title,
            type: row.assessment_type,
            total: Number(row.total_marks),
            weightage: Number(row.weightage ?? 0),
            obtained,
            stats: row.avg_marks != null ? {
              avg_marks: row.avg_marks,
              min_marks: row.min_marks,
              max_marks: row.max_marks,
              total_students: row.stat_total_students,
            } : null,
            myPercent: obtained === null ? 0 : percent(obtained, Number(row.total_marks)),
            leaderboard: [],
          });
        }

        if (row.lb_registration_no && row.lb_rank != null) {
          const lb = sec.leaderboard.get(row.assessment_id) ?? [];
          lb.push({
            registration_no: row.lb_registration_no,
            obtained: row.lb_obtained,
            total_marks: row.lb_total_marks,
            percent: Number(row.lb_percent ?? 0),
            rank: Number(row.lb_rank),
          });
          sec.leaderboard.set(row.assessment_id, lb);
        }
      }

      const sections: SectionMarks[] = [];
      for (const sec of sectionMap.values()) {
        const assessments: AssessmentRow[] = [];
        for (const a of sec.assessments.values()) {
          a.leaderboard = sec.leaderboard.get(a.id) ?? [];
          assessments.push(a);
        }

        const overallLb = [...sec.leaderboard.values()].flat();
        const myRankEntry = regNo
          ? overallLb.find((e) => e.registration_no === regNo) ?? null
          : null;

        const weightedOverall = weightedOverallPct(
          assessments.map((a) => ({
            obtained: a.obtained,
            total: a.total,
            weightage: a.weightage,
          }))
        );

        sections.push({
          sectionId: sec.sectionId,
          code: sec.code,
          title: sec.title,
          sectionCode: sec.sectionCode,
          assessments,
          weightedOverall,
          hasScoredMarks: assessments.some((r) => r.obtained !== null),
          leaderboardVisible: sec.leaderboardVisible,
          myRank: myRankEntry ? { rank: myRankEntry.rank, registration_no: myRankEntry.registration_no ?? "" } : null,
        });
      }

      if (!cancelled) setSections(sections);
    }

    load().finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
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
          label="Overall Absolute"
          value={
            summary.hasMarks
              ? `${summary.overallPct.toFixed(1)}`
              : "N/A"
          }
          hint="Weighted across published assessments"
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
          label="Overall rank"
          value={
            summary.overallRank === Infinity
              ? "N/A"
              : `#${summary.overallRank}`
          }
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
        {absolute !== null && (
          <span>
            Absolute:{" "}
            <span className="font-semibold text-ink">
              {truncate2(absolute)}
            </span>
          </span>
        )}

        {hasAnyMarks && a.stats?.avg_marks != null && (
          <span>
            Trimmed mean:{" "}
            <span className="font-semibold text-ink">
              {a.stats.avg_marks} / {a.total}
            </span>
          </span>
        )}

        {hasAnyMarks && a.stats?.min_marks != null && (
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
      {hasAnyMarks && leaderboardVisible && a.leaderboard.length > 0 && (
        <div className="mt-3 border-t border-black/[0.06] pt-3">
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
                        {formatRegNo(e.registration_no) ?? "N/A"}
                        {isMe(e) && (
                          <Badge tone="dark" className="ml-1.5">
                            You
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-ink/70">
                        {e.obtained != null ? `${e.obtained} / ${e.total_marks ?? "?"}` : "N/A"}
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
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-4">
        <div>
          <h2 className="font-bold text-ink">
            {section.code}{" "}
            <span className="font-medium text-ink/45">→</span>{" "}
            <span className="font-medium text-ink/70">
              {section.title}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">
            {section.sectionCode} ·{" "}
            {section.assessments.length} assessments ·{" "}
            {section.hasScoredMarks
              ? `${section.weightedOverall.toFixed(1)}% overall`
              : "No marks published yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasAnyMarks && section.myRank && (
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
            hasAnyMarks={hasAnyMarks}
            leaderboardVisible={section.leaderboardVisible}
          />
        ))}
      </div>
    </section>
  );
}
