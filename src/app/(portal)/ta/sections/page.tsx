"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, UserRound, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseSection } from "@/lib/types";
import { one } from "@/lib/utils";
import { useSemester } from "@/lib/semester";
import SemesterSelector from "@/components/SemesterSelector";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface SectionSummary {
  section: CourseSection;
  taCount: number;
  studentCount: number;
}

export default function TaSectionsPage() {
  const [loading, setLoading] = useState(true);
  const [semester] = useSemester();
  const [sections, setSections] = useState<SectionSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [stRes, taRes, enRes] = await Promise.all([
        supabase
          .from("section_tas")
          .select("section_id, section:course_sections(*, course:courses(code, title))")
          .eq("semester", semester)
          .eq("ta_id", user.id),
        supabase.from("section_tas").select("section_id, ta_id"),
        supabase.from("enrollments").select("section_id"),
      ]);
      if (cancelled) return;

      const assigned = (stRes.data ?? []) as {
        section_id: string;
        section: (CourseSection & {
          course?: { code: string; title: string }[] | null;
        })[];
      }[];
      const taCounts: Record<string, number> = {};
      const studentCounts: Record<string, number> = {};
      (taRes.data ?? []).forEach((r: { section_id: string }) => {
        taCounts[r.section_id] = (taCounts[r.section_id] ?? 0) + 1;
      });
      (enRes.data ?? []).forEach((r: { section_id: string }) => {
        studentCounts[r.section_id] = (studentCounts[r.section_id] ?? 0) + 1;
      });

      setSections(
        assigned
          .map((a) => {
            const section = one(a.section);
            if (!section) return null;
            return {
              section: section as CourseSection,
              taCount: taCounts[a.section_id] ?? 0,
              studentCount: studentCounts[a.section_id] ?? 0,
            };
          })
          .filter((s): s is SectionSummary => s !== null)
      );
      setLoading(false);
    }
    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading your sections..." />;

  return (
    <div>
      <PageHeader
        title="My Sections"
        subtitle="Sections assigned to you. You can only access these and their students."
        icon={BookOpen}
        actions={<SemesterSelector />}
      />

      {sections.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sections assigned yet"
            description="Ask an admin to assign you to course sections. Once assigned, they appear here."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ section, taCount, studentCount }) => (
            <div key={section.id} className="card p-5 transition-all hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                  <BookOpen className="h-5 w-5" />
                </div>
                <Badge tone="gold">{section.section_code}</Badge>
              </div>
              <h3 className="mt-3 font-bold text-ink">
                {section.course?.code ?? "Course"}
                <span className="font-medium text-ink/45"> · {section.course?.title ?? ""}</span>
              </h3>
              <p className="mt-1 text-xs text-ink/50">
                {section.semester ?? "No semester"} {section.academic_year ?? ""}
              </p>
              <div className="mt-4 flex items-center gap-4 border-t border-black/[0.05] pt-4 text-xs text-ink/55">
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-gold-deep" />
                  {taCount} {taCount === 1 ? "TA" : "TAs"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gold-deep" />
                  {studentCount} students
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <Megaphone className="h-4 w-4 text-gold-deep" /> What can you do here?
        </h2>
        <p className="mt-1 text-sm text-ink/55">
          Student management, marks, evaluation slots and announcements for your
          sections arrive in the next release of the TA portal.
        </p>
      </section>
    </div>
  );
}