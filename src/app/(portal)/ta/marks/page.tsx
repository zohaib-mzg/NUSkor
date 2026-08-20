"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, Upload, FileSpreadsheet, UserCheck, UserX, AlertTriangle, Download, FileDown, Loader2 } from "lucide-react";import { createClient } from "@/lib/supabase/client";
import { notifyAll } from "@/lib/push";
import type { Assessment, CourseSection, Student } from "@/lib/types";
import { one, parseCsv } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

interface EnrolledStudent extends Student {
  mark: string;
  saved: number | null;
}

export default function TaMarksPage() {
  const { success, error, info } = useToast();
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [rows, setRows] = useState<EnrolledStudent[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

const load = useCallback(async () => {
    const supabase = createClient();
    const { data: stRes } = await supabase
      .from("section_tas")
      .select("section_id, section:course_sections(*, course:courses(code, title))");
    const rows = (stRes ?? []) as {
      section_id: string;
      section: (CourseSection & { course?: { code: string; title: string }[] | null })[];
    }[];
    const secs = rows
      .map((r) => one(r.section))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => s as CourseSection);
    setSections(secs);

    const ids = secs.map((s) => s.id);
    if (ids.length === 0) return;
    const { data: aRes } = await supabase
      .from("assessments")
      .select("id, section_id, title, type, total_marks, weightage, status, release_date")
      .in("section_id", ids);
    setAssessments((aRes ?? []) as Assessment[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!sectionId) {
      setAssessmentId("");
      setRows([]);
      return;
    }
    setAssessmentId("");
    setRows([]);
  }, [sectionId]);

  const loadMarks = useCallback(async (assId: string) => {
    const supabase = createClient();
    const [enRes, markRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("student_id, student:students(*, profiles(email, full_name))")
        .eq("section_id", sectionId),
      supabase
        .from("marks")
        .select("student_id, obtained")
        .eq("assessment_id", assId),
    ]);
    if (enRes.error || markRes.error) return;

    const markByStudent = new Map(
      (markRes.data ?? []).map((m) => [m.student_id, Number(m.obtained)])
    );

    const students = (enRes.data ?? [])
      .map((en: { student?: Student[] | Student | null }) =>
        Array.isArray(en.student) ? en.student[0] ?? null : (en.student ?? null)
      )
      .filter((s): s is Student => !!s);

    setRows(
      students.map((st) => ({
        ...st,
        mark: markByStudent.has(st.id) ? String(markByStudent.get(st.id)) : "",
        saved: markByStudent.get(st.id) ?? null,
      }))
    );
    setDirty(false);
  }, [sectionId]);

  useEffect(() => {
    if (assessmentId) loadMarks(assessmentId);
  }, [assessmentId, loadMarks]);

  const selectedAssessment = assessments.find((a) => a.id === assessmentId);

  async function notifyMarksReleased(assessment: Assessment) {
    if (assessment.status !== "published") return;
    const today = new Date().toISOString().slice(0, 10);
    if (assessment.release_date && assessment.release_date > today) return;
    try {
      await notifyAll("marks_released", assessment.id);
    } catch (err) {
      console.error("marks notification failed", err);
    }
  }

  function applyRowMark(id: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, mark: value } : r))
    );
    setDirty(true);
  }

  async function saveAll() {
    if (!selectedAssessment || rows.length === 0) return;
    setSaving(true);
    const supabase = createClient();

    const toRemove = rows.filter(
      (r) => r.saved !== null && r.mark.trim() === ""
    );
    const toUpdate = rows.filter(
      (r) =>
        r.mark.trim() !== "" &&
        Number(r.mark) !== r.saved &&
        !isNaN(Number(r.mark)) &&
        Number(r.mark) >= 0 &&
        Number(r.mark) <= selectedAssessment.total_marks
    );

    for (const r of toRemove) {
      const { error: err } = await supabase
        .from("marks")
        .delete()
        .eq("student_id", r.id)
        .eq("assessment_id", selectedAssessment.id);
      if (err) {
        error(err.message);
        setSaving(false);
        return;
      }
    }

    for (const r of toUpdate) {
      const { error: err } = await supabase
        .from("marks")
        .upsert(
          {
            student_id: r.id,
            assessment_id: selectedAssessment.id,
            obtained: Number(r.mark),
          },
          { onConflict: "student_id,assessment_id" }
        );
      if (err) {
        error(err.message);
        setSaving(false);
        return;
      }
    }

setSaving(false);
    const changes = toRemove.length + toUpdate.length;
    if (changes === 0) {
      info("Nothing to save. Marks are already up to date.");
    } else {
      success(`Saved ${toUpdate.length} and removed ${toRemove.length} mark${changes === 1 ? "" : "s"}.`);
      await notifyMarksReleased(selectedAssessment);
    }
    await loadMarks(selectedAssessment.id);
  }

async function exportOneAssessment() {
    if (!selectedAssessment || rows.length === 0) return;
    setExportBusy(true);
    try {
      const { exportOneAssessment } = await import("@/lib/excel");
      const section = sections.find((s) => s.id === sectionId);
      const course = section ? one(section.course) : null;
      exportOneAssessment(
        {
          courseCode: course?.code ?? "",
          courseTitle: course?.title ?? "",
          sectionCode: section?.section_code ?? "",
          students: rows.map((r) => ({
            id: r.id,
            registration_no: r.registration_no,
            full_name: r.profiles?.full_name ?? "",
          })),
          marksByStudent: new Map(
            rows.map((r) => [
              r.id,
              new Map([
                [
                  selectedAssessment.id,
                  r.saved !== null
                    ? r.saved
                    : r.mark.trim() !== ""
                      ? Number(r.mark)
                      : null,
                ],
              ]),
            ])
          ),
        },
        selectedAssessment,
        `${(course?.code ?? "Section").replace(/[^\w]+/g, "_")}_Section_${section?.section_code ?? ""}_${selectedAssessment.title.replace(/[^\w]+/g, "_")}.xlsx`
      );
    } finally {
      setExportBusy(false);
    }
  }

  async function exportSectionWorkbook(mode: "entire" | "completed") {
    if (!sectionId) return;
    const secAssessments = assessments.filter((a) => a.section_id === sectionId);
    if (secAssessments.length === 0) return error("This section has no assessments.");
    setExportBusy(true);
    try {
      const supabase = createClient();
      const [enRes, markRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("student_id, student:students(*, profiles(email, full_name))")
          .eq("section_id", sectionId),
        supabase
          .from("marks")
          .select("student_id, assessment_id, obtained")
          .in(
            "assessment_id",
            secAssessments.map((a) => a.id)
          ),
      ]);
      if (enRes.error || markRes.error) {
        error(enRes.error?.message ?? markRes.error?.message ?? "Export failed.");
        return;
      }

      const students = (enRes.data ?? [])
        .map((en: { student?: (import("@/lib/types").Student & { profiles?: { email?: string; full_name?: string } })[] | null }) =>
          Array.isArray(en.student) ? en.student[0] ?? null : (en.student ?? null)
        )
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const marksByStudent = new Map<string, Map<string, number | null>>();
      for (const m of markRes.data ?? []) {
        if (!marksByStudent.has(m.student_id)) marksByStudent.set(m.student_id, new Map());
        marksByStudent.get(m.student_id)!.set(m.assessment_id, Number(m.obtained));
      }

      const withMarks = secAssessments.filter((a) =>
        (markRes.data ?? []).some((m) => m.assessment_id === a.id)
      );
      const include = mode === "entire" ? secAssessments : withMarks;
      if (include.length === 0) return error("No released assessments with marks to export.");

      const section = sections.find((s) => s.id === sectionId);
      const course = section ? one(section.course) : null;
      const { exportAllAssessments } = await import("@/lib/excel");
      exportAllAssessments(
        {
          courseCode: course?.code ?? "",
          courseTitle: course?.title ?? "",
          sectionCode: section?.section_code ?? "",
          students: students.map((s) => ({
            id: s.id,
            registration_no: s.registration_no,
            full_name: s.profiles?.full_name ?? "",
          })),
          marksByStudent,
        },
        include,
        `${(course?.code ?? "Section").replace(/[^\w]+/g, "_")}_Section_${section?.section_code ?? ""}_${mode === "entire" ? "All_Marks" : "Completed_Assessments"}.xlsx`
      );
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Marks"
        subtitle="Enter marks per assessment, or bulk-import from a CSV file."
        icon={Star}
        actions={
          <button className="btn-primary" onClick={() => setCsvOpen(true)} disabled={!assessmentId}>
            <Upload className="h-4 w-4" /> CSV import
          </button>
        }
      />

      {/* Selectors */}
      <div className="card mb-6 grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label">Section</label>
          <select
            className="input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">Select a section</option>
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
          <label className="label">Assessment</label>
          <select
            className="input"
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            disabled={!sectionId}
          >
            <option value="">
              {sectionId ? "Select an assessment" : "Choose a section first"}
            </option>
            {assessments
              .filter((a) => a.section_id === sectionId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.type}, {a.total_marks} marks)
                </option>
              ))}
          </select>
        </div>
      </div>

      {!assessmentId ? (
        <div className="card">
          <EmptyState
            title="Pick a section and assessment"
            description="Then edit marks inline or upload a CSV of student_email,score."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-4">
            <div>
              <h2 className="font-bold text-ink">{selectedAssessment?.title}</h2>
              <p className="text-xs text-ink/50">
                {selectedAssessment?.type} · out of {selectedAssessment?.total_marks}{" "}
                marks · {rows.length} enrolled students
              </p>
            </div>
<div className="flex items-center gap-2">
              {dirty && <Badge tone="gold">Unsaved changes</Badge>}
              <div className="relative">
                <button
                  className="btn-outline px-3 py-1.5 text-xs"
                  onClick={() => setExportOpen((v) => !v)}
                  disabled={rows.length === 0 || exportBusy}
                >
                  {exportBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  Export Excel
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-lift">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink/40">
                      Export workbook
                    </p>
                    <button
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setExportOpen(false);
                        exportOneAssessment();
                      }}
                      disabled={!assessmentId}
                    >
                      One assessment (current)
                    </button>
                    <button
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setExportOpen(false);
                        exportSectionWorkbook("completed");
                      }}
                    >
                      All completed assessments
                    </button>
                    <button
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setExportOpen(false);
                        exportSectionWorkbook("entire");
                      }}
                    >
                      Entire section
                    </button>
                  </div>
                )}
              </div>
              <button className="btn-dark" onClick={saveAll} disabled={saving || rows.length === 0}>
                {saving ? "Saving..." : "Save all marks"}
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="No enrolled students"
              description="Enroll students in this course from the Students section first."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-paper">
                  <tr>
                    <th className="th">Student</th>
                    <th className="th">Reg #</th>
                    <th className="th text-right">Marks (/{selectedAssessment?.total_marks})</th>
                    <th className="th text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const val = Number(r.mark);
                    const invalid = r.mark.trim() !== "" && (isNaN(val) || val < 0 || val > (selectedAssessment?.total_marks ?? 0));
                    return (
                      <tr key={r.id} className="bg-white">
                        <td className="td">
                          <p className="font-semibold text-ink">
                            {r.profiles?.full_name ?? "Unnamed"}
                          </p>
                          <p className="text-xs text-ink/50">{r.profiles?.email}</p>
                        </td>
                        <td className="td font-mono text-xs text-ink/60">
                          {r.registration_no ?? "N/A"}
                        </td>
                        <td className="td">
                          <input
                            className={
                              invalid
                                ? "input ml-auto block w-28 text-right border-red-400 focus:border-red-400 focus:ring-red-300"
                                : "input ml-auto block w-28 text-right"
                            }
                            type="number"
                            min={0}
                            max={selectedAssessment?.total_marks}
                            step="any"
                            value={r.mark}
                            placeholder="N/A"
                            onChange={(e) => applyRowMark(r.id, e.target.value)}
                          />
                          {invalid && (
                            <p className="mt-1 text-right text-[11px] font-medium text-red-600">
                              Must be between 0 and {selectedAssessment?.total_marks}
                            </p>
                          )}
                        </td>
                        <td className="td">
                          <div className="flex justify-end">
                            {r.saved !== null && r.mark.trim() === "" ? (
                              <Badge tone="red">Pending removal</Badge>
                            ) : r.saved !== null ? (
                              <Badge tone="green">Saved · {r.saved}</Badge>
                            ) : r.mark.trim() !== "" ? (
                              <Badge tone="gold">New</Badge>
                            ) : (
                              <span className="text-xs text-ink/35">No mark</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        assessment={selectedAssessment}
onImported={async () => {
          setCsvOpen(false);
          if (assessmentId) await loadMarks(assessmentId);
          if (selectedAssessment) await notifyMarksReleased(selectedAssessment);
          success("CSV import complete.");
        }}
      />
    </div>
  );
}

function CsvImportModal({
  open,
  onClose,
  assessment,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  assessment: Assessment | undefined;
  onImported: () => Promise<void>;
}) {
  const { error } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<null | {
    imported: { email: string; score: number; studentId: string }[];
    notFound: string[];
    duplicates: string[];
    invalid: string[];
  }>(null);
const [busy, setBusy] = useState(false);
  const [templateEmails, setTemplateEmails] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setReport(null);
      setTemplateEmails([]);
      if (inputRef.current) inputRef.current.value = "";
      if (assessment?.section_id) {
        const supabase = createClient();
        supabase
          .from("enrollments")
          .select("student:students(profiles(email))")
          .eq("section_id", assessment.section_id)
          .then(({ data }) => {
            const emails: string[] = [];
            (data ?? []).forEach((en: {
              student?: { profiles?: { email?: string }[] | null }[] | null;
            }) => {
              const student = Array.isArray(en.student) ? en.student[0] : en.student;
              const profile = Array.isArray(student?.profiles)
                ? student.profiles[0]
                : student?.profiles;
              if (profile?.email) emails.push(profile.email);
            });
            setTemplateEmails(emails);
          });
      }
    }
  }, [open, assessment?.section_id]);

  function analyzeFile(f: File) {
    setFile(f);
    setReport(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const texts = parseCsv(String(reader.result ?? ""));
      if (texts.length === 0) {
        setReport({ imported: [], notFound: [], duplicates: [], invalid: ["File has no valid email,score rows."] });
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("enrollments")
        .select("student:students(id, profiles(email))")
        .eq("section_id", assessment?.section_id ?? "");
      const emailToId = new Map<string, string>();
      (data ?? []).forEach((en: {
        student?: { id: string; profiles?: { email?: string }[] | null }[] | null;
      }) => {
        const student = Array.isArray(en.student) ? en.student[0] : en.student;
        const profile = Array.isArray(student?.profiles)
          ? student.profiles[0]
          : student?.profiles;
        const email = profile?.email?.toLowerCase();
        if (email && student) emailToId.set(email, student.id);
      });

      const seen = new Map<string, number>();
      const duplicates: string[] = [];
      const notFound: string[] = [];
      const invalid: string[] = [];
      const imported: { email: string; score: number; studentId: string }[] = [];

      for (const row of texts) {
        const email = row.email.toLowerCase();
        if (assessment && row.score > Number(assessment.total_marks)) {
          invalid.push(`${email} (score ${row.score} > ${assessment.total_marks})`);
          continue;
        }
        if (emailToId.has(email)) {
          if (seen.has(email)) duplicates.push(email);
          else {
            seen.set(email, 1);
            imported.push({ email, score: row.score, studentId: emailToId.get(email)! });
          }
        } else {
          notFound.push(email);
        }
      }
      setReport({ imported, notFound, duplicates, invalid });
    };
    reader.readAsText(f);
  }

  async function confirmImport() {
    if (!report || !assessment) return;
    setBusy(true);
    const supabase = createClient();
    for (const row of report.imported) {
      if (row.score > assessment.total_marks) continue;
      const { error: err } = await supabase.from("marks").upsert(
        {
          student_id: row.studentId,
          assessment_id: assessment.id,
          obtained: row.score,
        },
        { onConflict: "student_id,assessment_id" }
      );
      if (err) {
        error(`Import stopped: ${err.message}`);
        setBusy(false);
        return;
      }
    }
setBusy(false);
    await onImported();
  }

  return (
    <Modal open={open} onClose={onClose} title="CSV bulk import" wide>
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-lg bg-gold/10 p-3 text-sm text-ink/70">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-gold-deep" />
          Uploading for <span className="font-bold text-ink">{assessment?.title}</span>{" "}
          (out of {assessment?.total_marks} marks). CSV format:{" "}
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            student_email,score
          </span>
        </div>

        {!file && !report && (
          <>
            <button
              className="btn-outline w-full py-10 text-center"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-gold-deep" />
              <span className="font-semibold">Click to choose a .csv file</span>
              <span className="mt-1 block text-xs text-ink/45">
                Only students enrolled in this section will be matched.
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) analyzeFile(f);
              }}
            />
            <div className="flex items-center justify-between text-xs text-ink/45">
              <span>Template:</span>
              <button
onClick={() => {
                  const lines =
                    templateEmails.length > 0
                      ? templateEmails.map((email) => `${email},`)
                      : ["student@lhr.nu.edu.pk,"];
                  const blob = new Blob(
                    [["student_email,score", ...lines].join("\n")],
                    { type: "text/csv" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "marks_template.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 font-semibold text-gold-deep hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> Download template
              </button>
            </div>
          </>
        )}

        {file && !report && (
          <div className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-paper p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-gold-deep" />
              <div>
                <p className="font-semibold text-ink">{file.name}</p>
                <p className="text-xs text-ink/50">Analyzing rows...</p>
              </div>
            </div>
            <Spinner label="" />
          </div>
        )}

        {report && (
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                  <UserCheck className="h-4 w-4" /> {report.imported.length} ready
                </p>
                <p className="text-xs text-green-600/70">Will be imported</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-red-700">
                  <UserX className="h-4 w-4" /> {report.notFound.length} not found
                </p>
                <p className="text-xs text-red-600/70">Not in this course</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> {report.duplicates.length + report.invalid.length} skipped
                </p>
                <p className="text-xs text-amber-600/70">
                  {report.duplicates.length} duplicates · {report.invalid.length} invalid
                </p>
              </div>
            </div>

            {report.notFound.length > 0 && (
              <div className="mt-3 max-h-28 overflow-y-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <p className="mb-1 font-semibold">Emails with no matching enrollment:</p>
                {report.notFound.map((e) => (
                  <p key={e} className="font-mono">{e}</p>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-outline" onClick={() => setReport(null)}>
                Re-analyze
              </button>
              <button
                className="btn-primary"
                onClick={confirmImport}
                disabled={busy || report.imported.length === 0}
              >
                {busy
                  ? "Importing..."
                  : `Import ${report.imported.length} marks`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
