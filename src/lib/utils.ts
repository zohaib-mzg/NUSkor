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

export function percent(obtained: number, total: number): number {
  if (!total) return 0;
  return (obtained / total) * 100;
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
  return name.trim().charAt(0).toUpperCase();
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