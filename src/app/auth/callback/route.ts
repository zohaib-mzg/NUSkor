import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const flow = searchParams.get("flow");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // ── TA flow: everyone goes through TA application ──
        if (flow === "ta") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .maybeSingle();
          const currentRole = (profile as { role?: string } | null)?.role;

          // If already an approved TA, go straight to dashboard
          if (currentRole === "ta") {
            // fall through to default redirect
          } else {
            // Check existing application status
            const email = user.email?.toLowerCase() ?? "";
            const { data: existing } = await supabase
              .from("ta_applications")
              .select("id, status")
              .eq("user_id", user.id)
              .maybeSingle();

            if (!existing) {
              // No application yet — create one
              const { error: applyErr } = await supabase
                .from("ta_applications")
                .insert({
                  user_id: user.id,
                  email,
                  full_name: user.user_metadata?.full_name ?? null,
                  status: "pending",
                  requested_at: new Date().toISOString(),
                });
              if (applyErr) {
                return NextResponse.redirect(
                  forwardedRedirect(request, origin, "/login?error=apply", next)
                );
              }
            }
            // Whether pending, rejected, or already exists — always go to
            // the TA application page which handles all statuses.
            return NextResponse.redirect(forwardedRedirect(request, origin, "/ta-apply", next));
          }
        }

        // ── Default redirect ──
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";
        const redirectTo =
          forwardedHost && !isLocalEnv
            ? `https://${forwardedHost}${next}`
            : `${origin}${next}`;
        return NextResponse.redirect(redirectTo);
      }
    }
    if (error?.message.toLowerCase().includes("email")) {
      return NextResponse.redirect(`${origin}/access-denied`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

function forwardedRedirect(
  request: NextRequest,
  origin: string,
  path: string,
  next: string
) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const base = forwardedHost && !isLocalEnv ? `https://${forwardedHost}` : origin;
  return `${base}${path}${next && next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;
}
