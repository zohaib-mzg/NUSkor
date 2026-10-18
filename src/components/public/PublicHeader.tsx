"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SITE, STUDENT_PORTAL_HREF } from "@/lib/site";
import { cn } from "@/lib/utils";

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-gold">
            <Image
              src="/logo.png"
              alt="nuSkor logo"
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-ink">
            nu<span className="text-gold-deep">Skor</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {SITE.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-gold/15 text-ink"
                  : "text-ink/60 hover:bg-black/5 hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={STUDENT_PORTAL_HREF}
            className="btn-primary hidden text-sm sm:inline-flex"
          >
            Student Portal →
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-ink transition-colors hover:bg-black/5 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-black/[0.06] bg-white md:hidden">
          <nav
            className="mx-auto max-w-6xl space-y-1 px-5 py-4"
            aria-label="Mobile"
          >
            {SITE.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-gold/15 text-ink"
                    : "text-ink/70 hover:bg-black/5"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={STUDENT_PORTAL_HREF}
              onClick={() => setOpen(false)}
              className="btn-primary mt-3 w-full"
            >
              Student Portal →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
