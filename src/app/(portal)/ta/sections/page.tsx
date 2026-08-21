"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, UserRound, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseSection, SectionRequest } from "@/lib/types";
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
  const [pendingRequests, setPendingRequests] = useState<SectionRequest[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentTerm = currentSemester().split(" ")[0];
  const [reqCourseCode, setReqCourseCode] = useState("");
  const [reqCourseName, setReqCourseName] = useState("");
  const [reqSectionCode, setReqSectionCode] = useState("");
  const [reqSemester, setReqSemester] = useState(currentTerm);
  const [reqYear, setReqYear] = useState(currentYear);
  const [reqNotes, setReqNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [stRes, taRes, enRes, reqRes] = await Promise.all([
        supabase
          .from("section_tas")
          .select("section_id, section:course_sections(*, course:courses(code, title))")
          .eq("semester", semester)
          .eq("ta_id", user.id),
        supabase.from("section_tas").select("section_id, ta_id"),
        supabase.from("enrollments").select("section_id"),
        supabase
          .from("section_requests")
          .select("*")
          .eq("ta_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
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
      setPendingRequests((reqRes.data ?? []) as SectionRequest[]);
      setLoading(false);
    }
    load().finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [semester]);

  async function submitRequest() {
    if (!reqCourseCode.trim() || !reqCourseName.trim() || !reqSectionCode.trim()) return;
    setRequestBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("section_requests").insert({
      ta_id: user.id,
      course_code: reqCourseCode.trim().toUpperCase(),
      course_name: reqCourseName.trim(),
      section_code: reqSectionCode.trim(),
      semester: reqSemester,
      year: reqYear,
      notes: reqNotes.trim() || null,
    });
    setRequestBusy(false);
    if (err) return error(err.message);
    success("Request submitted. An admin will review it.");
    setRequestOpen(false);
    resetForm();
  }

  function resetForm() {
    setReqCourseCode("");
    setReqCourseName("");
    setReqSectionCode("");
    setReqNotes("");
  }

  if (loading) return <Spinner label="Loading your sections..." />;

  return (
    <div>
      <PageHeader
        title="My Sections"
        subtitle="Sections assigned to you. Request new sections from the button below."
        icon={BookOpen}
        actions={
          <>
            <SemesterSelector />
            <button
              className="btn-primary"
              onClick={() => setRequestOpen(true)}
            >
              <Plus className="h-4 w-4" /> Request Section
            </button>
          </>
        }
      />

      {pendingRequests.length > 0 && (
        <div className="card mb-6 border-gold/30 bg-gold/5 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-deep">
            Pending requests ({pendingRequests.length})
          </p>
          <ul className="space-y-1">
            {pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs"
              >
                <Badge tone="gold">Pending</Badge>
                <span className="font-semibold text-ink">
                  {r.course_code} — {r.course_name}
                </span>
                <span className="text-ink/50">
                  Section {r.section_code} · {r.semester} {r.year}
                </span>
                {r.notes && (
                  <span className="truncate text-ink/40 italic">
                    — {r.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sections assigned yet"
            description="Click 'Request Section' to ask an admin to assign you to a course section."
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

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request a new section"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink/55">
            Fill in the course and section details. On approval, the course and
            section will be created and you will be assigned as TA.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Course code</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. EE2003"
                value={reqCourseCode}
                onChange={(e) => setReqCourseCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Course name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Digital Logic Design"
                value={reqCourseName}
                onChange={(e) => setReqCourseName(e.target.value)}
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
              value={reqSectionCode}
              onChange={(e) => setReqSectionCode(e.target.value)}
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
          <div>
            <label className="label">
              Notes <span className="text-ink/40">(optional)</span>
            </label>
            <textarea
              className="input min-h-16"
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              placeholder="e.g. Also available for Section B. Available Mon/Wed."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-outline"
              onClick={() => setRequestOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={submitRequest}
              disabled={requestBusy || !reqCourseCode.trim() || !reqCourseName.trim() || !reqSectionCode.trim()}
            >
              {requestBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Submit request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
