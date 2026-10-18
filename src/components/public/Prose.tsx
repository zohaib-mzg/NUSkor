import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight prose styling for long-form public content (no plugin needed).
 * Apply to a wrapper and render plain h2/h3/p/ul/ol inside.
 */
export default function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[15px] leading-relaxed text-ink/70",
        "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink",
        "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-ink",
        "[&_p]:mb-4",
        "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_a]:font-medium [&_a]:text-gold-deep hover:[&_a]:underline",
        "[&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-black/10 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-ink [&_td]:border-b [&_td]:border-black/[0.06] [&_td]:py-2 [&_td]:text-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
