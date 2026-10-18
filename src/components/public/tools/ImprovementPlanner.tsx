"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import { fmt, toNum } from "./shared";
import { calcRequiredAverageGpa } from "@/lib/calc/improvement";

/**
 * "What average GPA do I need from my remaining credits to reach a target
 * CGPA?" — plus an honest achievability check.
 */
export default function ImprovementPlanner() {
  const [currentCgpa, setCurrentCgpa] = useState("");
  const [creditsDone, setCreditsDone] = useState("");
  const [targetCgpa, setTargetCgpa] = useState("");
  const [remaining, setRemaining] = useState("");
  const [maxGpa, setMaxGpa] = useState("4");

  const c = toNum(currentCgpa);
  const cd = toNum(creditsDone);
  const t = toNum(targetCgpa);
  const r = toNum(remaining);
  const m = toNum(maxGpa) ?? 4;

  const result =
    c !== null && cd !== null && t !== null && r !== null
      ? calcRequiredAverageGpa({
          currentCgpa: c,
          creditsCompleted: cd,
          targetCgpa: t,
          remainingCredits: r,
          maxGpa: m > 0 ? m : 4,
        })
      : null;

  const copyText =
    result && result.valid && result.requiredGpa !== null
      ? [
          "nuSkor CGPA Improvement Planner",
          "",
          `Current CGPA: ${c!.toFixed(2)} over ${fmt(cd!)} credits`,
          `Target CGPA: ${t!.toFixed(2)} over ${fmt(r!)} remaining credits`,
          result.alreadyReached
            ? "Target already reached — keep the average above your target."
            : `Required average GPA: ${result.requiredGpa.toFixed(2)} over the remaining credits`,
          `Best possible CGPA: ${fmt(result.maxPossibleCgpa)}`,
          "Estimated with nuSkor — your university's records are the final authority.",
        ].join("\n")
      : "";

  return (
    <div className="card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ip-current">
            Current CGPA
          </label>
          <input
            id="ip-current"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={currentCgpa}
            onChange={(e) => setCurrentCgpa(e.target.value)}
            placeholder="e.g. 2.85"
          />
        </div>
        <div>
          <label className="label" htmlFor="ip-done">
            Credit hours completed
          </label>
          <input
            id="ip-done"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={creditsDone}
            onChange={(e) => setCreditsDone(e.target.value)}
            placeholder="e.g. 75"
          />
        </div>
        <div>
          <label className="label" htmlFor="ip-target">
            Target CGPA
          </label>
          <input
            id="ip-target"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={targetCgpa}
            onChange={(e) => setTargetCgpa(e.target.value)}
            placeholder="e.g. 3.20"
          />
        </div>
        <div>
          <label className="label" htmlFor="ip-remaining">
            Credit hours remaining
          </label>
          <input
            id="ip-remaining"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            placeholder="e.g. 55"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="ip-max">
          Maximum grade point on your scale{" "}
          <span className="font-normal text-ink/45">(default 4.0)</span>
        </label>
        <input
          id="ip-max"
          className="input max-w-[10rem]"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={maxGpa}
          onChange={(e) => setMaxGpa(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink/45">
          Used to judge achievability and the best possible final CGPA. Change
          it if your scale tops out elsewhere.
        </p>
      </div>

      <div
        className="mt-6 rounded-xl border border-gold/30 bg-gold-faint p-5"
        aria-live="polite"
      >
        {!result || !result.valid ? (
          <p className="text-sm text-ink/60">
            {result?.error ??
              "Fill in all four values to see the average GPA you need."}
          </p>
        ) : result.alreadyReached ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Target already reached
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {c!.toFixed(2)} ≥ {t!.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Your current CGPA is already at or above your target — holding any
              positive average across the remaining {fmt(r!)} credits keeps you
              there. The best you could finish with is{" "}
              {fmt(result.maxPossibleCgpa)}.
            </p>
          </>
        ) : result.achievable ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Required average over the remaining {fmt(r!)} credits
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {fmt(result.requiredGpa)}
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Averaging {fmt(result.requiredGpa)} grade points across{" "}
              {fmt(r!)} credits lifts your CGPA from {c!.toFixed(2)} to{" "}
              {t!.toFixed(2)}. The highest CGPA still possible is{" "}
              {fmt(result.maxPossibleCgpa)}.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Not achievable from here
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink/60">
              {fmt(result.requiredGpa)}
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Reaching {t!.toFixed(2)} would need an average of{" "}
              {fmt(result.requiredGpa)} — above the maximum of {fmt(m)}. Even
              perfect grades cap you at {fmt(result.maxPossibleCgpa)}. A target
              of {fmt(result.maxPossibleCgpa)} is still within reach; talk to
              your advisor about realistic options.
            </p>
          </>
        )}

        {result && result.valid && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gold/30 pt-3">
            <p className="text-xs text-ink/50">
              Best possible: <strong className="text-ink">{fmt(result.maxPossibleCgpa)}</strong>{" "}
              · Worst case: <strong className="text-ink">{fmt(result.minPossibleCgpa)}</strong>
            </p>
            {copyText && <CopyButton text={copyText} />}
          </div>
        )}
      </div>
    </div>
  );
}
