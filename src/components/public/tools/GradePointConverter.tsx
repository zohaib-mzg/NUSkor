"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import GradeScaleEditor from "./GradeScaleEditor";
import { fmt, toNum } from "./shared";
import { DEFAULT_GRADE_SCALE, gradePointsFor, type GradeScaleEntry } from "@/lib/grading";
import { cn } from "@/lib/utils";

/**
 * Letter ↔ grade points on an editable scale, plus a percentage → letter
 * lookup using cutoffs the visitor enters (never prefilled — cutoffs are
 * institution-specific).
 */
export default function GradePointConverter() {
  const [scale, setScale] = useState<GradeScaleEntry[]>(DEFAULT_GRADE_SCALE);
  const [letter, setLetter] = useState("A");
  const [pct, setPct] = useState("");
  const [credits, setCredits] = useState("");
  const [cutoffs, setCutoffs] = useState<Record<string, string>>({});
  const [cutoffOpen, setCutoffOpen] = useState(false);

  const cutoffRows = scale
    .map((e) => ({
      letter: e.letter,
      points: e.points,
      min: toNum(cutoffs[e.letter] ?? ""),
    }))
    .filter((e): e is { letter: string; points: number; min: number } =>
      e.min !== null
    );

  const pctValue = toNum(pct);
  const sorted = [...cutoffRows].sort((a, b) => b.min - a.min);
  const matched =
    pctValue !== null && sorted.length > 0
      ? sorted.find((c) => pctValue >= c.min) ?? null
      : null;

  const letterPoints = gradePointsFor(scale, letter);
  const shownLetter = matched ? matched.letter : letter;
  const shownPoints =
    matched && Number.isFinite(matched.points) ? matched.points : letterPoints;

  const creditValue = toNum(credits);
  const qualityPoints =
    creditValue !== null && creditValue > 0 && shownPoints !== null && Number.isFinite(shownPoints)
      ? creditValue * shownPoints
      : null;

  const updateCutoff = (lt: string, raw: string) =>
    setCutoffs((prev) => ({ ...prev, [lt]: raw }));

  return (
    <div className="card p-5 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Percentage → letter */}
        <div>
          <h3 className="text-sm font-bold text-ink">From a percentage</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink/50">
            Enter your overall percentage in a course. Using the cutoffs you set
            below, the tool finds your letter grade and its grade points.
          </p>
          <div className="mt-3">
            <label className="label" htmlFor="gc-pct">
              Course percentage (%)
            </label>
            <input
              id="gc-pct"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              placeholder="e.g. 84.5"
            />
          </div>

          <div className="mt-3 rounded-xl border border-black/[0.08] bg-paper">
            <button
              type="button"
              onClick={() => setCutoffOpen((v) => !v)}
              aria-expanded={cutoffOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-ink">
                Set my percentage cutoffs
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-ink/40 transition-transform",
                  cutoffOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
            {cutoffOpen && (
              <div className="border-t border-black/[0.08] px-4 py-4">
                <p className="text-xs leading-relaxed text-ink/50">
                  Cutoffs are never filled in for you — they differ between
                  universities and courses. Enter the minimum percentage for
                  each letter from your handbook, and leave unknown letters
                  empty.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {scale.map((e) => (
                    <label key={e.letter} className="flex items-center gap-2 text-sm">
                      <span className="w-8 shrink-0 font-semibold text-ink">
                        {e.letter}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="1"
                        value={cutoffs[e.letter] ?? ""}
                        onChange={(ev) => updateCutoff(e.letter, ev.target.value)}
                        placeholder="min %"
                        aria-label={`Minimum percentage for ${e.letter}`}
                        className="input px-2 py-1.5"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {pctValue !== null && (
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              {sorted.length === 0 ? (
                <>Set at least one cutoff to translate a percentage into a letter.</>
              ) : matched ? (
                <>
                  {fmt(pctValue)}% meets your <strong>{matched.letter}</strong>{" "}
                  cutoff and falls below{" "}
                  {sorted
                    .filter((c) => c.min > matched.min)
                    .slice(-1)
                    .map((c) => `${c.letter}`)
                    .join("") || "—"}{" "}
                  — that is {fmt(matched.points)} grade points.
                </>
              ) : (
                <>
                  {fmt(pctValue)}% is below your lowest entered cutoff — check
                  your handbook for the letter that applies.
                </>
              )}
              </p>
          )}
        </div>

        {/* Letter → points */}
        <div>
          <h3 className="text-sm font-bold text-ink">From a letter grade</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink/50">
            Pick a letter to see its grade points on the scale below.
          </p>
          <div className="mt-3">
            <label className="label" htmlFor="gc-letter">
              Letter grade
            </label>
            <select
              id="gc-letter"
              className="input"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            >
              {scale.map((g) => (
                <option key={g.letter} value={g.letter}>
                  {g.letter}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="gc-credits">
              Credit hours of the course{" "}
              <span className="font-normal text-ink/45">(optional)</span>
            </label>
            <input
              id="gc-credits"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
        </div>
      </div>

      {/* Result */}
      <div
        className="mt-6 rounded-xl border border-gold/30 bg-gold-faint p-5"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Letter grade
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {shownPoints !== null && Number.isFinite(shownPoints) ? shownLetter : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Grade points
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {shownPoints !== null && Number.isFinite(shownPoints)
                ? fmt(shownPoints)
                : "—"}
            </p>
          </div>
          {qualityPoints !== null && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                Quality points added
              </p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
                {fmt(qualityPoints)}
              </p>
              <p className="mt-1 text-xs text-ink/50">
                {fmt(creditValue)} credit hours × {fmt(shownPoints)} points —
                this is what the course contributes to your semester total.
              </p>
            </div>
          )}
        </div>
        {shownPoints === null || !Number.isFinite(shownPoints) ? (
          <p className="mt-3 text-sm text-ink/60">
            Pick a letter (or set cutoffs and enter a percentage) to see grade
            points.
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <GradeScaleEditor scale={scale} onChange={setScale} />
      </div>
    </div>
  );
}
