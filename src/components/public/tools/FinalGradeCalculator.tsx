"use client";

import { useState } from "react";
import { fmt, toNum } from "./shared";
import { calcRequiredFinal } from "@/lib/calc/grade";

/**
 * "What do I need on the final?" — current weighted score, the weight already
 * graded, and the overall percentage you want.
 */
export default function FinalGradeCalculator() {
  const [current, setCurrent] = useState("");
  const [weightDone, setWeightDone] = useState("");
  const [target, setTarget] = useState("");

  const c = toNum(current);
  const w = toNum(weightDone);
  const t = toNum(target);

  const result =
    c !== null && w !== null && t !== null
      ? calcRequiredFinal({
          currentScorePct: c,
          weightCompletedPct: w,
          targetPct: t,
        })
      : null;

  return (
    <div className="card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="fg-current">
            Current score so far (%)
          </label>
          <input
            id="fg-current"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.1"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="e.g. 72"
          />
          <p className="mt-1 text-xs text-ink/45">
            Your weighted average on everything graded so far.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="fg-weight">
            Weight already graded (%)
          </label>
          <input
            id="fg-weight"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            max="99.99"
            step="1"
            value={weightDone}
            onChange={(e) => setWeightDone(e.target.value)}
            placeholder="e.g. 60"
          />
          <p className="mt-1 text-xs text-ink/45">
            How much of the course weight those results represent.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="fg-target">
            Target overall (%)
          </label>
          <input
            id="fg-target"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.5"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 80"
          />
          <p className="mt-1 text-xs text-ink/45">
            The final percentage you are aiming for.
          </p>
        </div>
      </div>

      <div
        className="mt-6 rounded-xl border border-gold/30 bg-gold-faint p-5"
        aria-live="polite"
      >
        {!result || !result.valid ? (
          <p className="text-sm text-ink/60">
            {result?.error ??
              "Fill in all three fields to see the score you need on the remaining weight."}
          </p>
        ) : result.alreadySecured ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Target already secured
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              0% needed
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Your graded work already guarantees at least {t}% overall — even a
              zero on the remaining {fmt(result.remainingWeightPct)}% cannot drop
              you below your target.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              You need on the remaining {fmt(result.remainingWeightPct)}% of the
              course
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {fmt(result.requiredScorePct)}%
              {result.feasible ? "" : " +"}
            </p>
            {result.feasible ? (
              <p className="mt-2 text-sm text-ink/70">
                Score at least {fmt(result.requiredScorePct)}% on everything
                still graded and you finish at {t}% or better. That is{" "}
                {result.requiredScorePct <= 70
                  ? "a comfortable target."
                  : result.requiredScorePct <= 90
                    ? "within reach — keep steady."
                    : "demanding — every point counts."}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink/70">
                Not reachable by scoring alone: {fmt(result.requiredScorePct)}%
                exceeds the maximum of 100%. The highest you can finish with is{" "}
                {fmt(result.maxPossiblePct)}% — consider a different target, and
                ask your instructor about any available extra-credit work.
              </p>
            )}
          </>
        )}

        {result && result.valid && (
          <dl className="mt-4 grid gap-2 border-t border-gold/30 pt-3 text-xs text-ink/60 sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt>Already secured</dt>
              <dd className="font-semibold text-ink">
                {fmt(result.securedPct)} pts
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Best possible overall</dt>
              <dd className="font-semibold text-ink">
                {fmt(result.maxPossiblePct)}%
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
