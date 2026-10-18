"use client";

import { openCookieSettings } from "@/components/public/CookieConsent";

/** Footer button that re-opens the cookie banner so visitors can change consent. */
export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="text-sm text-ink/60 transition-colors hover:text-ink"
    >
      Cookie settings
    </button>
  );
}
