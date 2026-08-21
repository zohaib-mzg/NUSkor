"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  BadgeCheck,
  XCircle,
  ShieldCheck,
  Trash2,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SectionRequest } from "@/lib/types";
import { cleanName } from "@/lib/utils";
import { currentSemester } from "@/lib/semester";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TaManagementPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [semester] = useState(currentSemester());
  const [busy, setBusy] = useState(false);
  const [sectionRequests, setSectionRequests] = useState<SectionRequest[]>([]);
  const [taList, setTaList] = useState<Profile[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<{
    taId: string;
    taName: string;
  } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();

    // Ensure admin role is set
    await supabase.rpc("set_admin_role");

    const [reqRes, profilesRes, tasRes] = await Promise.all([
      supabase.rpc("get_pending_section_requests"),
      supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("role", "ta"),
      supabase
        .from("section_tas")
        .select("ta_id"),
    ]);

    setLoading(false);

    // Section requests from RPC
    if (!reqRes.error) {
      setSectionRequests((reqRes.data ?? []) as unknown as SectionRequest[]);
    }

    // Active TAs: profiles with role=ta OR who have section_tas rows
    const taIds = new Set<string>();
    (profilesRes.data ?? []).forEach((p: Profile) => taIds.add(p.id));
    (tasRes.data ?? []).forEach((r: { ta_id: string }) => taIds.add(r.ta_id));

    if (taIds.size > 0) {
      const { data: allTaProfiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .in("id", Array.from(taIds));
      setTaList((allTaProfiles ?? []) as Profile[]);
    } else {
      setTaList([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approveSectionRequest(req: SectionRequest) {
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("approve_section_request", {
      p_request_id: req.id,
    });
    setBusy(false);
    if (err) return error(err.message);
    success(`Approved: ${req.course_code} — ${req.course_name}, Section ${req.section_code}`);
    load();
  }

  async function rejectSectionRequest(req: SectionRequest) {
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("section_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    setBusy(false);
    if (err) return error(err.message);
    success("Request rejected.");
    load();
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("revoke_ta", {
      p_ta_id: revokeTarget.taId,
    });
    setBusy(false);
    setRevokeTarget(null);
    if (err) return error(err.message);
    success("TA revoked. They are now a student.");
    load();
  }

  if (loading) return <Spinner label="Loading TA management..." />;

  return (
    <div>
      <PageHeader
        title="TA Management"
        subtitle={`Review section requests and manage TAs. · ${semester}`}
        icon={Users}
      />

      {/* Section requests */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <BookOpen className="h-4 w-4 text-gold-deep" />{" "}
            Section requests
          </h2>
          <Badge tone="gold">{sectionRequests.length} pending</Badge>
        </div>
        {sectionRequests.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No pending requests"
              description="When a TA requests a new section, it appears here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {sectionRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 bg-white px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {cleanName(r.ta_name) || r.ta_email || "TA"}
                  </p>
                  <p className="text-xs text-ink/50">
                    <span className="font-semibold text-ink">{r.course_code}</span> — {r.course_name}, Section {r.section_code} · {r.semester} {r.year}
                    {r.notes && <span className="italic text-ink/40"> — {r.notes}</span>}
                  </p>
                </div>
                <button
                  className="btn-dark px-3 py-1.5 text-xs"
                  onClick={() => approveSectionRequest(r)}
                  disabled={busy}
                >
                  <BadgeCheck className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                  onClick={() => rejectSectionRequest(r)}
                  disabled={busy}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active TAs */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-gold-deep" />{" "}
            Active TAs
          </h2>
          <Badge tone="neutral">{taList.length} TAs</Badge>
        </div>
        {taList.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No TAs yet"
              description="TAs appear here after their section requests are approved."
            />
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {taList.map((ta) => (
              <li
                key={ta.id}
                className="flex items-center justify-between gap-3 bg-white px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {cleanName(ta.full_name) || "Unnamed"}
                  </p>
                  <p className="text-xs text-ink/50">{ta.email}</p>
                </div>
                <button
                  className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                  onClick={() =>
                    setRevokeTarget({
                      taId: ta.id,
                      taName: cleanName(ta.full_name) || ta.email || "TA",
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" /> Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={confirmRevoke}
        title={`Revoke TA role for ${revokeTarget?.taName}?`}
        message={`This will remove all section assignments and downgrade ${revokeTarget?.taName} to a student.`}
        confirmLabel="Revoke TA"
      />
    </div>
  );
}
