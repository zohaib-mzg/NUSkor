"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const [busy, setBusy] = useState(false);
  const params = useSearchParams();
  const error = params.get("error");

  async function signInWithGoogle() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "lhr.nu.edu.pk",
          prompt: "select_account",
        },
      },
    });
    if (error) setBusy(false);
  }

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
          <div className="mb-6 text-center">
            <div className="relative mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full ring-4 ring-gold/30">
              <Image src="/logo.png" alt="NUSkor logo" fill sizes="64px" className="object-cover" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Welcome to NUSkor
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              Marks, evaluations &amp; bookings — all in one place.
            </p>
            <div className="mx-auto mt-3 flex max-w-[260px] items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-gold-deep" />
              <span className="text-[11px] font-medium text-ink/50">
                Restricted to @lhr.nu.edu.pk accounts
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Sign-in failed. Please try again.
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className="btn-dark w-full gap-3 py-3"
          >
            <GoogleIcon />
            {busy ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-ink/45">
            Only FAST-NUCES Lahore students &amp; TAs using their{" "}
            <span className="font-semibold text-ink/70">@lhr.nu.edu.pk</span>{" "}
            email can access this portal.
          </p>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-ink/40">
        NUSkor · Empowering Students. Elevating Futures.
      </footer>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
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