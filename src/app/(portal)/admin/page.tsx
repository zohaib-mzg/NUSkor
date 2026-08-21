"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  BarChart3,
  BookOpen,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cleanName } from "@/lib/utils";
import { currentSemester } from "@/lib/semester";
import type { SectionRequest } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [taCount, setTaCount] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);
  const [pendingReqs, setPendingReqs] = useState<SectionRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const sem = currentSemester();

      const [tasRes, secRes, reqRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "ta"),
        supabase
          .from("section_tas")
          .select("id", { count: "exact", head: true })
          .eq("semester", sem),
        supabase.rpc("get_pending_section_requests"),
      ]);

      if (cancelled) return;
      setTaCount(tasRes.count ?? 0);
      setSectionCount(secRes.count ?? 0);
      setPendingReqs((reqRes.data ?? []) as unknown as SectionRequest[]);
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
        <StatCard icon={BookOpen} label="Sections (this semester)" value={sectionCount} />
        <StatCard icon={Clock} label="Pending requests" value={pendingReqs.length} accent="gold" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
                  Review section requests, manage TAs
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

        <section className="card p-6">
          <h2 className="mb-4 font-bold text-ink">Pending section requests</h2>
          {pendingReqs.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="When a TA requests a new section, it shows up here."
            />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {pendingReqs.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-deep">
                    {cleanName(r.ta_name || r.ta_email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {cleanName(r.ta_name) || "Unnamed"}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {r.course_code} — {r.course_name}, Section {r.section_code} · {r.semester} {r.year}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pendingReqs.length > 0 && (
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
