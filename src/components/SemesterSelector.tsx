"use client";

import { useSemester } from "@/lib/semester";

export default function SemesterSelector() {
  const [semester, setSemester] = useSemester();
  const now = new Date();
  const year = now.getFullYear();
  const options = [
    `Fall ${year}`,
    `Spring ${year + 1}`,
    `Summer ${year + 1}`,
    `Fall ${year + 1}`,
  ].filter((s, i, a) => a.indexOf(s) === i);

  if (!options.includes(semester)) {
    options.unshift(semester);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold text-ink/50">
        Semester:
      </label>
      <select
        className="input w-auto py-1 text-xs"
        value={semester}
        onChange={(e) => setSemester(e.target.value)}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
