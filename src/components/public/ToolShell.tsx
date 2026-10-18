import type { ReactNode } from "react";
import AdSlot from "@/components/public/AdSlot";
import CtaCard from "@/components/public/CtaCard";
import PageHero from "@/components/public/PageHero";
import Prose from "@/components/public/Prose";
import FAQ, { type FaqItem } from "@/components/public/FAQ";
import RelatedLinks, {
  type RelatedLink,
} from "@/components/public/RelatedLinks";
import JsonLd from "@/components/public/JsonLd";
import { webApplicationSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";

/**
 * Shared layout for every /tools/* page:
 * hero → the interactive tool → soft CTA → display ad → long-form explainer
 * (with its own in-article ad inside) → FAQ → related links.
 *
 * Ads never sit between inputs and results: the display unit comes after the
 * whole tool card (and the CTA), the in-article unit lives inside the
 * explainer text.
 */
export default function ToolShell({
  title,
  description,
  path,
  updated,
  children,
  explainer,
  faqs,
  related,
}: {
  title: string;
  description: string;
  path: string;
  /** Fixed "last updated" string, maintained by hand. */
  updated: string;
  /** The interactive tool (a client component). */
  children: ReactNode;
  /** Long-form content below the tool; include an in-article AdSlot inside. */
  explainer: ReactNode;
  faqs: FaqItem[];
  related: RelatedLink[];
}) {
  return (
    <>
      <JsonLd data={webApplicationSchema({ name: title, description, path })} />
      <PageHero
        title={title}
        description={description}
        crumbs={[
          { name: "Tools", href: "/tools" },
          { name: title, href: path },
        ]}
        meta={
          <>
            Last updated: {updated} · Runs entirely in your browser — nothing
            you type is sent anywhere.
          </>
        }
      />

      <div className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mt-8">{children}</div>
        <p className="mt-3 text-center text-xs text-ink/40">
          {SITE.independence.estimates}
        </p>

        {/* Soft CTA after every tool result (prompt §7) */}
        <CtaCard
          className="mt-8"
          title="Want your real marks, rank and slot bookings in one place?"
          description="Sign in to nuSkor — the marks your instructors publish, class statistics and evaluation slots, all in one place. Free for students."
        />

        <AdSlot variant="display" />

        <section className="mt-12" aria-labelledby="how-it-works">
          <h2
            id="how-it-works"
            className="text-2xl font-bold tracking-tight text-ink"
          >
            How this calculator works
          </h2>
          <div className="mt-4 max-w-3xl">
            <Prose>{explainer}</Prose>
          </div>
        </section>

        <div className="mt-12 max-w-3xl">
          <FAQ items={faqs} />
        </div>

        <div className="mt-12">
          <RelatedLinks links={related} />
        </div>
      </div>
    </>
  );
}
