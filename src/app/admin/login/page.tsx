"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "adminmzg@gmail.com";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrMsg("");

    if (email.toLowerCase() !== ADMIN_EMAIL) {
      setBusy(false);
      setErrMsg("Invalid admin credentials.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setBusy(false);
      setErrMsg("Invalid email or password.");
      return;
    }

    // Upsert profile with admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .upsert(
          { id: user.id, email: user.email, role: "admin", full_name: user.user_metadata?.full_name ?? null },
          { onConflict: "id" }
        );
    }

    window.location.href = "/admin";
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
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink/40 hover:text-ink/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Admin Login
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              Sign in with admin credentials. This is separate from student/TA login.
            </p>
          </div>

          {errMsg && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Admin Email</label>
              <input
                className="input"
                type="email"
                placeholder="admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn-dark w-full gap-2 py-3"
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {busy ? "Signing in..." : "Sign in as Admin"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-ink/45">
            Admin accounts are separate from student/TA accounts. Contact the
            developer if you need access.
          </p>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-ink/40">
        NUSkor · Empowering Students. Elevating Futures.
      </footer>
    </div>
  );
}
