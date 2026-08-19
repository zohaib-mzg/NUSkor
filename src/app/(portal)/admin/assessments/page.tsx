"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderKanban, Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Assessment, Course } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TYPES = ["quiz", "assignment", "midterm", "project", "other"] as const;

export default function AssessmentsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; assessment: Assessment } | null
  >(null);
  const [toDelete, setToDelete] = useState<Assessment | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [aRes, cRes] = await Promise.all([
      supabase.from("assessments").select("*, course:courses(code)").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").eq("is_archived", false),
    ]);
    if (!aRes.error) setAssessments((aRes.data ?? []) as Assessment[]);
    if (!cRes.error) setCourses((cRes.data ?? []) as Course[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    courseFilter === "all"
      ? assessments
      : assessments.filter((a) => a.course_id === courseFilter);

  async function saveAssessment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      course_id: HTMLSelectElement;
      title: HTMLInputElement;
      type: HTMLSelectElement;
      total_marks: HTMLInputElement;
    };
    const course_id = el.course_id.value;
    const title = el.title.value.trim();
    const type = el.type.value;
    const total_marks = Number(el.total_marks.value);
    if (!course_id || !title || !total_marks) return;

    const supabase = createClient();
    if (modal?.mode === "create") {
      const { error: err } = await supabase
        .from("assessments")
        .insert({ course_id, title, type, total_marks });
      if (err) return error(err.message);
      success(`"${title}" created.`);
    } else if (modal?.mode === "edit" && modal.assessment) {
      const { error: err } = await supabase
        .from("assessments")
        .update({ course_id, title, type, total_marks })
        .eq("id", modal.assessment.id);
      if (err) return error(err.message);
      success("Assessment updated.");
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
        : t === "project"
          ? "dark"
          : "neutral";

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="Quizzes, assignments, midterms, projects: the building blocks of every marksheet."
        icon={FolderKanban}
        actions={
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New assessment
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCourseFilter("all")}
          className={courseFilter === "all" ? "btn-dark px-3 py-1.5 text-xs" : "btn-outline px-3 py-1.5 text-xs"}
        >
          All courses
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => setCourseFilter(c.id)}
            className={
              courseFilter === c.id
                ? "btn-dark px-3 py-1.5 text-xs"
                : "btn-outline px-3 py-1.5 text-xs"
            }
          >
            {c.code}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="No assessments here" description="Create one to start recording marks." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5 transition-all hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <Badge tone={typeTone(a.type) as "gold" | "blue" | "dark" | "neutral"}>{a.type}</Badge>
              </div>
              <h3 className="mt-3 font-bold text-ink">{a.title}</h3>
              <p className="text-xs font-semibold text-gold-deep">{a.course?.code ?? "Course"}</p>
              <p className="mt-2 text-sm text-ink/55">
                Total marks: <span className="font-bold text-ink">{a.total_marks}</span>
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
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "New assessment" : "Edit assessment"}
      >
        <form onSubmit={saveAssessment} className="space-y-4">
          <div>
            <label className="label">Course</label>
            <select
              name="course_id"
              className="input"
              required
              defaultValue={modal?.mode === "edit" ? modal.assessment.course_id : ""}
            >
              <option value="" disabled>
                Select a course
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
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