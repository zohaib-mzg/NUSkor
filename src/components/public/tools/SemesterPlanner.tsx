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
const newRow = (): CourseRow => ({
  id: `row-${++uidCounter}`,
  name: "",
  credits: "",
  grade: "",
});

const DEFAULT_ROWS = () => [newRow(), newRow(), newRow(), newRow()];

/** What-if semester planner: expected grades → projected SGPA. */
export default function SemesterPlanner() {
  const [scale, setScale] = useState<GradeScaleEntry[]>(DEFAULT_GRADE_SCALE);
  const [rows, setRows] = useState<CourseRow[]>(DEFAULT_ROWS);

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));
  const patchRow = (id: string, patch: Partial<CourseRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const reset = () => {
    setRows(DEFAULT_ROWS());
    setScale(DEFAULT_GRADE_SCALE);
  };

  const totals = sumCourses(
    rows
      .filter((r) => r.grade !== "")
      .map((r) => ({
        creditHours: toNum(r.credits) ?? Number.NaN,
        gradePoints: gradePointsFor(scale, r.grade) ?? Number.NaN,
      }))
  );

  const sgpa =
    totals.credits > 0 ? round2(totals.qualityPoints / totals.credits) : null;

  const copyText = () =>
    [
      "nuSkor Semester What-If Planner",
      "",
      `Projected SGPA: ${sgpa === null ? "—" : sgpa.toFixed(2)} · ${fmt(totals.credits)} credit hours`,
      "Estimated with nuSkor — your university's records are the final authority.",
    ].join("\n");

  return (
    <div className="card p-5 sm:p-7">
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5.5rem_7rem_2rem]"
          >
            <input
              className="input col-span-2 !py-2 sm:col-span-1"
              value={row.name}
              onChange={(e) => patchRow(row.id, { name: e.target.value })}
              placeholder={`Course ${i + 1} (optional)`}
              aria-label={`Course ${i + 1} name`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={row.credits}
              onChange={(e) => patchRow(row.id, { credits: e.target.value })}
              placeholder="CH"
              aria-label={`Course ${i + 1} credit hours`}
            />
            <select
              className="input !py-2"
              value={row.grade}
              onChange={(e) => patchRow(row.id, { grade: e.target.value })}
              aria-label={`Course ${i + 1} expected letter grade`}
            >
              <option value="">Expected</option>
              {scale.map((g) => (
                <option key={g.letter} value={g.letter}>
                  {g.letter}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost !px-1.5 !py-1.5"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove course ${i + 1}`}
              disabled={rows.length === 1}
            >
              <Trash2 className="h-3.5 w-3.5 text-ink/40" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-outline !px-3 !py-1.5 text-xs"
          onClick={addRow}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add course
        </button>
        <button
          type="button"
          className="btn-ghost !px-3 !py-1.5 text-xs"
          onClick={reset}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start over
        </button>
      </div>

      <div
        className="mt-6 rounded-xl border border-gold/30 bg-gold-faint p-5"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                Projected SGPA
              </p>
              <span className="badge bg-gold/20 text-gold-deep">What-if</span>
            </div>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {sgpa === null ? "—" : sgpa.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {fmt(totals.credits)} credit hours · {fmt(totals.qualityPoints)}{" "}
              quality points — if these expected grades hold.
            </p>
          </div>
          <CopyButton text={copyText()} />
        </div>
        {sgpa === null && (
          <p className="mt-3 text-sm text-ink/60">
            Add credit hours and an expected grade for at least one course to
            project your SGPA.
          </p>
        )}
      </div>

      <div className="mt-5">
        <GradeScaleEditor scale={scale} onChange={setScale} />
      </div>
    </div>
  );
}
