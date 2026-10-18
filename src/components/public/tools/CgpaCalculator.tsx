"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import GradeScaleEditor from "./GradeScaleEditor";
import CopyButton from "./CopyButton";
import { fmt, toNum } from "./shared";
import {
  DEFAULT_GRADE_SCALE,
  gradePointsFor,
  type GradeScaleEntry,
} from "@/lib/grading";
import {
  combineTotals,
  round2,
  sumCourses,
  type GpaTotals,
} from "@/lib/calc/gpa";

interface CourseRow {
  id: string;
  name: string;
  credits: string;
  grade: string;
  ignored: boolean;
}

interface SemesterRow {
  id: string;
  courses: CourseRow[];
}

let uidCounter = 0;
const nextId = () => `row-${++uidCounter}`;

const newCourse = (): CourseRow => ({
  id: nextId(),
  name: "",
  credits: "",
  grade: "",
  ignored: false,
});

const newSemester = (): SemesterRow => ({
  id: nextId(),
  courses: [newCourse()],
});

export default function CgpaCalculator() {
  const [scale, setScale] = useState<GradeScaleEntry[]>(DEFAULT_GRADE_SCALE);
  const [semesters, setSemesters] = useState<SemesterRow[]>(() => [
    newSemester(),
  ]);
  const [priorOn, setPriorOn] = useState(false);
  const [priorCgpa, setPriorCgpa] = useState("");
  const [priorCredits, setPriorCredits] = useState("");

  const addSemester = () =>
    setSemesters((prev) => [...prev, newSemester()]);

  const removeSemester = (semId: string) =>
    setSemesters((prev) => prev.filter((s) => s.id !== semId));

  const addCourse = (semId: string) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId ? { ...s, courses: [...s.courses, newCourse()] } : s
      )
    );

  const removeCourse = (semId: string, courseId: string) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? { ...s, courses: s.courses.filter((c) => c.id !== courseId) }
          : s
      )
    );

  const patchCourse = (
    semId: string,
    courseId: string,
    patch: Partial<CourseRow>
  ) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              courses: s.courses.map((c) =>
                c.id === courseId ? { ...c, ...patch } : c
              ),
            }
          : s
      )
    );

  const reset = () => {
    setSemesters([newSemester()]);
    setPriorOn(false);
    setPriorCgpa("");
    setPriorCredits("");
    setScale(DEFAULT_GRADE_SCALE);
  };

  // --- calculations ---------------------------------------------------------
  const semTotals: GpaTotals[] = semesters.map((sem) =>
    sumCourses(
      sem.courses
        .filter((c) => !c.ignored && c.grade !== "")
        .map((c) => ({
          creditHours: toNum(c.credits) ?? Number.NaN,
          gradePoints: gradePointsFor(scale, c.grade) ?? Number.NaN,
        }))
    )
  );

  let total: GpaTotals = { credits: 0, qualityPoints: 0, gpa: null };
  for (const t of semTotals) total = combineTotals(total, t);

  const priorC = toNum(priorCgpa);
  const priorCr = toNum(priorCredits);
  const priorValid =
    priorOn &&
    priorC !== null &&
    priorCr !== null &&
    priorCr > 0 &&
    priorC >= 0;
  if (priorValid) {
    total = combineTotals(total, {
      credits: priorCr,
      qualityPoints: priorC * priorCr,
      gpa: priorC,
    });
  }

  const cgpa =
    total.credits > 0 ? round2(total.qualityPoints / total.credits) : null;

  const resultText = () => {
    const lines = ["nuSkor CGPA Calculator", ""];
    semTotals.forEach((t, i) => {
      if (t.gpa !== null) {
        lines.push(
          `Semester ${i + 1}: SGPA ${t.gpa.toFixed(2)} · ${fmt(t.credits)} cr`
        );
      }
    });
    if (priorValid) {
      lines.push(`Previous record: ${priorC.toFixed(2)} · ${fmt(priorCr)} cr`);
    }
    lines.push(
      "",
      `CGPA: ${cgpa === null ? "—" : cgpa.toFixed(2)} · ${fmt(total.credits)} credit hours`,
      "Estimated with nuSkor — your university's own records are the final authority."
    );
    return lines.join("\n");
  };

  return (
    <div className="card p-5 sm:p-7">
      {/* Prior record */}
      <label className="flex items-start gap-2.5 text-sm font-medium text-ink/80">
        <input
          type="checkbox"
          checked={priorOn}
          onChange={(e) => setPriorOn(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-black/20 text-gold-deep focus:ring-gold"
        />
        <span>
          Continue from a previous CGPA
          <span className="block text-xs font-normal text-ink/45">
            For transfer credits or semesters you are not re-entering.
          </span>
        </span>
      </label>
      {priorOn && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="prior-cgpa">
              Previous CGPA
            </label>
            <input
              id="prior-cgpa"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={priorCgpa}
              onChange={(e) => setPriorCgpa(e.target.value)}
              placeholder="e.g. 3.20"
            />
          </div>
          <div>
            <label className="label" htmlFor="prior-credits">
              Credit hours completed
            </label>
            <input
              id="prior-credits"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={priorCredits}
              onChange={(e) => setPriorCredits(e.target.value)}
              placeholder="e.g. 60"
            />
          </div>
        </div>
      )}

      {/* Semesters */}
      <div className="mt-6 space-y-5">
        {semesters.map((sem, si) => (
          <fieldset
            key={sem.id}
            className="rounded-xl border border-black/[0.08] p-4"
          >
            <legend className="sr-only">Semester {si + 1}</legend>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink" aria-hidden="true">
                Semester {si + 1}
              </p>
              {semesters.length > 1 && (
                <button
                  type="button"
                  className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => removeSemester(sem.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                  semester
                </button>
              )}
            </div>

            <div className="space-y-2">
              {sem.courses.map((course, ci) => (
                <div
                  key={course.id}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5.5rem_7rem_auto_2rem]"
                >
                  <input
                    className="input col-span-2 !py-2 sm:col-span-1"
                    value={course.name}
                    onChange={(e) =>
                      patchCourse(sem.id, course.id, { name: e.target.value })
                    }
                    placeholder={`Course ${ci + 1} (optional)`}
                    aria-label={`Semester ${si + 1} course ${ci + 1} name`}
                  />
                  <input
                    className="input !py-2"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={course.credits}
                    onChange={(e) =>
                      patchCourse(sem.id, course.id, {
                        credits: e.target.value,
                      })
                    }
                    placeholder="CH"
                    aria-label={`Semester ${si + 1} course ${ci + 1} credit hours`}
                  />
                  <select
                    className="input !py-2"
                    value={course.grade}
                    onChange={(e) =>
                      patchCourse(sem.id, course.id, { grade: e.target.value })
                    }
                    aria-label={`Semester ${si + 1} course ${ci + 1} letter grade`}
                  >
                    <option value="">Grade</option>
                    {scale.map((g) => (
                      <option key={g.letter} value={g.letter}>
                        {g.letter}
                      </option>
                    ))}
                  </select>
                  <label
                    className="flex items-center gap-1.5 text-xs text-ink/60"
                    title="Tick if you repeated this course — this (older) attempt is left out of the CGPA."
                  >
                    <input
                      type="checkbox"
                      checked={course.ignored}
                      onChange={(e) =>
                        patchCourse(sem.id, course.id, {
                          ignored: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-black/20 text-gold-deep focus:ring-gold"
                    />
                    Repeat
                  </label>
                  <button
                    type="button"
                    className="btn-ghost !px-1.5 !py-1.5"
                    onClick={() => removeCourse(sem.id, course.id)}
                    aria-label={`Remove semester ${si + 1} course ${ci + 1}`}
                    disabled={sem.courses.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-ink/40" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-outline mt-3 !px-3 !py-1.5 text-xs"
              onClick={() => addCourse(sem.id)}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add course
            </button>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        className="btn-outline mt-4 !px-3 !py-1.5 text-xs"
        onClick={addSemester}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add semester
      </button>

      {/* Result */}
      <div
        className="mt-6 rounded-xl border border-gold/30 bg-gold-faint p-5"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Cumulative GPA
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {cgpa === null ? "—" : cgpa.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {fmt(total.credits)} credit hours counted ·{" "}
              {fmt(total.qualityPoints)} quality points
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={resultText()} />
            <button
              type="button"
              className="btn-ghost !py-2 text-xs"
              onClick={reset}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          </div>
        </div>

        {semTotals.some((t) => t.gpa !== null) && (
          <ul className="mt-4 space-y-1 border-t border-gold/30 pt-3 text-sm text-ink/70">
            {semTotals.map(
              (t, i) =>
                t.gpa !== null && (
                  <li key={semesters[i].id} className="flex justify-between gap-4">
                    <span>Semester {i + 1} SGPA</span>
                    <span className="font-semibold text-ink">
                      {t.gpa.toFixed(2)}{" "}
                      <span className="font-normal text-ink/50">
                        · {fmt(t.credits)} cr
                      </span>
                    </span>
                  </li>
                )
            )}
            {priorValid && (
              <li className="flex justify-between gap-4">
                <span>Previous record</span>
                <span className="font-semibold text-ink">
                  {priorC.toFixed(2)}{" "}
                  <span className="font-normal text-ink/50">
                    · {fmt(priorCr)} cr
                  </span>
                </span>
              </li>
            )}
          </ul>
        )}

        {cgpa === null && (
          <p className="mt-3 text-sm text-ink/60">
            Add at least one course with credit hours and a grade to see your
            CGPA.
          </p>
        )}
      </div>

      <div className="mt-5">
        <GradeScaleEditor scale={scale} onChange={setScale} />
      </div>
    </div>
  );
}
