import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

const ADMIN_EMAIL =
  (process.env.ADMIN_EMAIL ?? "").toLowerCase() || "l242530@lhr.nu.edu.pk";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const flow = searchParams.get("flow");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (flow === "ta") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const isDesignatedAdmin =
            user.email?.toLowerCase() === ADMIN_EMAIL;
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          const alreadyAdmin =
            (profile as { role?: string } | null)?.role === "admin";
          if (isDesignatedAdmin || alreadyAdmin) {
            await supabase
              .from("profiles")
              .update({ role: "admin" })
              .eq("id", user.id);
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const redirectTo =
        forwardedHost && !isLocalEnv
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`;
      return NextResponse.redirect(redirectTo);
    }
    if (error.message.toLowerCase().includes("email")) {
      return NextResponse.redirect(`${origin}/access-denied`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}