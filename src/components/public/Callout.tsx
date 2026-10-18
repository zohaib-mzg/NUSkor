import type { ReactNode } from "react";

/** Highlighted note block for formulas, warnings and side notes. */
export default function Callout({
  title,
  children,
  tone = "note",
}: {
  title?: string;
  children: ReactNode;
  tone?: "note" | "formula";
}) {
  return (
    <div
      className={
        tone === "formula"
          ? "my-5 rounded-xl border border-black/[0.08] bg-white px-5 py-4"
          : "my-5 rounded-xl border border-gold/30 bg-gold-faint px-5 py-4"
      }
    >
      {title && <p className="mb-1 text-sm font-bold text-ink">{title}</p>}
      <div
        className={
          tone === "formula"
            ? "text-sm leading-relaxed text-ink/75 [&_code]:font-mono [&_code]:text-[13px]"
            : "text-sm leading-relaxed text-ink/70"
        }
      >
        {children}
      </div>
    </div>
  );
}
