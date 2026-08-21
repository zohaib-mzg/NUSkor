"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, GraduationCap, ShieldCheck, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const [busy, setBusy] = useState(false);
  const params = useSearchParams();
  const error = params.get("error");
  const flow = (params.get("flow") ?? "student") as "student" | "ta" | "admin";

  async function signInWithGoogle() {
    setBusy(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?flow=${flow}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          hd: "lhr.nu.edu.pk",
          prompt: "select_account",
        },
      },
    });
    if (error) setBusy(false);
  }

  const config = {
    student: {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "Sign in as Student",
      desc: "Access your marks, evaluation slots, and announcements.",
      buttonLabel: "Sign in as Student",
      buttonClass: "btn-dark",
    },
    ta: {
      icon: <Users className="h-6 w-6" />,
      title: "Login as TA",
      desc: "Manage sections, students, marks, and evaluations. Requires admin approval.",
      buttonLabel: "Continue with Google",
      buttonClass: "btn-primary",
    },
    admin: {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: "Admin Login",
      desc: "Manage TAs and view section analytics.",
      buttonLabel: "Sign in as Admin",
      buttonClass: "btn-dark",
    },
  }[flow];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-gold">
          <Image src="/logo.png" alt="NUSkor logo" fill sizes="40px" className="object-cover" />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-ink">
          NUS<span className="text-gold-deep">kor</span>
        </span>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="card w-full max-w-md p-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink/40 hover:text-ink/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
              {config.icon}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {config.title}
            </h1>
            <p className="mt-1 text-sm text-ink/55">{config.desc}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Sign-in failed. Please try again.
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className={`${config.buttonClass} w-full gap-3 py-3`}
          >
            {flow === "admin" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : flow === "ta" ? (
              <Users className="h-4 w-4" />
            ) : (
              <GoogleIcon />
            )}
            {busy ? "Redirecting to Google..." : config.buttonLabel}
          </button>

          {flow === "student" && (
            <p className="mt-5 text-center text-xs leading-relaxed text-ink/45">
              New students must first open the invitation link sent by their TA.
            </p>
          )}

          {flow === "ta" && (
            <p className="mt-5 text-center text-xs leading-relaxed text-ink/45">
              After signing in, you&apos;ll be asked to specify which course and
              section you teach. An admin will review your application.
            </p>
          )}

          {flow === "admin" && (
            <p className="mt-5 text-center text-xs leading-relaxed text-ink/45">
              Admin accounts are pre-configured. Contact the developer if you
              need access.
            </p>
          )}

          {/* Flow switcher */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink/40">
            {flow !== "student" && (
              <Link href="/login?flow=student" className="hover:text-ink/70">
                Student sign in
              </Link>
            )}
            {flow !== "ta" && (
              <Link href="/login?flow=ta" className="hover:text-ink/70">
                Login as TA
              </Link>
            )}
            {flow !== "admin" && (
              <Link href="/login?flow=admin" className="hover:text-ink/70">
                Admin
              </Link>
            )}
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-ink/40">
        NUSkor · Empowering Students. Elevating Futures.
      </footer>
    </div>
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
