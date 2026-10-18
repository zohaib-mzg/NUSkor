"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { fmt, toNum } from "./shared";
import { calcWeightedAverage } from "@/lib/calc/weighted";

interface ItemRow {
  id: string;
  label: string;
  value: string;
  weight: string;
}

let uidCounter = 0;
const newRow = (label = ""): ItemRow => ({
  id: `row-${++uidCounter}`,
  label,
  value: "",
  weight: "",
});

const DEFAULT_ROWS = () => [newRow("Item 1"), newRow("Item 2"), newRow("Item 3")];

/** Generic weighted average: any values with any weights, normalised. */
export default function WeightedPercentageCalculator() {
  const [rows, setRows] = useState<ItemRow[]>(DEFAULT_ROWS);

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));
  const patchRow = (id: string, patch: Partial<ItemRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const reset = () => setRows(DEFAULT_ROWS());

  const result = calcWeightedAverage(
    rows.map((r) => ({
      value: toNum(r.value) ?? Number.NaN,
      weight: toNum(r.weight) ?? Number.NaN,
    }))
  );

  return (
    <div className="card p-5 sm:p-7">
      <div className="hidden gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink/40 sm:grid sm:grid-cols-[1fr_6rem_6rem_2rem]">
        <span>Item (optional label)</span>
        <span>Value</span>
        <span>Weight</span>
        <span className="sr-only">Remove</span>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_6rem_6rem_2rem]"
          >
            <input
              className="input col-span-2 !py-2 sm:col-span-1"
              value={row.label}
              onChange={(e) => patchRow(row.id, { label: e.target.value })}
              placeholder={`Item ${i + 1}`}
              aria-label={`Item ${i + 1} label`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              step="any"
              value={row.value}
              onChange={(e) => patchRow(row.id, { value: e.target.value })}
              placeholder="Score"
              aria-label={`Item ${i + 1} value`}
            />
            <input
              className="input !py-2"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={row.weight}
              onChange={(e) => patchRow(row.id, { weight: e.target.value })}
              placeholder="Weight"
              aria-label={`Item ${i + 1} weight`}
            />
            <button
              type="button"
              className="btn-ghost !px-1.5 !py-1.5"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove item ${i + 1}`}
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
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add item
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
              Weighted average
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {result.average === null ? "—" : fmt(result.average)}
            </p>
            {result.average !== null && (
              <p className="mt-1 text-xs text-ink/50">
                Sum of weights used: {fmt(result.weightSum)} — weights are
                normalised, so they do not need to total 100.
              </p>
            )}
          </div>
        </div>
        {result.average === null && (
          <p className="mt-3 text-sm text-ink/60">
            Enter a value and a weight for at least one item to see the weighted
            average.
          </p>
        )}
      </div>
    </div>
  );
}
