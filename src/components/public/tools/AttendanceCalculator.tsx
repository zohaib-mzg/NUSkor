"use client";

import { useState } from "react";
import { fmt, toNum } from "./shared";
import { calcAttendance } from "@/lib/calc/attendance";

/**
 * Attendance planning with a user-entered requirement — nothing here assumes
 * any university's attendance policy.
 */
export default function AttendanceCalculator() {
  const [held, setHeld] = useState("");
  const [attended, setAttended] = useState("");
  const [required, setRequired] = useState("");

  const h = toNum(held);
  const a = toNum(attended);
  const r = toNum(required);

  const result =
    h !== null && a !== null && r !== null
      ? calcAttendance({
          classesHeld: h,
          classesAttended: a,
          requiredPct: r,
        })
      : null;

  return (
    <div className="card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="at-held">
            Classes held so far
          </label>
          <input
            id="at-held"
            className="input"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={held}
            onChange={(e) => setHeld(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
        <div>
          <label className="label" htmlFor="at-attended">
            Classes you attended
          </label>
          <input
            id="at-attended"
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={attended}
            onChange={(e) => setAttended(e.target.value)}
            placeholder="e.g. 27"
          />
        </div>
        <div>
          <label className="label" htmlFor="at-required">
            Required attendance (%)
          </label>
          <input
            id="at-required"
            className="input"
            type="number"
            inputMode="decimal"
            min="1"
            max="100"
            step="1"
            value={required}
            onChange={(e) => setRequired(e.target.value)}
            placeholder="check your course outline"
          />
          <p className="mt-1 text-xs text-ink/45">
            Use the percentage your own course outline requires.
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
              "Enter classes held, classes attended and the required percentage."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                  Current attendance
                </p>
                <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
                  {fmt(result.currentPct)}%
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  {fmt(a)} of {fmt(h)} classes · requirement {fmt(r)}%
                </p>
              </div>
              {result.currentPct >= (r ?? 101) && (
                <span className="badge bg-green-100 text-green-800">
                  Above requirement
                </span>
              )}
              {result.currentPct < (r ?? 1) && result.recoverable && (
                <span className="badge bg-amber-100 text-amber-900">
                  Below requirement
                </span>
              )}
              {!result.recoverable && (
                <span className="badge bg-red-100 text-red-800">
                  Cannot be recovered
                </span>
              )}
            </div>

            <div className="mt-4 border-t border-gold/30 pt-3 text-sm leading-relaxed text-ink/70">
              {result.canMiss !== null && (
                <p>
                  You can miss up to{" "}
                  <strong className="text-ink">{result.canMiss}</strong>{" "}
                  consecutive classes and still stay at or above{" "}
                  {fmt(r)}% — after that, attendance starts slipping below the
                  requirement.
                </p>
              )}
              {result.mustAttend !== null && (
                <p>
                  You are below the requirement. Attend the next{" "}
                  <strong className="text-ink">{result.mustAttend}</strong>{" "}
                  classes in a row to climb back to {fmt(r)}%.
                </p>
              )}
              {!result.recoverable && (
                <p>
                  With a 100% requirement, a missed class cannot be undone by
                  attending more — the fraction can only approach 100%. Speak
                  with your instructor or course office about your options.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-ink/40">
        Estimates assume every future class carries the same weight in your
        university&rsquo;s calculation. Check your course outline for the rule
        that applies to you.
      </p>
    </div>
  );
}
