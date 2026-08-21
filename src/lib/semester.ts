"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "nuskor_selected_semester";

/**
 * Determine current semester from the current date.
 *
 * Boundaries (approximate):
 *   Spring: January 1 → June 1   (months 0–4)
 *   Summer: June 1 → August 15   (months 5–7)
 *   Fall:   August 15 → Jan 1    (months 8–11)
 */
export function currentSemester(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  if (month <= 4) return `Spring ${year}`;
  if (month <= 7) return `Summer ${year}`;
  return `Fall ${year}`;
}

/** Return [term, year] tuple for sorting / offset math. */
function parseSemester(s: string): [number, number] {
  const parts = s.split(" ");
  const term = parts[0];
  const year = Number(parts[1]) || new Date().getFullYear();
  const termIdx = term === "Spring" ? 0 : term === "Summer" ? 1 : 2;
  return [termIdx, year];
}

/** Generate semester string from term index + year. */
function termLabel(termIdx: number, year: number): string {
  const names = ["Spring", "Summer", "Fall"] as const;
  return `${names[termIdx]} ${year}`;
}

/** Build a sorted list of semesters: current ± 2, plus any historical. */
export function semesterOptions(historical?: string[]): string[] {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const currentIdx = month <= 4 ? 0 : month <= 7 ? 1 : 2;
  const currentYear = year;

  // Convert current to an absolute index for offset math: termIdx + year*3
  const absoluteCurrent = currentIdx + currentYear * 3;

  const generated = new Set<string>();
  for (let offset = -2; offset <= 2; offset++) {
    const abs = absoluteCurrent + offset;
    const yr = Math.floor(abs / 3);
    const ti = ((abs % 3) + 3) % 3;
    generated.add(termLabel(ti, yr));
  }

  // Merge historical semesters from DB
  if (historical) {
    historical.forEach((s) => generated.add(s));
  }

  // Sort by absolute index (oldest first)
  return Array.from(generated).sort((a, b) => {
    const [ta, ya] = parseSemester(a);
    const [tb, yb] = parseSemester(b);
    return ta + ya * 3 - (tb + yb * 3);
  });
}

export function useSemester(): [string, (s: string) => void] {
  const [semester, setSemester] = useState<string>(() => {
    if (typeof window === "undefined") return currentSemester();
    return localStorage.getItem(STORAGE_KEY) ?? currentSemester();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, semester);
  }, [semester]);

  return [semester, setSemester];
}
