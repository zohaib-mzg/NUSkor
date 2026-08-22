"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Link2,
  CheckCircle2,
  XCircle,
  GraduationCap,
  BookOpen,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InviteDetails, JoinSectionResult } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

const PROGRAMS = [
  "BSCS",
  "BSDS",
  "BSAI",
  "BSEE",
  "BBA",
  "BSAF",
  "BSCHE",
  "BSCET",
];
const SEMESTERS = [
  "1st Semester",
  "2nd Semester",
  "3rd Semester",
  "4th Semester",
  "5th Semester",
  "6th Semester",
  "7th Semester",
  "8th Semester",
];

export default function InviteClient({
  token,
  details,
  errorMessage,
}: {
  token: string;
  details: InviteDetails | null;
  errorMessage: string | null;
}) {
  return (
    <ToastProvider>
      <InviteInner
        token={token}
        details={details}
        errorMessage={errorMessage}
      />
    </ToastProvider>
  );
}

function InviteInner({
  token,
  details,
  errorMessage,
}: {
  token: string;
  details: InviteDetails | null;
  errorMessage: string | null;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  // null = still checking whether a student record exists
  const [needsProfile, setNeedsProfile] = useState<boolean | null>(null);
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [result, setResult] = useState<
    | { ok: true; already: boolean }
    | { ok: false; message: string }
    | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setSignedIn(!!user);
      if (user) {
        // Returning students skip the profile step; first-timers fill it in.
        const { data: existing } = await supabase
          .from("students")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled) setNeedsProfile(!existing);
      } else {
        if (!cancelled) setNeedsProfile(false);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const join = useCallback(
    async (pProgram?: string, pSemester?: string) => {
      setBusy(true);
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("join_section", {
        p_token: token,
        p_program: pProgram || null,
        p_semester: pSemester || null,
      });
      setBusy(false);
      if (err) {
        setResult({ ok: false, message: err.message });
        return;
      }
      const res = data as JoinSectionResult;
      setResult({ ok: true, already: res.already_enrolled });
    },
    [token]
  );

  useEffect(() => {
    if (
      details &&
      signedIn &&
      !busy &&
      !result &&
      needsProfile === false
    ) {
      join();
    }
  }, [details, signedIn, busy, result, needsProfile, join]);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?flow=student&next=${encodeURIComponent(
      `/invite/${token}`
    )}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          hd: "lhr.nu.edu.pk",
          prompt: "select_account",
        },
      },
    });
    if (err) setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink">
            NUS<span className="text-gold-deep">kor</span>
          </h1>
          <p className="mt-1 text-sm text-ink/55">Course section invitation</p>
        </div>

        <div className="card p-6">
          {checking ? (
            <Spinner label="Checking your session..." />
          ) : !details ? (
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-500" />
              <h2 className="mt-3 font-bold text-ink">Invitation unavailable</h2>
              <p className="mt-1 text-sm text-ink/55">
                {errorMessage ?? "This invitation is no longer valid."}
              </p>
              <p className="mt-2 text-xs text-ink/45">
                Please ask your TA for a new NUSkor invitation link.
              </p>
            </div>
          ) : result ? (
            result.ok ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                <h2 className="mt-3 font-bold text-ink">
                  {result.already ? "Already enrolled!" : "You're in!"}
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  {result.already ? (
                    <>
                      You are already enrolled in{" "}
                      <span className="font-semibold text-ink">
                        {details.course_code} → {details.section_code}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      You&apos;ve joined{" "}
                      <span className="font-semibold text-ink">
                        {details.course_code} → {details.section_code}
                      </span>
                      . Your student account has been created.
                    </>
                  )}
                </p>
                <button
                  className="btn-primary mt-4 w-full"
                  onClick={() => router.push("/dashboard")}
                >
                  <GraduationCap className="h-4 w-4" /> Go to dashboard
                </button>
              </div>
            ) : (
              <div className="text-center">
                <XCircle className="mx-auto h-10 w-10 text-red-500" />
                <h2 className="mt-3 font-bold text-ink">Couldn&apos;t join</h2>
                <p className="mt-1 text-sm text-ink/55">{result.message}</p>
              </div>
            )
          ) : !signedIn ? (
            <div>
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-deep">
                  You&apos;ve been invited to join
                </p>
                <h2 className="mt-1 text-lg font-bold text-ink">
                  {details.course_code} → {details.section_code}
                </h2>
                <p className="text-sm text-ink/60">{details.course_title}</p>
                <div className="mt-3 space-y-1.5 text-xs text-ink/55">
                  <p className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" />
                    {details.course_code} — {details.course_title}
                  </p>
                  <p className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Invited by {details.ta_name ?? "your TA"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5" />
                    Invitation created {formatDate(details.created_at)}
                  </p>
                </div>
              </div>

              <button
                className="btn-dark mt-5 w-full gap-3 py-3"
                onClick={signIn}
                disabled={busy}
              >
                <GoogleIcon />
                {busy
                  ? "Redirecting to Google..."
                  : "Continue with University Google Account"}
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed text-ink/45">
                You must sign in with your <b>@lhr.nu.edu.pk</b> Google account
                to join. This is your only sign-in step.
              </p>
            </div>
          ) : needsProfile ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                join(program.trim(), semester);
              }}
              className="space-y-4"
            >
              <p className="text-sm text-ink/55">
                Before you join, tell us a bit about yourself. This is saved
                once with your student record.
              </p>
              <div>
                <label className="label">Your program</label>
                <input
                  className="input"
                  list="invite-program-options"
                  placeholder="e.g. BSDS"
                  value={program}
                  onChange={(e) => setProgram(e.target.value.toUpperCase())}
                  disabled={busy}
                  required
                />
                <datalist id="invite-program-options">
                  {PROGRAMS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Current semester</label>
                <select
                  className="input"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  disabled={busy}
                  required
                >
                  <option value="">Select semester</option>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Joining..." : "Continue"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <Spinner label="Enrolling you in the section..." />
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink/40">
          NUSkor — TA Evaluation &amp; Marks Portal ·{" "}
          <Link href="/login" className="text-gold-deep hover:underline">
            Sign in instead
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}