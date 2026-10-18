"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DEFAULT_GRADE_SCALE, type GradeScaleEntry } from "@/lib/grading";
import { cn } from "@/lib/utils";

/**
 * Collapsible "Use my university's scale" editor.
 * Every tool that reads grade points renders this so visitors can align the
 * maths with their own handbook. Nothing university-specific is hard-coded.
 */
export default function GradeScaleEditor({
  scale,
  onChange,
}: {
  scale: GradeScaleEntry[];
  onChange: (next: GradeScaleEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const update = (letter: string, raw: string) => {
    const points = raw === "" ? Number.NaN : Number(raw);
    onChange(
      scale.map((entry) =>
        entry.letter === letter ? { ...entry, points } : entry
      )
    );
  };

  return (
    <div className="rounded-xl border border-black/[0.08] bg-paper">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-ink">
          Use my university&rsquo;s scale
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ink/40 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-black/[0.08] px-4 py-4">
          <p className="text-xs leading-relaxed text-ink/50">
            The defaults are a commonly used 4.0 scale. Grade scales differ
            between universities — edit these grade points to match your own
            handbook. An empty field ignores that letter.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {scale.map((entry) => (
              <label
                key={entry.letter}
                className="flex items-center gap-2 text-sm"
              >
                <span className="w-8 shrink-0 font-semibold text-ink">
                  {entry.letter}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="10"
                  value={Number.isFinite(entry.points) ? entry.points : ""}
                  onChange={(e) => update(entry.letter, e.target.value)}
                  aria-label={`Grade points for ${entry.letter}`}
                  className="input px-2 py-1.5"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_GRADE_SCALE)}
            className="btn-ghost mt-3 !px-2 text-xs"
          >
            Reset to common defaults
          </button>
        </div>
      )}
    </div>
  );
}
