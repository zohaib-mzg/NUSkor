"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STUDENT_PORTAL_HREF } from "@/lib/site";

/**
 * The single student sign-in action used across public pages (prompt §7).
 *
 * Statically it renders "Login as Student"; on the client it upgrades to
 * "Go to Dashboard" when a Supabase session already exists. The check runs
 * only in an effect, so every public page stays statically rendered.
 * All instances on a page share one auth lookup.
 */
let authPromise: Promise<boolean> | null = null;

function hasSession(): Promise<boolean> {
  if (!authPromise) {
    authPromise = (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        return Boolean(data.user);
      } catch {
        // Missing env vars or offline — behave as signed out.
        return false;
      }
    })();
  }
  return authPromise;
}

export default function PortalButton({
  className,
  signedOutLabel = "Login as Student",
  signedInLabel = "Go to Dashboard →",
  onClick,
}: {
  className?: string;
  signedOutLabel?: ReactNode;
  signedInLabel?: ReactNode;
  onClick?: () => void;
}) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    void hasSession().then((ok) => {
      if (active) setAuthed(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href={authed ? "/dashboard" : STUDENT_PORTAL_HREF}
      className={className}
      onClick={onClick}
    >
      {authed ? signedInLabel : signedOutLabel}
    </Link>
  );
}
