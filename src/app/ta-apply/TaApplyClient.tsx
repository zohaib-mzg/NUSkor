"use client";

import { useState } from "react";
import { BadgeCheck, Clock, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider, useToast } from "@/components/ui/Toast";
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
    success("Request submitted. An admin will review it.");
  }

  const hasExisting = app !== null;
  const canApply = !hasExisting || app?.status === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold">
            <GraduationCap className="h-6 w-6 text-ink" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">NUSkor</p>
            <p className="text-xs text-white/50">TA Portal</p>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-ink">Request TA access</h1>
          <p className="mt-1 text-sm text-ink/55">
            Signed in as <span className="font-semibold text-ink">{email}</span>
          </p>

          <div className="mt-6">
            {canApply && (
              <>
                <p className="text-sm text-ink/55">
                  Request access to the TA portal. Once approved, you can create
                  your own courses and sections.
                </p>

                {app?.status === "rejected" && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Your previous request was rejected.
                    {app.rejection_reason && ` Reason: ${app.rejection_reason}`}
                  </div>
                )}

                <button
                  className="btn-primary mt-5 w-full"
                  onClick={requestAccess}
                  disabled={busy}
                >
                  {busy ? <Spinner label="Submitting..." /> : "Request TA access"}
                </button>
              </>
            )}

            {app?.status === "pending" && (
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 text-center">
                <Clock className="mx-auto h-8 w-8 text-gold-deep" />
                <p className="mt-2 font-bold text-ink">Request under review</p>
                <p className="mt-1 text-sm text-ink/55">
                  Submitted {new Date(app.requested_at).toLocaleDateString()}.
                  An admin will approve or reject it.
                </p>
              </div>
            )}

            {app?.status === "approved" && (
              <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-center">
                <BadgeCheck className="mx-auto h-8 w-8 text-green-600" />
                <p className="mt-2 font-bold text-green-700">Access approved</p>
                <p className="mt-1 text-sm text-green-600/80">
                  You now have TA access. Sign in again to open the TA portal.
                </p>
                <Link href="/dashboard" className="btn-primary mt-4 w-full">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-ink/40">
            Approval is granted by an admin. Once approved, you can create courses and sections yourself.
          </div>
        </div>

        <Link
          href="/"
          className="mt-4 block text-center text-xs text-white/40 hover:text-white/70"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
