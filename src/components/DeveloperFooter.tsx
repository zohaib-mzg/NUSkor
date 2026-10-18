"use client";

import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRAVEL_VISTA_URL = "https://travel-vista-usa.vercel.app/";

// Routes rendered inside the portal shell, which has a fixed 16rem sidebar on
// lg+ screens. The footer is indented to line up with the main content area.
const PORTAL_PREFIXES = [
  "/dashboard",
  "/marks",
  "/evaluations",
  "/announcements",
  "/settings",
  "/ta",
  "/admin",
];

export default function DeveloperFooter() {
  const pathname = usePathname();

  const isPortal =
    !pathname.startsWith("/admin/login") &&
    PORTAL_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  return (
    <footer
      className={cn(
        "border-t border-black/[0.06] bg-paper px-5 py-5 text-center",
        isPortal && "lg:ml-64"
      )}
    >
      <p className="text-xs text-ink/45">
        Also from the developer:{" "}
        <a
          href={TRAVEL_VISTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-semibold text-gold-deep hover:underline"
        >
          Travel Vista
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
    </footer>
  );
}
