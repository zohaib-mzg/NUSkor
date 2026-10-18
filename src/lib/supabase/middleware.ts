import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_EMAIL = "adminmzg@gmail.com";

/**
 * Route classification for the middleware (see PUBLIC_SITE_NOTES.md).
 *
 * PUBLIC — no login required, and the sign-in domain check is bypassed. These
 * are the university-neutral public pages plus static files, and they are the
 * only routes that may ever load ads:
 *   /  /about  /contact  /privacy-policy  /terms  /disclaimer  /cookie-policy
 *   /features*  /how-it-works  /for-students  /for-tas  /faq  /glossary
 *   /blog*  /tools*  /resources*  /updates
 *   (+ any path containing a "." — sitemap.xml, robots.txt, ads.txt, images…)
 *
 * APP FLOW — reachable signed-out exactly as before (auth + account flows):
 *   /login  /admin/login  /join  /invite*  /ta-apply  /access-denied  /auth*
 *
 * GUARDED — redirect to /login when signed out. Sanity check: every (portal)
 * route and /admin (except /admin/login) stays protected. Proven at runtime
 * by `scripts/check-guards.mjs` (run against `npm run start` in Phase 6):
 *   /dashboard  /marks  /evaluations  /announcements  /settings  /ta*  /admin*
 */
const PUBLIC_PREFIXES = [
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/disclaimer",
  "/cookie-policy",
  "/features",
  "/how-it-works",
  "/for-students",
  "/for-tas",
  "/faq",
  "/glossary",
  "/blog",
  "/tools",
  "/resources",
  "/updates",
];

const APP_FLOW_PREFIXES = [
  "/login",
  "/admin/login",
  "/join",
  "/invite",
  "/ta-apply",
  "/access-denied",
  "/auth",
];

const GUARDED_PREFIXES = [
  "/dashboard",
  "/marks",
  "/evaluations",
  "/announcements",
  "/settings",
  "/ta",
  "/admin",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    matchesPrefix(pathname, PUBLIC_PREFIXES) ||
    pathname.includes(".");

  const isAppFlow = matchesPrefix(pathname, APP_FLOW_PREFIXES);
  const isGuarded =
    !isPublic && !isAppFlow && matchesPrefix(pathname, GUARDED_PREFIXES);

  if (!user) {
    if (isGuarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Application-level domain enforcement (Google auth is NOT authorization).
  // Admin email is exempt from the domain check. Only @lhr.nu.edu.pk is allowed.
  // Public pages bypass this guard — they are open to everyone.
  if (!isPublic) {
    const emailDomain = user.email?.toLowerCase().split("@")[1] ?? "";
    if (
      user.email?.toLowerCase() !== ADMIN_EMAIL &&
      emailDomain !== "lhr.nu.edu.pk"
    ) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/access-denied";
      return NextResponse.redirect(url);
    }
  }

  // Signed-in users get redirected away from the login screen.
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname =
      user.email?.toLowerCase() === ADMIN_EMAIL ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
