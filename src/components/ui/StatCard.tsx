import type { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "gold",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "gold" | "dark" | "green" | "blue";
}) {
  const accents: Record<string, string> = {
    gold: "bg-gold/15 text-gold-deep",
    dark: "bg-ink text-white",
    green: "bg-green-100 text-green-700",
    blue: "bg-sky-100 text-sky-700",
  };

  return (
    <div className="card flex items-start gap-4 p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
          {label}
        </p>
        <p className="mt-0.5 truncate text-2xl font-bold text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink/50">{hint}</p>}
      </div>
    </div>
  );
}