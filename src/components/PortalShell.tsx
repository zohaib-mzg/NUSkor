"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  Users,
  BookOpen,
  ClipboardList,
  Star,
  FolderKanban,
  CalendarClock,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  match: string[] | null;
}

const studentNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, match: ["/dashboard"] },
  { href: "/marks", label: "My Marks", icon: <ClipboardList className="h-[18px] w-[18px]" />, match: ["/marks"] },
  { href: "/evaluations", label: "Evaluations", icon: <CalendarDays className="h-[18px] w-[18px]" />, match: ["/evaluations"] },
  { href: "/announcements", label: "Announcements", icon: <Megaphone className="h-[18px] w-[18px]" />, match: ["/announcements"] },
  { href: "/settings", label: "Settings", icon: <Settings className="h-[18px] w-[18px]" />, match: ["/settings"] },
];

const taNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, match: ["/dashboard"] },
  { href: "/ta/sections", label: "My Sections", icon: <BookOpen className="h-[18px] w-[18px]" />, match: ["/ta/sections"] },
  { href: "/ta/students", label: "Students & Invites", icon: <Users className="h-[18px] w-[18px]" />, match: ["/ta/students"] },
  { href: "/ta/assessments", label: "Assessments", icon: <FolderKanban className="h-[18px] w-[18px]" />, match: ["/ta/assessments"] },
  { href: "/ta/marks", label: "Marks", icon: <Star className="h-[18px] w-[18px]" />, match: ["/ta/marks"] },
  { href: "/ta/evaluations", label: "Evaluation Periods", icon: <CalendarClock className="h-[18px] w-[18px]" />, match: ["/ta/evaluations"] },
  { href: "/ta/announcements", label: "Announcements", icon: <Megaphone className="h-[18px] w-[18px]" />, match: ["/ta/announcements"] },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, match: ["/admin"] },
  { href: "/admin/tas", label: "TA Management", icon: <ShieldCheck className="h-[18px] w-[18px]" />, match: ["/admin/tas"] },
  { href: "/admin/students", label: "Students", icon: <Users className="h-[18px] w-[18px]" />, match: ["/admin/students"] },
  { href: "/admin/courses", label: "Courses", icon: <BookOpen className="h-[18px] w-[18px]" />, match: ["/admin/courses"] },
  { href: "/admin/assessments", label: "Assessments", icon: <FolderKanban className="h-[18px] w-[18px]" />, match: ["/admin/assessments"] },
  { href: "/admin/marks", label: "Marks", icon: <Star className="h-[18px] w-[18px]" />, match: ["/admin/marks"] },
  { href: "/admin/evaluations", label: "Evaluation Periods", icon: <CalendarClock className="h-[18px] w-[18px]" />, match: ["/admin/evaluations"] },
  { href: "/admin/bookings", label: "Bookings", icon: <CalendarDays className="h-[18px] w-[18px]" />, match: ["/admin/bookings"] },
  { href: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-[18px] w-[18px]" />, match: ["/admin/announcements"] },
  { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-[18px] w-[18px]" />, match: ["/admin/analytics"] },
];

export default function PortalShell({
  email,
  displayName,
  role,
  children,
}: {
  email: string;
  displayName: string;
  role: "admin" | "ta" | "student";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin";
  const isTa = role === "ta";

  const nav = isAdmin ? adminNav : isTa ? taNav : studentNav;

  const isActive = (item: NavItem) =>
    item.match?.some((m) => pathname === m || pathname.startsWith(m + "/")) ??
    false;

  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [displayName]
  );

  const sidebar = (
    <div
      className={cn(
        "flex h-full w-64 flex-col",
        isAdmin ? "bg-ink text-white" : "border-r border-black/[0.07] bg-white"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-3 border-b px-5 py-5",
          isAdmin ? "border-white/10" : "border-black/[0.07]"
        )}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-gold">
          <Image
            src="/logo.png"
            alt="NUSkor logo"
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-extrabold tracking-tight">
            NUS<span className="text-gold">kor</span>
          </p>
          <p
            className={cn(
              "truncate text-[11px] font-medium",
              isAdmin ? "text-white/50" : "text-ink/50"
            )}
          >
            Empowering Students.
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p
          className={cn(
            "mb-2 px-3 text-[10px] font-bold uppercase tracking-widest",
            isAdmin ? "text-white/40" : "text-ink/40"
          )}
        >
          {isAdmin ? "Admin Panel" : isTa ? "TA Panel" : "Student Panel"}
        </p>
        {nav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? isAdmin
                    ? "bg-gold text-ink shadow-gold"
                    : "bg-gold/15 text-ink"
                  : isAdmin
                    ? "text-white/70 hover:bg-white/10 hover:text-white"
                    : "text-ink/60 hover:bg-black/5 hover:text-ink"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div
        className={cn(
          "border-t p-4",
          isAdmin ? "border-white/10" : "border-black/[0.07]"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2.5",
            isAdmin ? "bg-white/[0.06]" : "bg-paper"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-ink">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p
              className={cn(
                "truncate text-[11px]",
                isAdmin ? "text-white/50" : "text-ink/50"
              )}
            >
              {email}
            </p>
          </div>
        </div>
        <form
          action="/auth/signout"
          method="post"
          className="mt-2"
        >
          <button
            type="submit"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isAdmin
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : "text-ink/50 hover:bg-black/5 hover:text-ink"
            )}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex">
            {sidebar}
            <button
              onClick={() => setOpen(false)}
              className="m-3 h-fit rounded-full bg-white p-2 text-ink shadow-lift"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/[0.07] bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-ink transition-colors hover:bg-black/5"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="NUSkor"
            width={28}
            height={28}
            className="rounded-full ring-1 ring-gold"
          />
          <span className="text-sm font-extrabold tracking-tight text-ink">
            NUS<span className="text-gold-deep">kor</span>
          </span>
        </div>
        <button
          onClick={() => router.push(isAdmin ? "/admin" : isTa ? "/ta/sections" : "/dashboard")}
          className="rounded-lg p-2 text-ink transition-colors hover:bg-black/5"
          aria-label="Home"
        >
          <LayoutDashboard className="h-5 w-5" />
        </button>
      </header>

      {/* Main */}
      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-4 flex justify-end">
            <NotificationBell />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}