"use client";

import Script from "next/script";
import { useConsent } from "@/components/public/CookieConsent";

/**
 * Loads the AdSense library.
 *
 * Safety rules (see PUBLIC_SITE_NOTES.md):
 * - Mounted in the `(public)` layout and the `(portal)` layout only. It never
 *   appears on login / admin-login pages.
 * - Portal ads are student-only, must be reviewed through a crawler login
 *   after the AdSense account is approved, and remain dormant until slot IDs
 *   are configured.
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
