"use client";

import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRAVEL_VISTA_URL = "https://travel-vista-usa.vercel.app/";

// Routes rendered inside the portal shell, which has a fixed 16rem sidebar on
// lg+ screens. The banner is indented so it lines up with the main content
// area instead of running underneath the sidebar.
const PORTAL_PREFIXES = [
  "/dashboard",
  "/marks",
  "/evaluations",
  "/announcements",
  "/settings",
  "/ta",
  "/admin",
];

export default function DeveloperBanner() {
  const pathname = usePathname();

  const isPortal =
    !pathname.startsWith("/admin/login") &&
    PORTAL_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  return (
    <div
      className={cn(
        "border-b border-black/[0.06] bg-gold-faint px-5 py-3.5 text-center",
        isPortal && "lg:ml-64"
      )}
    >
      <p className="text-xl font-bold text-ink sm:text-2xl">
        Also from the developer:{" "}
        <a
          href={TRAVEL_VISTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 align-middle font-extrabold text-gold-deep hover:underline"
        >
          Travel Vista
          <ArrowUpRight
            className="h-[1.1em] w-[1.1em] shrink-0"
            aria-hidden="true"
          />
        </a>
      </p>
    </div>
  );
}
