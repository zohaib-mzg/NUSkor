"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "@/components/public/CookieConsent";
import { cn } from "@/lib/utils";

type AdVariant = "display" | "in-article" | "multiplex";

const SLOT_IDS: Record<AdVariant, string | undefined> = {
  display: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY,
  "in-article": process.env.NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE,
  multiplex: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MULTIPLEX,
};

const AD_FORMATS: Record<AdVariant, string> = {
  display: "auto",
  "in-article": "fluid",
  multiplex: "autorelaxed",
};

/** Reserved height while the ad fills — prevents layout shift (CLS). */
const MIN_HEIGHTS: Record<AdVariant, number> = {
  display: 250,
  "in-article": 200,
  multiplex: 280,
};

/**
 * A single labelled AdSense unit.
 *
 * - Always renders an "Advertisement" label.
 * - Never renders when the slot/client env vars are missing (ads disabled).
 * - Waits for cookie consent; pushes once per mount inside try/catch.
 * - In development without env vars, shows a dashed placeholder instead.
 */
export default function AdSlot({
  variant = "display",
  className,
}: {
  variant?: AdVariant;
  className?: string;
}) {
  const consent = useConsent();
  const pushed = useRef(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = SLOT_IDS[variant];

  useEffect(() => {
    if (pushed.current || !client || !slot || consent !== "accepted") return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // Never break the page because of an ad.
    }
  }, [client, slot, consent]);

  if (!client || !slot) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div className={cn("my-8", className)}>
          <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-ink/30">
            Advertisement
          </p>
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-black/15 px-4 text-center text-xs text-ink/35">
            Ad slot “{variant}” — set NEXT_PUBLIC_ADSENSE_* to preview real ads
          </div>
        </div>
      );
    }
    return null;
  }

  if (consent !== "accepted") return null;

  return (
    <div className={cn("my-8", className)}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-ink/30">
        Advertisement
      </p>
      <div
        className="overflow-hidden"
        style={{ minHeight: MIN_HEIGHTS[variant] }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={AD_FORMATS[variant]}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
