"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cleanName } from "@/lib/utils";
import { currentSemester } from "@/lib/semester";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

type PendingApp = {
  id: string;
  email: string;
  full_name: string | null;
  course_code: string | null;
  semester: string | null;
  year: number | null;
  requested_at: string;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [taCount, setTaCount] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);
  const [pendingApps, setPendingApps] = useState<PendingApp[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const sem = currentSemester();

      const [tasRes, secRes, appsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "ta"),
        supabase
          .from("section_tas")
          .select("id", { count: "exact", head: true })
          .eq("semester", sem),
        supabase
          .from("ta_applications")
          .select("id, email, full_name, course_code, semester, year, requested_at")
          .eq("status", "pending")
          .order("requested_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;
      setTaCount(tasRes.count ?? 0);
      setSectionCount(secRes.count ?? 0);
      setPendingApps((appsRes.data ?? []) as PendingApp[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner label="Loading admin dashboard..." />;

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Manage TAs and view analytics. · ${currentSemester()}`}
        icon={ShieldCheck}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Active TAs" value={taCount} accent="gold" />
        <StatCard icon={ClipboardCheck} label="Sections (this semester)" value={sectionCount} />
        <StatCard icon={Clock} label="Pending applications" value={pendingApps.length} accent="gold" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Quick links */}
        <section className="card p-6">
          <h2 className="mb-4 font-bold text-ink">Quick actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/tas"
              className="group flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-gold hover:shadow-lift"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink group-hover:text-black">
                  TA Management
                </p>
                <p className="text-xs text-ink/50">
                  Approve applications, assign sections, or assign yourself
                </p>
              </div>
            </Link>
            <Link
              href="/admin/analytics"
              className="group flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-gold hover:shadow-lift"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink group-hover:text-black">
                  Analytics
                </p>
                <p className="text-xs text-ink/50">
                  View section performance and stats
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Pending applications */}
        <section className="card p-6">
          <h2 className="mb-4 font-bold text-ink">Pending applications</h2>
          {pendingApps.length === 0 ? (
            <EmptyState
              title="No pending applications"
              description="When someone applies for TA access, their request shows up here."
            />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {pendingApps.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-deep">
                    {cleanName(a.full_name || a.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {cleanName(a.full_name) || "Unnamed"}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {a.course_code ? `${a.course_code} · ` : ""}
                      {a.semester} {a.year} · {a.email}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pendingApps.length > 0 && (
            <Link
              href="/admin/tas"
              className="mt-3 block text-center text-xs font-semibold text-gold-deep hover:underline"
            >
              View all →
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
