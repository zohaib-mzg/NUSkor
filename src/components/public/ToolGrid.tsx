import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  Calculator,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Percent,
  Target,
  TrendingUp,
} from "lucide-react";
import { TOOLS } from "@/lib/tools";

const ICONS: Record<string, ReactNode> = {
  "cgpa-calculator": <Calculator className="h-5 w-5" />,
  "gpa-calculator": <GraduationCap className="h-5 w-5" />,
  "grade-calculator": <Target className="h-5 w-5" />,
  "course-total-calculator": <ClipboardList className="h-5 w-5" />,
  "cgpa-improvement-planner": <TrendingUp className="h-5 w-5" />,
  "attendance-calculator": <CalendarCheck className="h-5 w-5" />,
  "grade-point-converter": <ArrowRightLeft className="h-5 w-5" />,
  "weighted-percentage-calculator": <Percent className="h-5 w-5" />,
  "semester-gpa-planner": <CalendarDays className="h-5 w-5" />,
};

export default function ToolGrid({ limit }: { limit?: number }) {
  const tools = typeof limit === "number" ? TOOLS.slice(0, limit) : TOOLS;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <Link
          key={tool.slug}
          href={`/tools/${tool.slug}`}
          className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lift"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
            {ICONS[tool.slug] ?? <Calculator className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-bold text-ink group-hover:text-gold-deep">
              {tool.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink/55">
              {tool.blurb}
            </p>
          </div>
          <span className="mt-auto text-xs font-semibold text-gold-deep opacity-0 transition-opacity group-hover:opacity-100">
            Open tool →
          </span>
        </Link>
      ))}
    </div>
  );
}
