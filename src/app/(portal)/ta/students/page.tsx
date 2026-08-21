"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Link2,
  Plus,
  Trash2,
  Copy,
  Power,
  UserPlus,
  Mail,
  Download,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseSection, Student, StudentInvite } from "@/lib/types";
import { formatDate, one, regNoDisplay } from "@/lib/utils";
import { useSemester } from "@/lib/semester";
import { useToast } from "@/components/ui/Toast";
import SemesterSelector from "@/components/SemesterSelector";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface SectionWithCourse extends CourseSection {
  course?: { code: string; title: string } | null;
}

interface EnrollmentRow {
  id: string;
  created_at: string;
  invited_by: string | null;
  student?: Student | Student[] | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}

function makeToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `NUS-${s}`;
}

export default function TaStudentsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [semester] = useSemester();
  const [sections, setSections] = useState<SectionWithCourse[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState<EnrollmentRow[]>([]);
  const [invites, setInvites] = useState<StudentInvite[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<EnrollmentRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const loadSections = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("section_tas")
      .select("section_id, section:course_sections(*, course:courses(code, title))")
      .eq("semester", semester);
    const rows = (data ?? []) as {
      section_id: string;
      section: (SectionWithCourse & { course?: { code: string; title: string }[] | null })[];
    }[];
    const secs = rows
      .map((r) => one(r.section))
      .filter((s): s is NonNullable<typeof s> => s !== null);
    setSections(secs);
    if (secs.length === 1) setSectionId(secs[0].id);
    setLoading(false);
  }, []);

  const loadSection = useCallback(async (id: string) => {
    const supabase = createClient();
    const [enRes, invRes] = await Promise.all([
supabase
        .from("enrollments")
        .select("id, created_at, invited_by, student:students(*, profiles(email, full_name)), profiles(full_name, email)")
        .eq("section_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("student_invites")
        .select("*")
        .eq("section_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (!enRes.error) setStudents((enRes.data ?? []) as EnrollmentRow[]);
    if (!invRes.error) setInvites((invRes.data ?? []) as StudentInvite[]);
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    if (sectionId) loadSection(sectionId);
  }, [sectionId, loadSection]);

  const activeSection = sections.find((s) => s.id === sectionId);

  async function addStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sectionId) return;
    const email = (
      (e.currentTarget.elements as unknown as { email: HTMLInputElement }).email
    ).value.trim();
    if (!email) return;
    const supabase = createClient();
    const { error: err } = await supabase.rpc("enroll_student_by_email", {
      p_section_id: sectionId,
      p_email: email,
    });
    if (err) return error(err.message);
    success(`Enrolled ${email}.`);
    setAddOpen(false);
    loadSection(sectionId);
  }

  async function createInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sectionId) return;
    const el = e.currentTarget.elements as unknown as {
      days: HTMLInputElement;
      max_uses: HTMLInputElement;
    };
    const days = Number(el.days.value || 7);
    const maxUsesRaw = el.max_uses.value;
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
    const expires_at = new Date(Date.now() + days * 86400000).toISOString();

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("student_invites").insert({
      token: makeToken(),
      section_id: sectionId,
      created_by_ta: user.id,
      expires_at,
      max_uses: maxUses,
    });
    if (err) return error(err.message);
    success("Invitation created. Share the link with your students.");
    setInviteOpen(false);
    loadSection(sectionId);
  }

  async function removeStudent() {
    if (!toRemove) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", toRemove.id);
    if (err) return error(err.message);
    success("Student removed from this section.");
    setToRemove(null);
    loadSection(sectionId);
  }

async function toggleInvite(invite: StudentInvite) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("student_invites")
      .update({ status: invite.status === "active" ? "inactive" : "active" })
      .eq("id", invite.id);
    if (err) return error(err.message);
    success(invite.status === "active" ? "Invitation deactivated." : "Invitation reactivated.");
    loadSection(sectionId);
  }

  async function revokeInvite(invite: StudentInvite) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("student_invites")
      .update({ status: "revoked" })
      .eq("id", invite.id);
    if (err) return error(err.message);
    success("Invitation revoked. Anyone opening it will see it is no longer valid.");
    loadSection(sectionId);
  }

async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      error("Could not copy. Copy the link manually.");
    }
  }

  function exportCsv() {
    const header = ["registration_no", "email", "full_name"];
    const lines = students.map((r) => {
      const st = studentOf(r);
      return [regNoDisplay(st?.registration_no, st?.profiles?.email), st?.profiles?.email ?? "", (st?.profiles?.full_name ?? "").replace(/"/g, '""')]
        .map((v) => `"${v}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_section_${activeSection?.section_code ?? "list"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Spinner label="Loading your sections..." />;

  const studentOf = (r: EnrollmentRow): Student | null => {
    if (!r.student) return null;
    return Array.isArray(r.student) ? (r.student[0] ?? null) : r.student;
  };

  return (
    <div>
      <PageHeader
        title="Students & Invitations"
        subtitle="Manage who is in your sections and invite students to join."
        icon={Users}
        actions={<SemesterSelector />}
      />

      {sections.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sections assigned"
            description="Ask an admin to assign you to course sections first."
          />
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSectionId(s.id)}
                className={
                  sectionId === s.id
                    ? "btn-dark px-3 py-1.5 text-xs"
                    : "btn-outline px-3 py-1.5 text-xs"
                }
              >
                {s.course?.code ?? "Course"} → {s.section_code}
              </button>
            ))}
          </div>

          {sectionId ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Enrolled students */}
              <section className="card overflow-hidden lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                  <div>
                    <h2 className="font-bold text-ink">
                      Enrolled students
                      <span className="ml-2 text-sm font-medium text-ink/45">
                        {activeSection?.course?.code ?? "Course"} →{" "}
                        {activeSection?.section_code ?? ""}
                      </span>
                    </h2>
                  </div>
<div className="flex items-center gap-2">
                  <button
                    className="btn-outline px-3 py-1.5 text-xs"
                    onClick={exportCsv}
                    disabled={students.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setAddOpen(true)}>
                    <UserPlus className="h-3.5 w-3.5" /> Add by email
                  </button>
                </div>
                </div>

                {students.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No students in this section"
                      description="Add by email or share an invitation link."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <thead className="bg-paper">
<tr>
                          <th className="th">Student</th>
                          <th className="th">Reg. No.</th>
                          <th className="th">Enrolled</th>
                          <th className="th">Invited By</th>
                          <th className="th text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((row) => {
                          const st = studentOf(row);
                          return (
                            <tr key={row.id} className="bg-white">
                              <td className="td">
                                <p className="font-semibold text-ink">
                                  {st?.profiles?.full_name || "—"}
                                </p>
                                <p className="text-xs text-ink/50">{st?.profiles?.email}</p>
                              </td>
                              <td className="td text-ink/70">{regNoDisplay(st?.registration_no, st?.profiles?.email)}</td>
                              <td className="td text-ink/70">
                                {formatDate(row.created_at)}
                              </td>
                              <td className="td text-ink/70">
                                {row.invited_by ? (
                                  <>
                                    <p className="text-sm font-medium text-ink/80">
                                      {row.profiles?.full_name || "—"}
                                    </p>
                                    <p className="text-xs text-ink/45">{row.profiles?.email}</p>
                                  </>
                                ) : (
                                  <span className="text-xs text-ink/40">—</span>
                                )}
                              </td>
                              <td className="td">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setToRemove(row)}
                                    className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Invitations */}
              <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                  <h2 className="font-bold text-ink">Invitations</h2>
                  <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setInviteOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> New invite
                  </button>
                </div>

                {invites.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No invitations yet"
                      description="Create a link; students who open it are auto-enrolled."
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-black/[0.05]">
{invites.map((inv) => {
                      const expired = inv.expires_at < new Date().toISOString();
                      const statusLabel =
                        inv.status === "active"
                          ? expired
                            ? "Expired"
                            : "Active"
                          : inv.status === "accepted"
                            ? "Accepted"
                            : inv.status === "revoked"
                              ? "Revoked"
                              : "Inactive";
                      return (
                        <li key={inv.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs font-semibold text-ink">
                                {inv.token}
                              </p>
                              <p className="mt-1 text-xs text-ink/50">
                                Expires {formatDate(inv.expires_at)}
                                {inv.max_uses
                                  ? ` · ${inv.used_count}/${inv.max_uses} used`
                                  : ` · ${inv.used_count} used`}
                              </p>
                            </div>
                            <Badge
                              tone={
                                inv.status === "active" && !expired
                                  ? "green"
                                  : inv.status === "accepted"
                                    ? "gold"
                                    : "red"
                              }
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => copyLink(inv.token)}
                              className="btn-outline flex-1 px-3 py-1.5 text-xs"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copied === inv.token ? "Copied!" : "Copy link"}
                            </button>
                            {inv.status === "active" && !expired && (
                              <button
                                onClick={() => toggleInvite(inv)}
                                className="btn-outline px-3 py-1.5 text-xs"
                                title="Deactivate"
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {inv.status === "inactive" && !expired && (
                              <button
                                onClick={() => toggleInvite(inv)}
                                className="btn-outline px-3 py-1.5 text-xs"
                                title="Reactivate"
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {(inv.status === "active" || inv.status === "inactive") &&
                              !expired && (
                                <button
                                  onClick={() => revokeInvite(inv)}
                                  className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                                  title="Revoke permanently"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
<div className="border-t border-black/[0.05] bg-paper px-5 py-3 text-xs text-ink/50">
                  Students open your <span className="font-mono">/invite/…</span> link,
                  sign in with their university Google account, and are enrolled
                  instantly — their student account is created automatically.
                </div>
              </section>
            </div>
          ) : null}
        </>
      )}

      {/* Add student modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add student by email">
        <form onSubmit={addStudent} className="space-y-4">
          <div>
            <label className="label">Student email</label>
            <input
              name="email"
              type="email"
              className="input"
              placeholder="l24xxxx@lhr.nu.edu.pk"
              required
            />
<p className="mt-1 text-xs text-ink/45">
              The student must already have a NUSkor account on the
              @lhr.nu.edu.pk domain (e.g. they joined via an invitation link).
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary">
              <Mail className="h-4 w-4" /> Enroll student
            </button>
          </div>
        </form>
      </Modal>

      {/* Create invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="New invitation link">
        <form onSubmit={createInvite} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valid for (days)</label>
              <input
                name="days"
                type="number"
                min={1}
                max={90}
                defaultValue={7}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Max uses</label>
              <input
                name="max_uses"
                type="number"
                min={1}
                className="input"
                placeholder="Unlimited"
              />
            </div>
          </div>
<div className="rounded-xl bg-gold/10 p-4 text-xs leading-relaxed text-ink/60">
            <p className="font-semibold text-gold-deep">How it works</p>
            A unique link is created. Any student who opens it and signs in with
            their university Google account is enrolled in{" "}
            {activeSection?.course?.code ?? "the section"} →{" "}
            {activeSection?.section_code ?? ""} automatically — new students are
            registered on first use.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary">
              <Link2 className="h-4 w-4" /> Create invitation
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={removeStudent}
        title="Remove this student?"
        message="They will lose access to this section's marks, evaluations and announcements. Re-enrolling is possible at any time."
        confirmLabel="Remove student"
      />
    </div>
  );
}
