"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { fmt, toNum } from "./shared";
import { calcCourseTotal } from "@/lib/calc/weighted";

interface ComponentRow {
  id: string;
  name: string;
  earned: string;
  total: string;
  weight: string;
}

let uidCounter = 0;
const newRow = (name = ""): ComponentRow => ({
  id: `row-${++uidCounter}`,
  name,
  earned: "",
  total: "",
  weight: "",
});

const DEFAULT_ROWS = () => [
  newRow("Assignments"),
  newRow("Quizzes"),
  newRow("Sessional"),
  newRow("Midterm"),
  newRow("Final exam"),
];

export default function CourseTotalCalculator() {
  const [rows, setRows] = useState<ComponentRow[]>(DEFAULT_ROWS);

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));
  const patchRow = (id: string, patch: Partial<ComponentRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  const reset = () => setRows(DEFAULT_ROWS());

  const result = calcCourseTotal(
    rows.map((r) => ({
      pointsEarned: toNum(r.earned) ?? Number.NaN,
      pointsTotal: toNum(r.total) ?? Number.NaN,
      weightPct: toNum(r.weight) ?? Number.NaN,
    }))
  );

  const weightBar = Math.min(100, result.weightSum);

  return (
    <div className="card p-5 sm:p-7">
      <div className="hidden gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink/40 sm:grid sm:grid-cols-[1fr_5rem_5rem_5.5rem_2rem]">
        <span>Component</span>
        <span>Earned</span>
        <span>Out of</span>
        <span>Weight %</span>
        <span className="sr-only">Remove</span>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_5rem_5.5rem_2rem]"
          >
            <input
              className="input col-span-2 !py-2 sm:col-span-1"
              value={row.name}
              onChange={(e) => patchRow(row.id, { name: e.target.value })}
              placeholder={`Component ${i + 1}`}
              aria-label={`Component ${i + 1} name`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={row.earned}
              onChange={(e) => patchRow(row.id, { earned: e.target.value })}
              placeholder="Marks"
              aria-label={`Component ${i + 1} marks earned`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={row.total}
              onChange={(e) => patchRow(row.id, { total: e.target.value })}
              placeholder="Total"
              aria-label={`Component ${i + 1} total marks`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={row.weight}
              onChange={(e) => patchRow(row.id, { weight: e.target.value })}
              placeholder="e.g. 10"
              aria-label={`Component ${i + 1} weight percentage`}
            />
            <button
              type="button"
              className="btn-ghost !px-1.5 !py-1.5"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove component ${i + 1}`}
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
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add component
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
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Weighted total so far
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {result.totalPct === null ? "—" : `${fmt(result.totalPct)}%`}
            </p>
          </div>
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <div className="flex items-center justify-between text-xs text-ink/50">
              <span>Weight accounted for</span>
              <span className="font-semibold text-ink">
                {fmt(result.weightSum)}% / 100%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-gold-deep"
                style={{ width: `${weightBar}%` }}
              />
            </div>
          </div>
        </div>

        {result.totalPct === null ? (
          <p className="mt-3 text-sm text-ink/60">
            Fill in marks and a weight for at least one component to see the
            weighted total.
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink/70">
            {result.valid
              ? "Weights add up to exactly 100% — this total is final for the numbers entered."
              : result.note}
          </p>
        )}
      </div>
    </div>
  );
}
