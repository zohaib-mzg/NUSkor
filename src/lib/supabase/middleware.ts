import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_EMAIL = "adminmzg@gmail.com";
const PUBLIC_ROUTES = ["/", "/login", "/join", "/invite", "/access-denied", "/auth/callback", "/admin", "/admin/login", "/_next"];

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

  const isPublicOrApi =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.includes(".") ||
    pathname.startsWith("/api");

  if (!user) {
    if (!isPublicOrApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Application-level domain enforcement (Google auth is NOT authorization).
  // Admin email is exempt from domain check.
  const emailDomain = user.email?.toLowerCase().split("@")[1] ?? "";
  if (user.email?.toLowerCase() !== ADMIN_EMAIL && !emailDomain.endsWith("nu.edu.pk")) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/access-denied";
    return NextResponse.redirect(url);
  }

  // Signed-in users get redirected away from the login screen.
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = user.email?.toLowerCase() === ADMIN_EMAIL ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}