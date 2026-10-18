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
import { round2, sumCourses } from "@/lib/calc/gpa";

interface CourseRow {
  id: string;
  name: string;
  credits: string;
  grade: string;
}

let uidCounter = 0;
const newCourse = (): CourseRow => ({
  id: `row-${++uidCounter}`,
  name: "",
  credits: "",
  grade: "",
});

export default function GpaCalculator() {
  const [scale, setScale] = useState<GradeScaleEntry[]>(DEFAULT_GRADE_SCALE);
  const [courses, setCourses] = useState<CourseRow[]>(() => [
    newCourse(),
    newCourse(),
    newCourse(),
  ]);

  const addCourse = () => setCourses((prev) => [...prev, newCourse()]);
  const removeCourse = (id: string) =>
    setCourses((prev) => prev.filter((c) => c.id !== id));
  const patchCourse = (id: string, patch: Partial<CourseRow>) =>
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );

  const reset = () => {
    setCourses([newCourse(), newCourse(), newCourse()]);
    setScale(DEFAULT_GRADE_SCALE);
  };

  const totals = sumCourses(
    courses
      .filter((c) => c.grade !== "")
      .map((c) => ({
        creditHours: toNum(c.credits) ?? Number.NaN,
        gradePoints: gradePointsFor(scale, c.grade) ?? Number.NaN,
      }))
  );

  const gpa = totals.credits > 0 ? round2(totals.qualityPoints / totals.credits) : null;

  const resultText = () =>
    [
      "nuSkor GPA Calculator",
      "",
      `GPA: ${gpa === null ? "—" : gpa.toFixed(2)} · ${fmt(totals.credits)} credit hours · ${fmt(totals.qualityPoints)} quality points`,
      "Estimated with nuSkor — your university's own records are the final authority.",
    ].join("\n");

  return (
    <div className="card p-5 sm:p-7">
      <div className="space-y-2">
        {courses.map((course, ci) => (
          <div
            key={course.id}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5.5rem_7rem_2rem]"
          >
            <input
              className="input col-span-2 !py-2 sm:col-span-1"
              value={course.name}
              onChange={(e) => patchCourse(course.id, { name: e.target.value })}
              placeholder={`Course ${ci + 1} (optional)`}
              aria-label={`Course ${ci + 1} name`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={course.credits}
              onChange={(e) =>
                patchCourse(course.id, { credits: e.target.value })
              }
              placeholder="CH"
              aria-label={`Course ${ci + 1} credit hours`}
            />
            <select
              className="input !py-2"
              value={course.grade}
              onChange={(e) => patchCourse(course.id, { grade: e.target.value })}
              aria-label={`Course ${ci + 1} letter grade`}
            >
              <option value="">Grade</option>
              {scale.map((g) => (
                <option key={g.letter} value={g.letter}>
                  {g.letter}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost !px-1.5 !py-1.5"
              onClick={() => removeCourse(course.id)}
              aria-label={`Remove course ${ci + 1}`}
              disabled={courses.length === 1}
            >
              <Trash2 className="h-3.5 w-3.5 text-ink/40" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn-outline mt-3 !px-3 !py-1.5 text-xs"
        onClick={addCourse}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add course
      </button>

      <div
        className="mt-6 rounded-xl border border-gold/30 bg-gold-faint p-5"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Semester GPA (SGPA)
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {gpa === null ? "—" : gpa.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {fmt(totals.credits)} credit hours · {fmt(totals.qualityPoints)}{" "}
              quality points
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
        {gpa === null && (
          <p className="mt-3 text-sm text-ink/60">
            Add credit hours and a grade for at least one course to see your GPA.
          </p>
        )}
      </div>

      <div className="mt-5">
        <GradeScaleEditor scale={scale} onChange={setScale} />
      </div>
    </div>
  );
}
