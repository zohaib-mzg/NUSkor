"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderKanban, Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyAll } from "@/lib/push";
import type { Assessment, CourseSection } from "@/lib/types";
import { one } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TYPES = ["quiz", "assignment", "midterm", "project", "final", "other"] as const;

export default function AssessmentsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; assessment: Assessment } | null
  >(null);
  const [toDelete, setToDelete] = useState<Assessment | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [aRes, secRes] = await Promise.all([
      supabase
        .from("assessments")
        .select("*, section:course_sections(id, section_code, course:courses(code))")
        .order("created_at", { ascending: false }),
      supabase
        .from("course_sections")
        .select("*, course:courses(code, title)")
        .eq("status", "active"),
    ]);
    if (!aRes.error) setAssessments((aRes.data ?? []) as Assessment[]);
    if (!secRes.error) setSections((secRes.data ?? []) as CourseSection[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    sectionFilter === "all"
      ? assessments
      : assessments.filter((a) => a.section_id === sectionFilter);

  async function saveAssessment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      section_id: HTMLSelectElement;
      title: HTMLInputElement;
      type: HTMLSelectElement;
      total_marks: HTMLInputElement;
      weightage: HTMLInputElement;
      release_date: HTMLInputElement;
      status: HTMLSelectElement;
    };
    const payload = {
      section_id: el.section_id.value,
      title: el.title.value.trim(),
      type: el.type.value,
      total_marks: Number(el.total_marks.value),
      weightage: Number(el.weightage.value) || 0,
      release_date: el.release_date.value || null,
      status: el.status.value,
    };
    if (!payload.section_id || !payload.title || !payload.total_marks) return;

    const supabase = createClient();
    let savedId: string | null = null;
    if (modal?.mode === "create") {
      const { data, error: err } = await supabase
        .from("assessments")
        .insert(payload)
        .select("id")
        .single();
      if (err) return error(err.message);
      savedId = data.id;
      success(`"${payload.title}" created.`);
    } else if (modal?.mode === "edit" && modal.assessment) {
      const { error: err } = await supabase
        .from("assessments")
        .update(payload)
        .eq("id", modal.assessment.id);
      if (err) return error(err.message);
      savedId = modal.assessment.id;
      success("Assessment updated.");
    }
    if (savedId && payload.status === "published") {
      const today = new Date().toISOString().slice(0, 10);
      if (!payload.release_date || payload.release_date <= today) {
        try {
          await notifyAll("marks_released", savedId);
        } catch (err) {
          console.error("marks notification failed", err);
        }
      }
    }
    setModal(null);
    load();
  }

  async function deleteAssessment() {
    if (!toDelete) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("assessments")
      .delete()
      .eq("id", toDelete.id);
    if (err) return error(err.message);
    success(`"${toDelete.title}" deleted. Its marks were removed too.`);
    setToDelete(null);
    load();
  }

  if (loading) return <Spinner label="Loading assessments..." />;

  const typeTone = (t: string) =>
    t === "midterm"
      ? "gold"
      : t === "quiz"
        ? "blue"
        : t === "project" || t === "final"
          ? "dark"
          : "neutral";

  const statusTone = (s: string) =>
    s === "published" ? "green" : s === "draft" ? "neutral" : "red";

  const selectedSection = modal?.mode === "edit" ? modal.assessment.section : null;

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="Assessments belong to a section. Set absolute marks, weightage and release status."
        icon={FolderKanban}
        actions={
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New assessment
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSectionFilter("all")}
          className={sectionFilter === "all" ? "btn-dark px-3 py-1.5 text-xs" : "btn-outline px-3 py-1.5 text-xs"}
        >
          All sections
        </button>
        {sections.map((s) => {
          const course = one(s.course);
          return (
            <button
              key={s.id}
              onClick={() => setSectionFilter(s.id)}
              className={
                sectionFilter === s.id
                  ? "btn-dark px-3 py-1.5 text-xs"
                  : "btn-outline px-3 py-1.5 text-xs"
              }
            >
              {course?.code ?? ""} · {s.section_code}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="No assessments here" description="Create one to start recording marks." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const course = one(a.section?.course);
            return (
              <div key={a.id} className="card p-5 transition-all hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={typeTone(a.type) as "gold" | "blue" | "dark" | "neutral"}>{a.type}</Badge>
                    <Badge tone={statusTone(a.status) as "green" | "neutral" | "red"}>{a.status}</Badge>
                  </div>
                </div>
                <h3 className="mt-3 font-bold text-ink">{a.title}</h3>
                <p className="text-xs font-semibold text-gold-deep">
                  {course?.code ?? ""} · Section {a.section?.section_code ?? ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/55">
                  <span>Marks: <span className="font-bold text-ink">{a.total_marks}</span></span>
                  <span>Weight: <span className="font-bold text-ink">{a.weightage}%</span></span>
                </div>
                <p className="mt-1 text-xs text-ink/45">
                  {a.release_date ? `Release: ${a.release_date}` : "No release date"}
                </p>
                <div className="mt-4 flex gap-2 border-t border-black/[0.05] pt-4">
                  <button
                    className="btn-outline flex-1 px-3 py-1.5 text-xs"
                    onClick={() => setModal({ mode: "edit", assessment: a })}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    className="btn-outline flex-1 px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                    onClick={() => setToDelete(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "New assessment" : "Edit assessment"}
      >
        <form onSubmit={saveAssessment} className="space-y-4">
          <div>
            <label className="label">Section</label>
            <select
              name="section_id"
              className="input"
              required
              defaultValue={selectedSection?.id ?? ""}
            >
              <option value="" disabled>
                Select a section
              </option>
              {sections.map((s) => {
                const course = one(s.course);
                return (
                  <option key={s.id} value={s.id}>
                    {course?.code ?? "Course"} · Section {s.section_code}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input
              name="title"
              className="input"
              placeholder="e.g. Final Report"
              required
              defaultValue={modal?.mode === "edit" ? modal.assessment.title : ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                name="type"
                className="input"
                required
                defaultValue={modal?.mode === "edit" ? modal.assessment.type : "assignment"}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Total marks</label>
              <input
                name="total_marks"
                type="number"
                min={1}
                step="any"
                className="input"
                placeholder="e.g. 25"
                required
                defaultValue={modal?.mode === "edit" ? modal.assessment.total_marks : ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Weightage (%)</label>
              <input
                name="weightage"
                type="number"
                min={0}
                max={100}
                step="any"
                className="input"
                placeholder="e.g. 10"
                defaultValue={modal?.mode === "edit" ? modal.assessment.weightage : ""}
              />
              <p className="mt-1 text-[11px] text-ink/40">Contribution to the course grade.</p>
            </div>
            <div>
              <label className="label">Release date</label>
              <input
                name="release_date"
                type="date"
                className="input"
                defaultValue={modal?.mode === "edit" && modal.assessment.release_date ? modal.assessment.release_date.slice(0, 10) : ""}
              />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              name="status"
              className="input"
              defaultValue={modal?.mode === "edit" ? modal.assessment.status : "draft"}
            >
              <option value="draft">Draft (hidden from students)</option>
              <option value="published">Published (visible to students)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary">Save assessment</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={deleteAssessment}
        title={`Delete "${toDelete?.title}"?`}
        message="This removes the assessment and every mark entered for it. Students will no longer see it. This cannot be undone."
        confirmLabel="Delete assessment"
      />
    </div>
  );
}