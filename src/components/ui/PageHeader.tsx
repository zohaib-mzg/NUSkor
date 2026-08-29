import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-gold">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-ink/50">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}