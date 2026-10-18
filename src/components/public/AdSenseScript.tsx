"use client";

import Script from "next/script";
import { useConsent } from "@/components/public/CookieConsent";

/**
 * Loads the AdSense library.
 *
 * Safety rules (see PUBLIC_SITE_NOTES.md):
 * - Mounted exclusively in the `(public)` layout, so it can never appear on
 *   login / portal / admin pages.
 * - Loads only after the visitor accepted advertising cookies.
 * - Renders nothing when NEXT_PUBLIC_ADSENSE_CLIENT is unset — ads are fully
 *   disabled by default.
 */
export default function AdSenseScript() {
  const consent = useConsent();
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client || consent !== "accepted") return null;

  return (
    <Script
      id="adsense-loader"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
