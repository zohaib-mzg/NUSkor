"use client";

import { useState } from "react";
import { BadgeCheck, Clock, XCircle, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

type Application = {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  rejection_reason: string | null;
};

export default function TaApplyClient({
  userId,
  email,
  fullName,
  application,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  application: Application | null;
}) {
  return (
    <ToastProvider>
      <TaApplyInner
        userId={userId}
        email={email}
        fullName={fullName}
        application={application}
      />
    </ToastProvider>
  );
}

function TaApplyInner({
  userId,
  email,
  fullName,
  application,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  application: Application | null;
}) {
  const { success, error } = useToast();
  const [app, setApp] = useState<Application | null>(application);
  const [busy, setBusy] = useState(false);

  async function requestAccess() {
    setBusy(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("ta_applications")
      .insert({
        user_id: userId,
        email,
        full_name: fullName,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select("id, status, requested_at, rejection_reason")
      .single();
    setBusy(false);
    if (err) return error(err.message);
    setApp(data as Application);
    success("Application submitted. An admin will review it.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold">
            <GraduationCap className="h-6 w-6 text-ink" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">NUSkor</p>
            <p className="text-xs text-white/50">TA Access</p>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-ink">TA access request</h1>
          <p className="mt-1 text-sm text-ink/55">
            Signed in as <span className="font-semibold text-ink">{email}</span>
          </p>

          <div className="mt-6">
            {app === null && (
              <>
                <p className="text-sm text-ink/55">
                  You are not registered as a TA yet. Submit a request and an
                  admin will review it before you get any TA permissions.
                </p>
                <button className="btn-primary mt-5 w-full" onClick={requestAccess} disabled={busy}>
                  {busy ? <Spinner label="Submitting..." /> : "Request TA access"}
                </button>
              </>
            )}

            {app?.status === "pending" && (
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 text-center">
                <Clock className="mx-auto h-8 w-8 text-gold-deep" />
                <p className="mt-2 font-bold text-ink">Application under review</p>
                <p className="mt-1 text-sm text-ink/55">
                  Submitted {new Date(app.requested_at).toLocaleDateString()}.
                  An admin will approve or reject it.
                </p>
              </div>
            )}

            {app?.status === "approved" && (
              <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-center">
                <BadgeCheck className="mx-auto h-8 w-8 text-green-600" />
                <p className="mt-2 font-bold text-green-700">Application approved</p>
                <p className="mt-1 text-sm text-green-600/80">
                  You now have TA access. Sign in again to open the TA portal.
                </p>
                <Link href="/dashboard" className="btn-primary mt-4 w-full">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {app?.status === "rejected" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                <XCircle className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 font-bold text-red-700">Application rejected</p>
                <p className="mt-1 text-sm text-red-600/80">
                  {app.rejection_reason || "Contact the admin for details."}
                </p>
                <button className="btn-outline mt-4 w-full" onClick={requestAccess} disabled={busy}>
                  Re-apply
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-1 text-xs text-ink/40">
            <Badge tone="gold">Note</Badge>
            Approval is granted by an admin only.
          </div>
        </div>
      </div>
    </div>
  );
}