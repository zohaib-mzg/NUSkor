import type { ReactNode } from "react";
import Breadcrumbs from "@/components/public/Breadcrumbs";

/** Standard page header for public content pages (breadcrumbs + title + intro). */
export default function PageHero({
  title,
  description,
  crumbs,
  meta,
}: {
  title: string;
  description?: string;
  crumbs?: { name: string; href: string }[];
  meta?: ReactNode;
}) {
  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:pt-12">
        {crumbs && crumbs.length > 0 && (
          <div className="mb-4">
            <Breadcrumbs items={crumbs} />
          </div>
        )}
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink/60">
            {description}
          </p>
        )}
        {meta && <div className="mt-4 text-xs text-ink/40">{meta}</div>}
      </div>
    </section>
  );
}
