import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wrapper for CSS-built interface mockups on feature pages. Everything inside
 * is fictional and labelled "Sample data" — no real student data, ever.
 */
export default function SampleMockup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("card overflow-hidden", className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-2.5">
        <span className="text-xs font-semibold text-ink/60">{title}</span>
        <span className="badge bg-gold/20 text-gold-deep">Sample data</span>
      </figcaption>
      <div className="p-4">{children}</div>
    </figure>
  );
}
