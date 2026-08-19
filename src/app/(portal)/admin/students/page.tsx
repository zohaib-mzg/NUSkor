"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Pencil, Search, BookOpen, Archive, ArchiveRestore } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Student, CourseSection } from "@/lib/types";
import { cn, one } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StudentsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [enrollments, setEnrollments] = useState<
    { student_id: string; section_id: string }[]
  >([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [editing, setEditing] = useState<Student | null>(null);
  const [enrollStudent, setEnrollStudent] = useState<Student | null>(null);
  const [toArchive, setToArchive] = useState<Student | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [sRes, secRes, eRes] = await Promise.all([
      supabase
        .from("students")
        .select("*, profiles(email, full_name, created_at)"),
      supabase
        .from("course_sections")
        .select("*, course:courses(code, title)")
        .eq("status", "active")
        .order("section_code"),
      supabase.from("enrollments").select("student_id, section_id"),
    ]);
    if (!sRes.error) setStudents((sRes.data ?? []) as Student[]);
    if (!secRes.error)
      setSections((secRes.data ?? []) as CourseSection[]);
    if (!eRes.error)
      setEnrollments(
        (eRes.data ?? []) as { student_id: string; section_id: string }[]
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = students.filter((s) => {
    const q = query.toLowerCase();
    const archived = s.archived_at !== null;
    if (statusFilter === "active" && archived) return false;
    if (statusFilter === "archived" && !archived) return false;
    return (
      (s.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (s.profiles?.email ?? "").toLowerCase().includes(q) ||
      (s.registration_no ?? "").toLowerCase().includes(q)
    );
  });

  async function archiveStudent() {
    if (!toArchive) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("students")
      .update({
        archived_at: new Date().toISOString(),
        archived_by: user?.id ?? null,
      })
      .eq("id", toArchive.id);
    if (err) return error(err.message);
    success(
      `"${toArchive.profiles?.full_name ?? "Student"}" deactivated. Marks and history are preserved for auditing.`
    );
    setToArchive(null);
    load();
  }

  async function restoreStudent(s: Student) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("students")
      .update({ archived_at: null, archived_by: null })
      .eq("id", s.id);
    if (err) return error(err.message);
    success("Student restored.");
    load();
  }

  async function saveStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const supabase = createClient();
    const el = e.currentTarget.elements as unknown as {
      registration_no: HTMLInputElement;
      program: HTMLInputElement;
      semester: HTMLInputElement;
    };
    const { error: err } = await supabase
      .from("students")
      .update({
        registration_no: el.registration_no.value || null,
        program: el.program.value || null,
        semester: el.semester.value || null,
      })
      .eq("id", editing.id);
    if (err) {
      error(err.message);
      return;
    }
    success("Student record updated.");
    setEditing(null);
    load();
  }

  function toggleEnroll(studentId: string, sectionId: string) {
    const supabase = createClient();
    const currently = enrollments.some(
      (en) => en.student_id === studentId && en.section_id === sectionId
    );
    if (currently) {
      supabase
        .from("enrollments")
        .delete()
        .eq("student_id", studentId)
        .eq("section_id", sectionId)
        .then(({ error: err }) => {
          if (err) return error(`Could not unenroll: ${err.message}`);
          success("Removed from section.");
          load();
        });
    } else {
      supabase
        .from("enrollments")
        .insert({ student_id: studentId, section_id: sectionId })
        .then(({ error: err }) => {
          if (err) return error(`Could not enroll: ${err.message}`);
          success("Enrolled in section.");
          load();
        });
    }
  }

  if (loading) return <Spinner label="Loading students..." />;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Profiles are created automatically at first sign-in. Edit their academic details and enroll them in sections."
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border border-black/[0.1]">
              {(["active", "archived", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                    statusFilter === f
                      ? "bg-gold text-ink"
                      : "bg-white text-ink/50 hover:text-ink"
                  )}
                >
                  {f === "active" ? "Active" : f === "archived" ? "Deactivated" : "All"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input
                className="input pl-9 sm:w-72"
                placeholder="Search name, email, reg #..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        }
      />

      {students.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No students yet"
            description="When students sign in with their @lhr.nu.edu.pk Google account, their profile appears here automatically."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-paper">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Registration #</th>
                  <th className="th">Program</th>
                  <th className="th">Semester</th>
                  <th className="th">Courses</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const enrolled = sections.filter((sec) =>
                    enrollments.some(
                      (en) => en.student_id === s.id && en.section_id === sec.id
                    )
                  );
                  return (
                    <tr key={s.id} className="bg-white">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-deep">
                            {(s.profiles?.full_name ?? s.profiles?.email ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">
                              {s.profiles?.full_name ?? "Unnamed student"}
                            </p>
                            <p className="text-xs text-ink/50">{s.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td font-mono text-xs text-ink/70">
                        {s.registration_no ?? "N/A"}
                      </td>
                      <td className="td">{s.program ?? "N/A"}</td>
                      <td className="td">{s.semester ?? "N/A"}</td>
                      <td className="td">
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {enrolled.length === 0 ? (
                            <span className="text-xs text-ink/35">Not enrolled</span>
                          ) : (
                            enrolled.map((sec) => (
                              <Badge key={sec.id} tone="neutral">
                                {one(sec.course)?.code} · {sec.section_code}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="td">
                        {s.archived_at ? (
                          <Badge tone="red">Deactivated</Badge>
                        ) : (
                          <Badge tone="green">Active</Badge>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          {s.archived_at ? (
                            <button
                              onClick={() => restoreStudent(s)}
                              className="btn-outline px-3 py-1.5 text-xs text-green-700 hover:border-green-300 hover:bg-green-50"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEnrollStudent(s)}
                                className="btn-outline px-3 py-1.5 text-xs"
                              >
                                <BookOpen className="h-3.5 w-3.5" /> Enroll
                              </button>
                              <button
                                onClick={() => setEditing(s)}
                                className="btn-outline px-3 py-1.5 text-xs"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => setToArchive(s)}
                                className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="td text-center text-ink/40">
                      No students match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit student modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit · ${editing?.profiles?.full_name ?? "Student"}`}
      >
        {editing && (
          <form onSubmit={saveStudent} className="space-y-4">
            <div className="rounded-lg bg-paper p-3 text-xs text-ink/55">
              Email: <span className="font-semibold text-ink">{editing.profiles?.email}</span>
            </div>
            <div>
              <label className="label">Registration number</label>
              <input
                name="registration_no"
                className="input"
                placeholder="e.g. 2420213"
                defaultValue={editing.registration_no ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Program</label>
                <input
                  name="program"
                  className="input"
                  placeholder="e.g. BSCS"
                  defaultValue={editing.program ?? ""}
                />
              </div>
              <div>
                <label className="label">Semester</label>
                <input
                  name="semester"
                  className="input"
                  placeholder="e.g. 3rd"
                  defaultValue={editing.semester ?? ""}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-outline" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Enroll modal */}
      <Modal
        open={!!enrollStudent}
        onClose={() => setEnrollStudent(null)}
        title={`Enroll · ${enrollStudent?.profiles?.full_name ?? "Student"}`}
        wide
      >
        {enrollStudent && (
          <div>
            <p className="mb-4 text-sm text-ink/55">
              Toggle sections to enroll or unenroll this student.
            </p>
            {sections.length === 0 ? (
              <EmptyState
                title="No sections yet"
                description="Create courses and sections first, then come back to enroll students."
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {sections.map((sec) => {
                  const active = enrollments.some(
                    (en) =>
                      en.student_id === enrollStudent.id && en.section_id === sec.id
                  );
                  const course = one(sec.course);
                  return (
                    <button
                      key={sec.id}
                      onClick={() => toggleEnroll(enrollStudent.id, sec.id)}
                      className={
                        active
                          ? "flex items-center justify-between rounded-xl border-2 border-gold bg-gold/10 p-3 text-left"
                          : "flex items-center justify-between rounded-xl border border-black/[0.08] bg-white p-3 text-left hover:border-black/20"
                      }
                    >
                      <span>
                        <span className="block text-sm font-bold text-ink">
                          {course?.code ?? "Course"} · Section {sec.section_code}
                        </span>
                        <span className="block text-xs text-ink/50">
                          {course?.title ?? ""} {sec.semester ?? ""} {sec.academic_year ?? ""}
                        </span>
                      </span>
                      <Badge tone={active ? "gold" : "neutral"}>
                        {active ? "Enrolled" : "Not enrolled"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button className="btn-dark" onClick={() => setEnrollStudent(null)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    {/* Archive confirmation */}
      <ConfirmDialog
        open={!!toArchive}
        onClose={() => setToArchive(null)}
        onConfirm={archiveStudent}
        title="Are you sure you want to delete this student?"
        message={`"${toArchive?.profiles?.full_name ?? "This student"}" will be deactivated and removed from all active lists, TA views, bookings and exports. Their marks and academic history are preserved and can be restored by an admin at any time.`}
        confirmLabel="Deactivate student"
      />
    </div>
  );
}