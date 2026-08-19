"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  BadgeCheck,
  XCircle,
  UserPlus,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, TaApplication } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

export default function TaManagementPage() {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TaApplication[]>([]);
  const [tas, setTas] = useState<Profile[]>([]);
  const [taSections, setTaSections] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [rejecting, setRejecting] = useState<TaApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [appRes, taRes, stRes] = await Promise.all([
      supabase
        .from("ta_applications")
        .select("*")
        .order("requested_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("role", "ta"),
      supabase.from("section_tas").select("ta_id"),
    ]);
    setLoading(false);

    if (!appRes.error) setApplications((appRes.data ?? []) as TaApplication[]);
    if (!taRes.error) setTas((taRes.data ?? []) as Profile[]);
    if (!stRes.error) {
      const counts: Record<string, number> = {};
      (stRes.data ?? []).forEach((r: { ta_id: string }) => {
        counts[r.ta_id] = (counts[r.ta_id] ?? 0) + 1;
      });
      setTaSections(counts);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(app: TaApplication) {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const { error: appErr } = await supabase
      .from("ta_applications")
      .update({ status: "approved", reviewed_by: user?.id ?? null, reviewed_at: now })
      .eq("id", app.id);
    if (appErr) {
      setBusy(false);
      return error(appErr.message);
    }
    if (app.user_id) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ role: "ta" })
        .eq("id", app.user_id);
      if (profileErr) {
        setBusy(false);
        return error(profileErr.message);
      }
    }
    setBusy(false);
    success(`${app.full_name ?? app.email} is now a TA.`);
    load();
  }

  async function reject() {
    if (!rejecting) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("ta_applications")
      .update({
        status: "rejected",
        rejection_reason: rejectReason.trim() || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejecting.id);
    setBusy(false);
    setRejecting(null);
    setRejectReason("");
    if (err) return error(err.message);
    success("Application rejected.");
    load();
  }

  async function addTa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const email = addEmail.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("email", email)
      .maybeSingle();

    if (!existing) {
      setBusy(false);
      return error(
        "No account found for that email. The person must sign in at least once first."
      );
    }
    if ((existing as Profile).role === "ta") {
      setBusy(false);
      return info("That user is already a TA.");
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({ role: "ta" })
      .eq("id", existing.id);
    setBusy(false);
    if (err) return error(err.message);
    success(`${(existing as Profile).full_name ?? email} is now a TA.`);
    setAddOpen(false);
    setAddEmail("");
    load();
  }

  if (loading) return <Spinner label="Loading TA management..." />;

  const pending = applications.filter((a) => a.status === "pending");

  return (
    <div>
      <PageHeader
        title="TA Management"
        subtitle="Approve applications, manage active TAs, and assign them to sections."
        icon={Users}
        actions={
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add TA
          </button>
        }
      />

      {/* Pending applications */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-gold-deep" /> Pending applications
          </h2>
          <Badge tone="gold">{pending.length} pending</Badge>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            title="No pending applications"
            description="When someone applies for TA access, their request shows up here."
          />
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {pending.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 bg-white px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold-deep">
                  {(a.full_name ?? a.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{a.full_name ?? "Unnamed"}</p>
                  <p className="truncate text-xs text-ink/50">
                    {a.email} · requested {new Date(a.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <button className="btn-dark px-3 py-1.5 text-xs" onClick={() => approve(a)} disabled={busy}>
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
            <Layers className="h-4 w-4 text-gold-deep" /> Active TAs
          </h2>
          <Badge tone="neutral">{tas.length} TAs</Badge>
        </div>
        {tas.length === 0 ? (
          <EmptyState
            title="No TAs yet"
            description="Approve applications above or add a TA directly."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-paper">
                <tr>
                  <th className="th">TA</th>
                  <th className="th">Email</th>
                  <th className="th text-right">Assigned sections</th>
                </tr>
              </thead>
              <tbody>
                {tas.map((t) => (
                  <tr key={t.id} className="bg-white">
                    <td className="td">
                      <p className="font-semibold text-ink">{t.full_name ?? "Unnamed"}</p>
                    </td>
                    <td className="td text-xs text-ink/55">{t.email}</td>
                    <td className="td text-right">
                      <Badge tone="gold">{taSections[t.id] ?? 0}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add TA modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a TA">
        <form onSubmit={addTa} className="space-y-4">
          <div>
            <label className="label">NU email</label>
            <input
              className="input"
              type="email"
              placeholder="e.g. l242531@lhr.nu.edu.pk"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
            />
            <p className="mt-2 text-xs text-ink/45">
              The person must have signed in at least once so an account exists.
              If they were a student, their role is upgraded to TA.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Adding..." : "Add TA"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.full_name ?? rejecting?.email ?? ""}?`}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Reason (optional, shown to applicant)</label>
            <textarea
              className="input min-h-24"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. No TA slots available this semester"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-outline" onClick={() => setRejecting(null)}>
              Cancel
            </button>
            <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={reject} disabled={busy}>
              {busy ? "Rejecting..." : "Reject application"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}