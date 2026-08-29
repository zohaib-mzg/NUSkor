"use client";

import { useSemester, semesterOptions } from "@/lib/semester";

export default function SemesterSelector() {
  const [semester, setSemester] = useSemester();
  const options = semesterOptions();

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
