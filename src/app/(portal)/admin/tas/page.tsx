"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  BadgeCheck,
  XCircle,
  UserPlus,
  ShieldCheck,
  Layers,
  Plus,
  Trash2,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, TaApplication, CourseSection, SectionRequest } from "@/lib/types";
import { cleanName, courseSection, one } from "@/lib/utils";
import { currentSemester, semesterOptions } from "@/lib/semester";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface TaWithSections {
  profile: Profile;
  assignments: {
    id: string;
    sectionId: string;
    sectionCode: string;
    courseCode: string;
    semester: string;
  }[];
}

export default function TaManagementPage() {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TaApplication[]>([]);
  const [taList, setTaList] = useState<TaWithSections[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [semester, setSemester] = useState(currentSemester());
  const [histSems, setHistSems] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [rejecting, setRejecting] = useState<TaApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [sectionRequests, setSectionRequests] = useState<SectionRequest[]>([]);
  const [assignTarget, setAssignTarget] = useState<TaWithSections | null>(null);
  const [assignSectionId, setAssignSectionId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    taId: string;
    taName: string;
    sectionLabel: string;
    assignmentId: string;
  } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();

    const [appRes, profileRes, stRes, secRes, semRes, srRes] = await Promise.all([
      supabase
        .from("ta_applications")
        .select("*")
        .order("requested_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at"),
      supabase
        .from("section_tas")
        .select("id, ta_id, section_id, semester"),
      supabase
        .from("course_sections")
        .select("id, section_code, course:courses(code), semester")
        .eq("status", "active"),
      supabase
        .from("section_tas")
        .select("semester"),
      supabase
        .from("section_requests")
        .select("*, profiles:ta_id(full_name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    setLoading(false);

    if (!appRes.error)
      setApplications((appRes.data ?? []) as TaApplication[]);

    const allProfiles = (profileRes.data ?? []) as Profile[];
    const allSt = (stRes.data ?? []) as {
      id: string;
      ta_id: string;
      section_id: string;
      semester: string;
    }[];
    const allSec = (secRes.data ?? []) as (CourseSection & {
      course?: { code: string }[] | null;
      semester: string | null;
    })[];
    setSections(
      allSec.map((s) => ({
        ...s,
        course: one(s.course) ? [one(s.course)!] : null,
      })) as CourseSection[]
    );

    // Build TA list: all profiles that are TAs or have section_tas rows
    const taProfileIds = new Set(
      allProfiles.filter((p) => p.role === "ta").map((p) => p.id)
    );
    allSt.forEach((st) => taProfileIds.add(st.ta_id));

    const tas = allProfiles.filter((p) => taProfileIds.has(p.id));

    const taWithSections: TaWithSections[] = tas.map((t) => {
      const assignments = allSt
        .filter((st) => st.ta_id === t.id)
        .map((st) => {
          const sec = allSec.find((s) => s.id === st.section_id);
          const course = sec ? one(sec.course) : null;
          return {
            id: st.id,
            sectionId: st.section_id,
            sectionCode: sec?.section_code ?? "?",
            courseCode: course?.code ?? "?",
            semester: st.semester,
          };
        });
      return { profile: t, assignments };
    });

    setTaList(taWithSections);

    // Extract distinct semesters for dropdown
    const sems = new Set<string>();
    (semRes.data ?? []).forEach((r: { semester: string }) => {
      if (r.semester) sems.add(r.semester);
    });
    setHistSems(Array.from(sems));

    // Section requests
    if (!srRes.error) {
      setSectionRequests((srRes.data ?? []) as unknown as SectionRequest[]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(app: TaApplication) {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const { error: appErr } = await supabase
      .from("ta_applications")
      .update({
        status: "approved",
        reviewed_by: user?.id ?? null,
        reviewed_at: now,
      })
      .eq("id", app.id);
    if (appErr) {
      setBusy(false);
      return error(appErr.message);
    }
    if (app.user_id) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ role: "ta" })
        .eq("id", app.user_id);
      if (profileErr) {
        setBusy(false);
        return error(profileErr.message);
      }
    }
    setBusy(false);
    success(`${cleanName(app.full_name) || app.email} is now a TA.`);
    load();
  }

  async function reject() {
    if (!rejecting) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("ta_applications")
      .update({
        status: "rejected",
        rejection_reason: rejectReason.trim() || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejecting.id);
    setBusy(false);
    setRejecting(null);
    setRejectReason("");
    if (err) return error(err.message);
    success("Application rejected.");
    load();
  }

  async function addTa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const email = addEmail.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("email", email)
      .maybeSingle();

    if (!existing) {
      setBusy(false);
      return error(
        "No account found for that email. The person must sign in at least once first."
      );
    }
    if ((existing as Profile).role === "ta") {
      setBusy(false);
      return info("That user is already a TA.");
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({ role: "ta" })
      .eq("id", existing.id);
    setBusy(false);
    if (err) return error(err.message);
    success(
      `${cleanName((existing as Profile).full_name) || email} is now a TA.`
    );
    setAddOpen(false);
    setAddEmail("");
    load();
  }

  async function assignSection() {
    if (!assignTarget || !assignSectionId) return;
    setBusy(true);
    const supabase = createClient();

    const { error: err } = await supabase
      .from("section_tas")
      .insert({
        ta_id: assignTarget.profile.id,
        section_id: assignSectionId,
        semester,
      });

    setBusy(false);
    if (err) {
      if (err.message.includes("3 sections")) {
        return error(
          `Maximum of 3 sections per semester reached for this TA.`
        );
      }
      if (err.message.includes("unique")) {
        return error(
          `This section is already assigned to a TA for ${semester}.`
        );
      }
      return error(err.message);
    }
    success("Section assigned.");
    setAssignTarget(null);
    setAssignSectionId("");
    load();
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("section_tas")
      .delete()
      .eq("id", removeTarget.assignmentId);
    setBusy(false);
    setRemoveTarget(null);
    if (err) return error(err.message);
    success("TA removed from section.");
    load();
  }

  async function approveSectionRequest(req: SectionRequest) {
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("section_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    if (err) {
      setBusy(false);
      return error(err.message);
    }
    success(`Section request for ${req.course_code} approved. Assign the TA from the section list below.`);
    setBusy(false);
    load();
  }

  async function rejectSectionRequest(req: SectionRequest) {
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("section_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    if (err) {
      setBusy(false);
      return error(err.message);
    }
    success("Section request rejected.");
    setBusy(false);
    load();
  }

  if (loading) return <Spinner label="Loading TA management..." />;

  const pending = applications.filter((a) => a.status === "pending");

  const options = semesterOptions(histSems);

  return (
    <div>
      <PageHeader
        title="TA Management"
        subtitle="Approve applications, assign sections per semester, and manage active TAs."
        icon={Users}
        actions={
          <button
            className="btn-primary"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="h-4 w-4" /> Add TA
          </button>
        }
      />

      {/* Pending applications */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-gold-deep" />{" "}
            Pending applications
          </h2>
          <Badge tone="gold">{pending.length} pending</Badge>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            title="No pending applications"
            description="When someone applies for TA access, their request shows up here."
          />
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {pending.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 bg-white px-5 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-deep">
                  {cleanName(a.full_name || a.email)
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {cleanName(a.full_name) || "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-ink/50">
                    {a.email}
                    {a.course_code ? ` · ${a.course_code}` : ""}
                    {a.semester ? ` · ${a.semester}` : ""}
                    {a.year ? ` ${a.year}` : ""}
                    {" · "}
                    {new Date(a.requested_at).toLocaleDateString()}
                  </p>
                  {a.notes && (
                    <p className="mt-0.5 truncate text-xs text-ink/40 italic">
                      {a.notes}
                    </p>
                  )}
                </div>
                <button
                  className="btn-dark px-3 py-1.5 text-xs"
                  onClick={() => approve(a)}
                  disabled={busy}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />{" "}
                  Approve
                </button>
                <button
                  className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                  onClick={() => setRejecting(a)}
                  disabled={busy}
                >
                  <XCircle className="h-3.5 w-3.5" />{" "}
                  Reject
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section requests from TAs */}
      {sectionRequests.length > 0 && (
        <section className="card mb-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <BookOpen className="h-4 w-4 text-gold-deep" />{" "}
              Section requests
            </h2>
            <Badge tone="gold">{sectionRequests.length} pending</Badge>
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {sectionRequests.map((r) => {
              const taProfile = r.profiles as { full_name?: string | null; email?: string } | null;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 bg-white px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {cleanName(taProfile?.full_name) || taProfile?.email || "TA"}
                    </p>
                    <p className="text-xs text-ink/50">
                      Wants <span className="font-semibold text-ink">{r.course_code}</span> · {r.semester} {r.year}
                      {r.notes && <span className="italic text-ink/40"> — {r.notes}</span>}
                    </p>
                  </div>
                  <button
                    className="btn-dark px-3 py-1.5 text-xs"
                    onClick={() => approveSectionRequest(r)}
                    disabled={busy}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                    onClick={() => rejectSectionRequest(r)}
                    disabled={busy}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Semester selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-semibold text-ink">
          Semester:
        </label>
        <select
          className="input w-auto"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Active TAs */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Layers className="h-4 w-4 text-gold-deep" />{" "}
            Active TAs — {semester}
          </h2>
          <Badge tone="neutral">{taList.length} TAs</Badge>
        </div>
        {taList.length === 0 ? (
          <EmptyState
            title="No TAs yet"
            description="Approve applications above or add a TA directly."
          />
        ) : (
          <div className="divide-y divide-black/[0.05]">
            {taList.map((ta) => {
              const semAssignments = ta.assignments.filter(
                (a) => a.semester === semester
              );
              const isFull = semAssignments.length >= 3;
              return (
                <div
                  key={ta.profile.id}
                  className="bg-white px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {cleanName(ta.profile.full_name) || "Unnamed"}
                      </p>
                      <p className="text-xs text-ink/50">
                        {ta.profile.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={isFull ? "red" : "gold"}
                      >
                        {semAssignments.length}/3 sections
                      </Badge>
                      <button
                        className="btn-outline px-3 py-1.5 text-xs"
                        onClick={() =>
                          setAssignTarget(ta)
                        }
                        disabled={isFull}
                      >
                        <Plus className="h-3.5 w-3.5" />{" "}
                        Assign Section
                      </button>
                    </div>
                  </div>
                  {semAssignments.length === 0 ? (
                    <p className="mt-2 text-xs text-ink/40">
                      No sections assigned for{" "}
                      {semester}.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {semAssignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-paper/60 px-3 py-1.5 text-xs"
                        >
                          <span className="font-medium text-ink/70">
                            {a.courseCode} →{" "}
                            {a.sectionCode}
                          </span>
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() =>
                              setRemoveTarget({
                                taId: ta.profile.id,
                                taName:
                                  cleanName(ta.profile.full_name) ||
                                  "TA",
                                sectionLabel: `${a.courseCode} → ${a.sectionCode}`,
                                assignmentId: a.id,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Assign section modal */}
      <Modal
        open={!!assignTarget}
        onClose={() => {
          setAssignTarget(null);
          setAssignSectionId("");
        }}
        title={`Assign section to ${cleanName(assignTarget?.profile.full_name) || "TA"}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink/60">
            Semester: <span className="font-semibold">{semester}</span> ·{" "}
            Current:{" "}
            <span className="font-semibold">
              {assignTarget?.assignments.filter((a) => a.semester === semester).length ?? 0}/3
            </span>{" "}
            sections
          </p>
          <div>
            <label className="label">Section</label>
            <select
              className="input"
              value={assignSectionId}
              onChange={(e) =>
                setAssignSectionId(e.target.value)
              }
            >
              <option value="">Select a section</option>
              {sections
                .filter(
                  (s) =>
                    !assignTarget?.assignments.some(
                      (a) =>
                        a.sectionId === s.id &&
                        a.semester === semester
                    )
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {courseSection(
                      one(s.course)?.code,
                      s.section_code
                    )}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-outline"
              onClick={() => {
                setAssignTarget(null);
                setAssignSectionId("");
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={assignSection}
              disabled={busy || !assignSectionId}
            >
              {busy ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add TA modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a TA"
      >
        <form onSubmit={addTa} className="space-y-4">
          <div>
            <label className="label">NU email</label>
            <input
              className="input"
              type="email"
              placeholder="e.g. l242531@lhr.nu.edu.pk"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
            />
            <p className="mt-2 text-xs text-ink/45">
              The person must have signed in at least once
              so an account exists. If they were a student,
              their role is upgraded to TA.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Adding..." : "Add TA"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${cleanName(rejecting?.full_name) || rejecting?.email || ""}?`}
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Reason (optional, shown to applicant)
            </label>
            <textarea
              className="input min-h-24"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. No TA slots available this semester"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="btn-outline"
              onClick={() => setRejecting(null)}
            >
              Cancel
            </button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={reject}
              disabled={busy}
            >
              {busy
                ? "Rejecting..."
                : "Reject application"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove TA from section confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title={`Remove ${removeTarget?.taName}?`}
        message={`Remove ${removeTarget?.taName} from ${removeTarget?.sectionLabel}? They will lose access to that section's students, marks, and evaluations.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
