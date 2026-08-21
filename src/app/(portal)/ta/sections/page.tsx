"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, UserRound, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseSection } from "@/lib/types";
import { one } from "@/lib/utils";
import { useSemester, currentSemester } from "@/lib/semester";
import SemesterSelector from "@/components/SemesterSelector";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface SectionSummary {
  section: CourseSection;
  taCount: number;
  studentCount: number;
}

export default function TaSectionsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [semester] = useSemester();
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentTerm = currentSemester().split(" ")[0];
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [sectionCode, setSectionCode] = useState("");
  const [reqSemester, setReqSemester] = useState(currentTerm);
  const [reqYear, setReqYear] = useState(currentYear);

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
  }, [semester]);

  async function createSection() {
    if (!courseCode.trim() || !courseName.trim() || !sectionCode.trim()) return;
    setCreateBusy(true);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("create_ta_section", {
      p_course_code: courseCode.trim(),
      p_course_name: courseName.trim(),
      p_section_code: sectionCode.trim(),
      p_semester: reqSemester,
      p_year: String(reqYear),
    });

    setCreateBusy(false);
    if (rpcErr) return error(rpcErr.message);
    success("Section created and assigned to you.");
    setCreateOpen(false);
    setCourseCode("");
    setCourseName("");
    setSectionCode("");
    setLoading(true);
    window.location.reload();
  }

  if (loading) return <Spinner label="Loading your sections..." />;

  return (
    <div>
      <PageHeader
        title="My Sections"
        subtitle="Sections assigned to you. Create new sections from the button below."
        icon={BookOpen}
        actions={
          <>
            <SemesterSelector />
            <button
              className="btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Create Section
            </button>
          </>
        }
      />

      {sections.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sections yet"
            description="Click 'Create Section' to create a course and section, then assign yourself as TA."
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
                {section.semester ?? "No semester"}
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a new section"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink/55">
            Create a course (if new) and a section. You will be automatically
            assigned as TA.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Course code</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. EE2003"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Course name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Digital Logic Design"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Section name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. A, B, CS-A"
              value={sectionCode}
              onChange={(e) => setSectionCode(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Semester</label>
              <select
                className="input"
                value={reqSemester}
                onChange={(e) => setReqSemester(e.target.value)}
              >
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select
                className="input"
                value={reqYear}
                onChange={(e) => setReqYear(Number(e.target.value))}
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={createSection}
              disabled={createBusy || !courseCode.trim() || !courseName.trim() || !sectionCode.trim()}
            >
              {createBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create section
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
