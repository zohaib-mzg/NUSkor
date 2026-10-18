"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "nuskor-cookie-consent";
const EVENT = "nuskor-consent-change";

export type ConsentChoice = "accepted" | "rejected" | null;

function readStoredConsent(): ConsentChoice {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    // Storage unavailable (private mode etc.) — treat as undecided.
    return null;
  }
}

/** Current consent choice; `null` = undecided. Ads load only on "accepted". */
export function useConsent(): ConsentChoice {
  const [consent, setConsentState] = useState<ConsentChoice>(null);

  useEffect(() => {
    setConsentState(readStoredConsent());
    const sync = () => setConsentState(readStoredConsent());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return consent;
}

/** Record the visitor's choice. */
export function setConsent(choice: "accepted" | "rejected"): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage unavailable — the session stays on the safe (no-ads) default.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Re-open the banner — used by "Cookie settings" in the footer. */
export function openCookieSettings(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const consent = useConsent();

  useEffect(() => setMounted(true), []);

  if (!mounted || consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl"
    >
      <div className="card p-5 shadow-lift">
        <p className="text-sm font-bold text-ink">Cookies on nuSkor</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          Essential cookies keep the portal signed in. Advertising cookies are
          only used if you accept — they help keep the public tools free. Read
          our{" "}
          <Link
            href="/cookie-policy"
            className="font-semibold text-gold-deep hover:underline"
          >
            cookie policy
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={() => setConsent("accepted")}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn-outline text-xs"
            onClick={() => setConsent("rejected")}
          >
            Reject non-essential
          </button>
        </div>
      </div>
    </div>
  );
}
