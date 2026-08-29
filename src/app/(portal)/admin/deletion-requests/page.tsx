"use client";

import { useCallback, useEffect, useState } from "react";
import { UserX, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cleanName, formatDate, regNoDisplay } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface DeletionRequest {
  id: string;
  student_id: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  student?: {
    registration_no: string | null;
    program: string | null;
    profiles?: { full_name: string | null; email: string | null } | null;
  } | null;
}

export default function AdminDeletionRequestsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [reviewTarget, setReviewTarget] = useState<DeletionRequest | null>(null);
  const [reviewApprove, setReviewApprove] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("account_deletion_requests")
      .select("*, student:students(registration_no, program, profiles(full_name, email))")
      .order("created_at", { ascending: false });

    if (err) {
      error(err.message);
      setLoading(false);
      return;
    }

    setRequests((data ?? []) as DeletionRequest[]);
    setLoading(false);
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  async function reviewRequest() {
    if (!reviewTarget) return;
    setActing(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("review_deletion_request", {
      p_request_id: reviewTarget.id,
      p_approve: reviewApprove,
    });
    setActing(false);
    setReviewTarget(null);
    if (err) return error(err.message);
    success(
      reviewApprove
        ? "Request approved. Student account has been deleted."
        : "Request rejected."
    );
    await load();
  }

  if (loading) return <Spinner label="Loading deletion requests..." />;

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Account Deletion Requests"
        subtitle="Review and act on student account deletion requests."
        icon={UserX}
      />

      {requests.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No deletion requests"
            description="When students request account deletion, it will appear here."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <section className="card overflow-hidden">
              <div className="border-b border-black/[0.06] px-5 py-4">
                <h2 className="font-bold text-ink">
                  Pending <Badge tone="gold">{pending.length}</Badge>
                </h2>
              </div>
              <div className="divide-y divide-black/[0.06]">
                {pending.map((req) => {
                  const st = req.student;
                  const profile = st?.profiles;
                  return (
                    <div key={req.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {cleanName(profile?.full_name) || "Student"}
                        </p>
                        <p className="text-xs text-ink/50">
                          {regNoDisplay(st?.registration_no, profile?.email)}
                          {" · "}
                          {profile?.email}
                        </p>
                        {req.reason && (
                          <p className="mt-1 text-xs text-ink/45">
                            Reason: {req.reason}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-ink/35">
                          Requested {formatDate(req.created_at, true)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                          onClick={() => {
                            setReviewTarget(req);
                            setReviewApprove(true);
                          }}
                        >
                          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                          onClick={() => {
                            setReviewTarget(req);
                            setReviewApprove(false);
                          }}
                        >
                          <XCircle className="mr-1 inline h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Reviewed */}
          {reviewed.length > 0 && (
            <section className="card overflow-hidden">
              <div className="border-b border-black/[0.06] px-5 py-4">
                <h2 className="font-bold text-ink/60">Reviewed</h2>
              </div>
              <div className="divide-y divide-black/[0.06]">
                {reviewed.map((req) => {
                  const st = req.student;
                  const profile = st?.profiles;
                  return (
                    <div key={req.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink/60">
                          {cleanName(profile?.full_name) || "Student"}
                        </p>
                        <p className="text-xs text-ink/40">
                          {regNoDisplay(st?.registration_no, profile?.email)}
                          {" · "}
                          {profile?.email}
                        </p>
                      </div>
                      <Badge tone={req.status === "approved" ? "green" : "red"}>
                        {req.status === "approved" ? "Approved" : "Rejected"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        onConfirm={reviewRequest}
        title={
          reviewApprove
            ? "Approve deletion?"
            : "Reject deletion?"
        }
        message={
          reviewApprove
            ? `This will permanently delete ${cleanName(reviewTarget?.student?.profiles?.full_name) || "the student"}'s account, marks, enrollments, and all associated data. This cannot be undone.`
            : "The student will be notified that their deletion request was rejected."
        }
        confirmLabel={reviewApprove ? "Yes, delete account" : "Reject request"}
      />
    </div>
  );
}
