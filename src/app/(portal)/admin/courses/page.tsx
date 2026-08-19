"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Archive, FolderKanban, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Course } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function CoursesPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [counts, setCounts] = useState<Record<string, { assessments: number; enrollments: number }>>({});
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; course: Course } | null>(null);
  const [toArchive, setToArchive] = useState<Course | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [cRes, aRes, eRes] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("assessments").select("course_id"),
      supabase.from("enrollments").select("course_id"),
    ]);
    if (!cRes.error) setCourses((cRes.data ?? []) as Course[]);
    const aCount: Record<string, number> = {};
    if (!aRes.error) {
      (aRes.data ?? []).forEach((a: { course_id: string }) => {
        aCount[a.course_id] = (aCount[a.course_id] ?? 0) + 1;
      });
    }
    const eCount: Record<string, number> = {};
    if (!eRes.error) {
      (eRes.data ?? []).forEach((en: { course_id: string }) => {
        eCount[en.course_id] = (eCount[en.course_id] ?? 0) + 1;
      });
    }
    const merged: Record<string, { assessments: number; enrollments: number }> = {};
    [...new Set([...Object.keys(aCount), ...Object.keys(eCount)])].forEach(
      (id) =>
        (merged[id] = {
          assessments: aCount[id] ?? 0,
          enrollments: eCount[id] ?? 0,
        })
    );
    setCounts(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      code: HTMLInputElement;
      title: HTMLInputElement;
    };
    const code = el.code.value.trim().toUpperCase();
    const title = el.title.value.trim();
    if (!code || !title) return;

    const supabase = createClient();
    if (modal?.mode === "create") {
      const { error: err } = await supabase.from("courses").insert({ code, title });
      if (err) return error(err.message);
      success(`Course ${code} created.`);
    } else if (modal?.mode === "edit" && modal.course) {
      const { error: err } = await supabase
        .from("courses")
        .update({ code, title })
        .eq("id", modal.course.id);
      if (err) return error(err.message);
      success("Course updated.");
    }
    setModal(null);
    load();
  }

  async function archiveCourse() {
    if (!toArchive) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("courses")
      .update({ is_archived: true })
      .eq("id", toArchive.id);
    if (err) return error(err.message);
    success(`${toArchive.code} archived.`);
    setToArchive(null);
    load();
  }

  if (loading) return <Spinner label="Loading courses..." />;

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Create and manage the courses you teach."
        icon={BookOpen}
        actions={
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New course
          </button>
        }
      />

      {courses.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No courses yet"
            description="Create your first course to start adding assessments and students."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="card group p-5 transition-all hover:shadow-lift">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-gold">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <Badge tone={c.is_archived ? "neutral" : "green"}>
                  {c.is_archived ? "Archived" : "Active"}
                </Badge>
              </div>
              <h3 className="mt-3 text-lg font-extrabold text-ink">{c.code}</h3>
              <p className="mt-0.5 text-sm text-ink/55">{c.title}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink/50">
                <Badge tone="gold">{counts[c.id]?.assessments ?? 0} assessments</Badge>
                <Badge tone="neutral">{counts[c.id]?.enrollments ?? 0} students</Badge>
              </div>
              <div className="mt-4 flex gap-2 border-t border-black/[0.05] pt-4">
                <button
                  className="btn-outline flex-1 px-3 py-1.5 text-xs"
                  onClick={() => setModal({ mode: "edit", course: c })}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  className="btn-outline flex-1 px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                  onClick={() => setToArchive(c)}
                  disabled={c.is_archived}
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "New course" : "Edit course"}
      >
        <form onSubmit={saveCourse} className="space-y-4">
          <div>
            <label className="label">Course code</label>
            <input
              name="code"
              className="input font-mono uppercase"
              placeholder="CS301"
              required
              defaultValue={modal?.mode === "edit" ? modal.course.code : ""}
            />
          </div>
          <div>
            <label className="label">Course title</label>
            <input
              name="title"
              className="input"
              placeholder="e.g. Operating Systems"
              required
              defaultValue={modal?.mode === "edit" ? modal.course.title : ""}
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-paper p-3 text-xs text-ink/55">
            <Upload className="h-4 w-4 text-gold-deep" />
            Students, assessments and marks are added separately from the
            respective sections.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary">Save course</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toArchive}
        onClose={() => setToArchive(null)}
        onConfirm={archiveCourse}
        title={`Archive ${toArchive?.code}?`}
        message="Archived courses are hidden from new enrollments but all marks and bookings stay intact."
        confirmLabel="Archive course"
      />
    </div>
  );
}