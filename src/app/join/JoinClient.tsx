"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, LogIn, CheckCircle2, XCircle, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { one } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

const PROGRAMS = [
  "BSCS",
  "BSDS",
  "BSCY",
  "BSAI",
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

export default function JoinClient({
  initialToken,
  missing,
}: {
  initialToken: string;
  missing: boolean;
}) {
  return (
    <ToastProvider>
      <JoinInner initialToken={initialToken} missing={missing} />
    </ToastProvider>
  );
}

function JoinInner({
  initialToken,
  missing,
}: {
  initialToken: string;
  missing: boolean;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [result, setResult] = useState<
    | { ok: true; section: string }
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
      if (!cancelled) {
        setSignedIn(!!user);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const join = useCallback(
    async (code: string, pProgram?: string, pSemester?: string) => {
      const t = code.trim();
      if (!t) return;
      setBusy(true);
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("join_section", {
        p_token: t,
        p_program: pProgram || null,
        p_semester: pSemester || null,
      });
      setBusy(false);
      if (err) {
        setResult({ ok: false, message: err.message });
        return;
      }
      const res = data as { section_id: string; already_enrolled: boolean } | null;
      const sectionId = res?.section_id;
      const { data: sec } = await supabase
        .from("course_sections")
        .select("section_code, course:courses(code)")
        .eq("id", sectionId)
        .maybeSingle();
      const secRow = sec as
        | { section_code: string; course?: { code: string }[] | null }
        | null;
      const s = one(secRow?.course);
      setResult({
        ok: true,
        section: s
          ? `${s.code ?? "Course"} → ${secRow?.section_code ?? ""}`
          : "your section",
      });
    },
    []
  );

  // Deep-linked tokens (?t=...) are prefilled into the input below; joining
  // always requires an explicit click so first-timers fill their profile
  // fields first.

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink">
            NUS<span className="text-gold-deep">kor</span>
          </h1>
          <p className="mt-1 text-sm text-ink/55">Join a course section</p>
        </div>

        <div className="card p-6">
          {checking ? (
            <Spinner label="Checking your session..." />
          ) : missing && signedIn ? (
            <div className="text-center">
              <UserX className="mx-auto h-10 w-10 text-ink/40" />
              <h2 className="mt-3 font-bold text-ink">Student Account Not Found</h2>
              <p className="mt-1 text-sm text-ink/55">
                You need an invitation from your TA to join NUSkor. Please ask
                your TA to send you a NUSkor invitation link.
              </p>
              <p className="mt-3 text-xs text-ink/45">
                Are you a teaching assistant?{" "}
                <Link
                  href="/ta-apply"
                  className="font-semibold text-gold-deep hover:underline"
                >
                  Request TA access instead
                </Link>
              </p>
              <form action="/auth/signout" method="post" className="mt-4">
                <button type="submit" className="btn-outline w-full">
                  <LogIn className="h-4 w-4" /> Back to Login
                </button>
              </form>
            </div>
          ) : !signedIn ? (
            <div className="text-center">
              <Link2 className="mx-auto h-10 w-10 text-gold-deep" />
              <h2 className="mt-3 font-bold text-ink">Sign in to join</h2>
              <p className="mt-1 text-sm text-ink/55">
                You need a NUS account to enroll in a section.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/join?token=${token || ""}`)}`}
                className="btn-primary mt-4 w-full"
              >
                <LogIn className="h-4 w-4" /> Sign in with Google
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {result ? (
                result.ok ? (
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                    <h2 className="mt-3 font-bold text-ink">You&apos;re in!</h2>
                    <p className="mt-1 text-sm text-ink/55">
                      Enrolled in <span className="font-semibold text-ink">{result.section}</span>.
                    </p>
                    <button className="btn-primary mt-4 w-full" onClick={() => router.push("/dashboard")}>
                      Go to dashboard
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <XCircle className="mx-auto h-10 w-10 text-red-500" />
                    <h2 className="mt-3 font-bold text-ink">Couldn&apos;t join</h2>
                    <p className="mt-1 text-sm text-ink/55">{result.message}</p>
                  </div>
                )
              ) : (
                <>
                  <div>
                    <label className="label">Invitation code</label>
                    <input
                      className="input font-mono"
                      placeholder="e.g. NUS-A1B2C3D4E5"
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="label">Your program</label>
                    <select
                      className="input"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select program</option>
                      {PROGRAMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Current semester</label>
                    <select
                      className="input"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select semester</option>
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn-primary w-full"
                    onClick={() => join(token, program, semester)}
                    disabled={busy || !token.trim() || !program.trim() || !semester}
                  >
                    {busy ? "Joining..." : "Join section"}
                  </button>
                  <p className="text-center text-xs text-ink/45">
                    If you don&apos;t have a code, ask your TA.{" "}
                    {initialToken && (
                      <button
                        className="font-semibold text-gold-deep hover:underline"
                        onClick={() => {
                          setToken("");
                          setResult(null);
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink/40">
          NUSkor — TA Evaluation & Marks Portal
        </p>
      </div>
    </main>
  );
}