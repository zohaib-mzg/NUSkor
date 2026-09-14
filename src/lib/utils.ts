import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date, withTime = false): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSlotTime(time: string, use24h: boolean): string {
  const cleaned = time.replace(/:\d{2}$/, "");
  if (use24h) return cleaned;
  const [h, m] = cleaned.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Always returns 12-hour format: "1:10 PM" */
export function formatTime12(time: string): string {
  const cleaned = time.replace(/:\d{2}$/, "");
  const [h, m] = cleaned.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Compact time range in 12-hour format.
 * Same period: "1:10 – 1:15 PM"
 * Cross-period: "11:55 AM – 12:05 PM"
 */
export function formatSlotRange(start: string, end: string): string {
  const s = start.replace(/:\d{2}$/, "").split(":").map(Number);
  const e = end.replace(/:\d{2}$/, "").split(":").map(Number);
  const sPeriod = s[0] >= 12 ? "PM" : "AM";
  const ePeriod = e[0] >= 12 ? "PM" : "AM";
  const sH12 = s[0] === 0 ? 12 : s[0] > 12 ? s[0] - 12 : s[0];
  const eH12 = e[0] === 0 ? 12 : e[0] > 12 ? e[0] - 12 : e[0];
  if (sPeriod === ePeriod) {
    return `${sH12}:${String(s[1]).padStart(2, "0")} – ${eH12}:${String(e[1]).padStart(2, "0")} ${sPeriod}`;
  }
  return `${sH12}:${String(s[1]).padStart(2, "0")} ${sPeriod} – ${eH12}:${String(e[1]).padStart(2, "0")} ${ePeriod}`;
}

/**
 * Compact period date range.
 * Same day: "16 Sep 2026"
 * Multi-day: "16–18 Sep 2026"
 * Cross-month: "28 Sep – 3 Oct 2026"
 */
export function formatCompactPeriodDate(startsOn: string, endsOn: string): string {
  const s = new Date(startsOn + "T00:00:00");
  const e = new Date(endsOn + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sMonth = months[s.getMonth()];
  const eMonth = months[e.getMonth()];
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();

  if (startsOn === endsOn) {
    return `${s.getDate()} ${sMonth} ${sYear}`;
  }
  if (sYear !== eYear) {
    return `${s.getDate()} ${sMonth} ${sYear} – ${e.getDate()} ${eMonth} ${eYear}`;
  }
  if (sMonth !== eMonth) {
    return `${s.getDate()} ${sMonth} – ${e.getDate()} ${eMonth} ${sYear}`;
  }
  return `${s.getDate()}–${e.getDate()} ${sMonth} ${sYear}`;
}

export function percent(obtained: number, total: number): number {
  if (!total) return 0;
  return (obtained / total) * 100;
}

/**
 * Weighted overall percentage — THE single source of truth for a
 * student's overall standing (Dashboard, My Marks, Overall rank).
 * Must mirror the SQL used by get_leaderboard:
 *   SUM over PUBLISHED assessments of (obtained / total_marks) * weightage
 * Only pass published assessments. Missing marks contribute 0.
 */
export function weightedOverallPct(
  rows: { obtained: number | null; total: number; weightage: number }[]
): number {
  return rows.reduce(
    (sum, r) =>
      r.obtained === null || r.total <= 0 || r.weightage <= 0
        ? sum
        : sum + (r.obtained / r.total) * r.weightage,
    0
  );
}

export function gradeFor(obtained: number, total: number): { grade: string; points: number } {
  const p = percent(obtained, total);
  if (p >= 90) return { grade: "A+", points: 4.0 };
  if (p >= 85) return { grade: "A", points: 4.0 };
  if (p >= 80) return { grade: "A-", points: 3.7 };
  if (p >= 75) return { grade: "B+", points: 3.3 };
  if (p >= 70) return { grade: "B", points: 3.0 };
  if (p >= 65) return { grade: "B-", points: 2.7 };
  if (p >= 60) return { grade: "C+", points: 2.3 };
  if (p >= 55) return { grade: "C", points: 2.0 };
  if (p >= 50) return { grade: "C-", points: 1.7 };
  if (p >= 45) return { grade: "D+", points: 1.3 };
  if (p >= 40) return { grade: "D", points: 1.0 };
  return { grade: "F", points: 0 };
}

export function initialOf(name: string | null | undefined): string {
  if (!name) return "?";
  return cleanName(name).trim().charAt(0).toUpperCase();
}

/**
 * Strip university/program/batch/campus noise from student names.
 * e.g. "Muhammad Ali Aamir BSDS 2024 FAST NU LHR" → "Muhammad Ali Aamir"
 */
const NOISE_TOKENS = new Set([
  "FAST", "NU", "NUCES", "LUMS", "IBA", "NED", "COMSATS", "ITU",
  "LHR", "ISB", "KHI", "FSD", "PWR", "ABD", "MULT", "SIAL",
  "MAIN", "CITY", "TECH",
]);
const BS_PROGRAM = /^BS(\([A-Z]{2,4}\)|[A-Z]{2,4})$/;
const YEAR = /^(19|20)\d{2}$/;

export function cleanName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .filter((t) => {
      if (!t) return false;
      const up = t.toUpperCase();
      if (NOISE_TOKENS.has(up)) return false;
      if (BS_PROGRAM.test(up)) return false;
      if (YEAR.test(up)) return false;
      return true;
    })
    .join(" ")
    .trim();
}

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function many<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// "l242610", "L242610", "24L2610", "24L-2610" -> "24L-2610"
export function formatRegNo(value?: string | null): string | null {
  const s = (value ?? "").replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
  if (!s) return null;
  const m = s.match(/^L(\d{2})(\d{3,})$/) ?? s.match(/^(\d{2})L(\d{3,})$/);
  return m ? `${m[1]}L-${m[2]}` : null;
}

// Best-effort registration number for display: DB value first,
// then derived from the university email local part.
export function regNoDisplay(
  reg?: string | null,
  email?: string | null
): string {
  return (
    formatRegNo(reg) ??
    (email ? formatRegNo(email.split("@")[0]) : null) ??
    "N/A"
  );
}

// "EE2003" + "BCS-3H" -> "EE2003 → BCS-3H"
export function courseSection(
  code?: string | null,
  sectionCode?: string | null
): string {
  const c = code?.trim() || "Course";
  const s = sectionCode?.trim();
  return s ? `${c} ${String.fromCharCode(0x2192)} ${s}` : c;
}

export function parseCsv(text: string): { email: string; score: number }[] {
  const rows: { email: string; score: number }[] = [];
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, idx) => {
    if (idx === 0 && /email/i.test(line.split(",")[0] ?? "")) return;
    const [email, score] = line.split(",").map((c) => c.trim());
    if (!email || !email.includes("@")) return;
    const parsed = Number(score);
    if (isNaN(parsed) || parsed < 0) return;
    rows.push({ email: email.toLowerCase(), score: parsed });
  });
  return rows;
}