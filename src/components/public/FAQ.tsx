import { ChevronDown } from "lucide-react";
import JsonLd from "@/components/public/JsonLd";
import { faqSchema } from "@/lib/schema";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Native <details> accordion — works without JavaScript — plus FAQPage JSON-LD.
 */
export default function FAQ({
  items,
  heading = "Frequently asked questions",
  withSchema = true,
}: {
  items: FaqItem[];
  heading?: string;
  withSchema?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label={heading}>
      {withSchema && <JsonLd data={faqSchema(items)} />}
      <h2 className="text-2xl font-bold tracking-tight text-ink">{heading}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <details key={item.q} className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-ink/40 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-ink/60">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
