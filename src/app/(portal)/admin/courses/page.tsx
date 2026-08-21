"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Archive,
  FolderKanban,
  Layers,
  UserRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Course, CourseSection, Profile } from "@/lib/types";
import { cleanName, one } from "@/lib/utils";
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
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [tas, setTas] = useState<Profile[]>([]);
  const [sectionTas, setSectionTas] = useState<{ section_id: string; ta_id: string }[]>([]);
  const [counts, setCounts] = useState<Record<string, { assessments: number; students: number }>>({});
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; course: Course } | null>(null);
  const [sectionModal, setSectionModal] = useState<Course | null>(null);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
  const [toArchive, setToArchive] = useState<Course | null>(null);
  const [assignSection, setAssignSection] = useState<CourseSection | null>(null);
  const [newSectionTa, setNewSectionTa] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [cRes, secRes, taRes, stRes, aRes, eRes] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase
        .from("course_sections")
        .select("*, course:courses(code, title)")
        .order("section_code"),
      supabase.from("profiles").select("id, email, full_name, role").eq("role", "ta"),
      supabase.from("section_tas").select("section_id, ta_id"),
      supabase.from("assessments").select("section_id"),
      supabase.from("enrollments").select("section_id"),
    ]);
    if (!cRes.error) setCourses((cRes.data ?? []) as Course[]);
    if (!secRes.error) setSections((secRes.data ?? []) as CourseSection[]);
    if (!taRes.error) setTas((taRes.data ?? []) as Profile[]);
    if (!stRes.error)
      setSectionTas(
        (stRes.data ?? []) as { section_id: string; ta_id: string }[]
      );

    const aCount: Record<string, number> = {};
    (aRes.data ?? []).forEach((a: { section_id: string }) => {
      aCount[a.section_id] = (aCount[a.section_id] ?? 0) + 1;
    });
    const eCount: Record<string, number> = {};
    (eRes.data ?? []).forEach((en: { section_id: string }) => {
      eCount[en.section_id] = (eCount[en.section_id] ?? 0) + 1;
    });
    const merged: Record<string, { assessments: number; students: number }> = {};
    [...new Set([...Object.keys(aCount), ...Object.keys(eCount)])].forEach(
      (id) =>
        (merged[id] = {
          assessments: aCount[id] ?? 0,
          students: eCount[id] ?? 0,
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

  async function saveSection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      section_code: HTMLInputElement;
      semester: HTMLInputElement;
      academic_year: HTMLInputElement;
    };
    const courseId = editingSection ? editingSection.course_id : sectionModal?.id;
    if (!courseId) return;
    const payload = {
      course_id: courseId,
      section_code: el.section_code.value.trim().toUpperCase(),
      semester: el.semester.value.trim() || null,
      academic_year: el.academic_year.value.trim() || null,
    };

    const supabase = createClient();
    if (editingSection) {
      const { error: err } = await supabase
        .from("course_sections")
        .update(payload)
        .eq("id", editingSection.id);
      if (err) return error(err.message);
      success("Section updated.");
    } else {
      const { error: err } = await supabase.from("course_sections").insert(payload);
      if (err) return error(err.message);
      success("Section created.");
    }
    setSectionModal(null);
    setEditingSection(null);
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

  async function archiveSection(section: CourseSection) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("course_sections")
      .update({ status: "archived" })
      .eq("id", section.id);
    if (err) return error(err.message);
    success(`Section ${section.section_code} archived.`);
    load();
  }

  async function assignTa() {
    if (!assignSection || !newSectionTa) return;
    const supabase = createClient();
    // One TA per section: replace any existing assignment.
    await supabase.from("section_tas").delete().eq("section_id", assignSection.id);
    const { error: err } = await supabase
      .from("section_tas")
      .insert({ section_id: assignSection.id, ta_id: newSectionTa });
    if (err) return error(err.message);
    success("TA assigned to section.");
    setNewSectionTa("");
    load();
  }

  async function unassignTa(sectionId: string, taId: string) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("section_tas")
      .delete()
      .eq("section_id", sectionId)
      .eq("ta_id", taId);
    if (err) return error(err.message);
    success("TA removed from section.");
    load();
  }

  if (loading) return <Spinner label="Loading courses..." />;

  const sectionsFor = (courseId: string) =>
    sections.filter((s) => s.course_id === courseId && s.status !== "archived");
  const tasFor = (sectionId: string) =>
    sectionTas
      .filter((st) => st.section_id === sectionId)
      .map((st) => tas.find((t) => t.id === st.ta_id))
      .filter((t): t is Profile => !!t);

  return (
    <div>
      <PageHeader
        title="Courses & Sections"
        subtitle="Create courses, add sections, and assign exactly one TA per section."
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
            description="Create your first course to start adding sections and students."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const courseSections = sectionsFor(c.id);
            return (
              <div key={c.id} className="card p-5 transition-all hover:shadow-lift">
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

                <div className="mt-4 space-y-2">
                  {courseSections.length === 0 ? (
                    <p className="rounded-lg bg-paper p-3 text-xs text-ink/45">
                      No sections yet.
                    </p>
                  ) : (
                    courseSections.map((s) => {
                      const sectionTas = tasFor(s.id);
                      return (
                        <div key={s.id} className="rounded-xl border border-black/[0.07] bg-paper p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-ink">
                              Section {s.section_code}
                              <span className="ml-2 text-xs font-normal text-ink/45">
                                {s.semester ?? ""} {s.academic_year ?? ""}
                              </span>
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                className="rounded-md p-1 text-ink/40 hover:bg-black/5 hover:text-ink"
                                onClick={() => {
                                  setEditingSection(s);
                                  setSectionModal(c);
                                }}
                                aria-label="Edit section"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="rounded-md p-1 text-ink/40 hover:bg-black/5 hover:text-red-600"
                                onClick={() => archiveSection(s)}
                                aria-label="Archive section"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {sectionTas.length === 0 ? (
                              <span className="text-xs text-ink/40">No TAs assigned</span>
                            ) : (
                              sectionTas.map((t) => (
                                <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">
                                  <UserRound className="h-3 w-3 text-gold" />
                                  {cleanName(t.full_name) || t.email}
                                  <button
                                    onClick={() => unassignTa(s.id, t.id)}
                                    className="text-white/50 hover:text-white"
                                    aria-label={`Remove ${t.email}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-ink/45">
                              {counts[s.id]?.students ?? 0} students ·{" "}
                              {counts[s.id]?.assessments ?? 0} assessments
                            </span>
                            <button
                              className="text-xs font-semibold text-gold-deep hover:underline"
                              onClick={() => {
                                setAssignSection(s);
                                setNewSectionTa("");
                              }}
                            >
                              Assign TA
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-black/[0.05] pt-4">
                  <button
                    className="btn-outline flex-1 px-3 py-1.5 text-xs"
                    onClick={() => {
                      setEditingSection(null);
                      setSectionModal(c);
                    }}
                  >
                    <Layers className="h-3.5 w-3.5" /> Add section
                  </button>
                  <button
                    className="btn-outline px-3 py-1.5 text-xs"
                    onClick={() => setModal({ mode: "edit", course: c })}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                    onClick={() => setToArchive(c)}
                    disabled={c.is_archived}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course modal */}
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
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary">Save course</button>
          </div>
        </form>
      </Modal>

      {/* Section modal */}
      <Modal
        open={!!sectionModal}
        onClose={() => {
          setSectionModal(null);
          setEditingSection(null);
        }}
        title={editingSection ? "Edit section" : `Add section · ${sectionModal?.code ?? ""}`}
      >
        <form onSubmit={saveSection} className="space-y-4">
          <div>
            <label className="label">Section code</label>
            <input
              name="section_code"
              className="input font-mono uppercase"
              placeholder="A"
              required
              defaultValue={editingSection?.section_code ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Semester</label>
              <input
                name="semester"
                className="input"
                placeholder="e.g. Fall"
                defaultValue={editingSection?.semester ?? ""}
              />
            </div>
            <div>
              <label className="label">Academic year</label>
              <input
                name="academic_year"
                className="input"
                placeholder="e.g. 2026"
                defaultValue={editingSection?.academic_year ?? ""}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setSectionModal(null);
                setEditingSection(null);
              }}
            >
              Cancel
            </button>
            <button className="btn-primary">Save section</button>
          </div>
        </form>
      </Modal>

      {/* Assign TA modal */}
      <Modal
        open={!!assignSection}
        onClose={() => setAssignSection(null)}
        title={`Assign TA · ${assignSection?.section_code ?? ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink/55">
            Assign one or more TAs to{" "}
            {one(assignSection?.course)?.code ?? "this section"} — Section{" "}
            {assignSection?.section_code ?? ""}. All assigned TAs get access to
            this section&apos;s students and data.
          </p>
          {tas.length === 0 ? (
            <EmptyState
              title="No TAs available"
              description="Add TAs from TA Management first."
            />
          ) : (
            <select className="input" value={newSectionTa} onChange={(e) => setNewSectionTa(e.target.value)}>
              <option value="">Select a TA...</option>
              {tas.map((t) => (
                <option key={t.id} value={t.id}>
                   {cleanName(t.full_name) || t.email} · {t.email}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-3">
            <button className="btn-outline" onClick={() => setAssignSection(null)}>
              Close
            </button>
            <button className="btn-primary" onClick={assignTa} disabled={!newSectionTa}>
              Assign TA
            </button>
          </div>
        </div>
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