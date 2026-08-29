"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "gold"
  | "dark"
  | "green"
  | "red"
  | "blue"
  | "neutral";

const tones: Record<BadgeTone, string> = {
  gold: "bg-gold/15 text-gold-deep",
  dark: "bg-ink/90 text-gold",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
  neutral: "bg-black/5 text-ink/60",
};

export default function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}