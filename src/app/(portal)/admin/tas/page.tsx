"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  BadgeCheck,
  XCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, TaApplication } from "@/lib/types";
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
  const [applications, setApplications] = useState<TaApplication[]>([]);
  const [taList, setTaList] = useState<Profile[]>([]);
  const [rejecting, setRejecting] = useState<TaApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{
    taId: string;
    taName: string;
  } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();

    const [appsRes, profilesRes, tasRes] = await Promise.all([
      supabase
        .from("ta_applications")
        .select("*")
        .order("requested_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("role", "ta"),
      supabase
        .from("section_tas")
        .select("ta_id"),
    ]);

    setLoading(false);

    if (!appsRes.error)
      setApplications((appsRes.data ?? []) as TaApplication[]);

    // Active TAs
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

  async function approve(app: TaApplication) {
    setBusy(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    const { error: appErr } = await supabase
      .from("ta_applications")
      .update({ status: "approved", reviewed_at: now, reviewed_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", app.id);
    if (appErr) {
      setBusy(false);
      return error(appErr.message);
    }

    // Upgrade role to ta
    await supabase
      .from("profiles")
      .update({ role: "ta" })
      .eq("id", app.user_id);

    success("TA approved.");
    setBusy(false);
    load();
  }

  async function reject(app: TaApplication) {
    setBusy(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    const { error: appErr } = await supabase
      .from("ta_applications")
      .update({
        status: "rejected",
        reviewed_at: now,
        rejection_reason: rejectReason.trim() || null,
      })
      .eq("id", app.id);
    setBusy(false);
    setRejecting(null);
    setRejectReason("");
    if (appErr) return error(appErr.message);
    success("Application rejected.");
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

  const pending = applications.filter((a) => a.status === "pending");

  return (
    <div>
      <PageHeader
        title="TA Management"
        subtitle={`Approve TA access and manage active TAs. · ${semester}`}
        icon={Users}
      />

      {/* Pending applications */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-gold-deep" />{" "}
            Pending applications
          </h2>
          <Badge tone="gold">{pending.length} pending</Badge>
        </div>
        {pending.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No pending applications"
              description="When someone requests TA access, it appears here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {pending.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 bg-white px-5 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-deep">
                  {cleanName(a.full_name || a.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {cleanName(a.full_name) || "Unnamed"}
                  </p>
                  <p className="text-xs text-ink/50">{a.email}</p>
                </div>
                <button
                  className="btn-dark px-3 py-1.5 text-xs"
                  onClick={() => approve(a)}
                  disabled={busy}
                >
                  <BadgeCheck className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                  onClick={() => setRejecting(a)}
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
            <Users className="h-4 w-4 text-gold-deep" />{" "}
            Active TAs
          </h2>
          <Badge tone="neutral">{taList.length} TAs</Badge>
        </div>
        {taList.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No TAs yet"
              description="TAs appear here after their applications are approved."
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

      {/* Reject modal */}
      <ConfirmDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={() => reject(rejecting!)}
        title={`Reject ${cleanName(rejecting?.full_name) || rejecting?.email || ""}?`}
        message={`Reject ${cleanName(rejecting?.full_name) || rejecting?.email || ""}? They will not receive TA access.${rejectReason ? ` Reason: ${rejectReason}` : ""}`}
        confirmLabel="Reject"
      />

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
