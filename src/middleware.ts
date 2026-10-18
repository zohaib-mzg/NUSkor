import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Thin wrapper — the public allow-list and the login/domain guards live in
 * `src/lib/supabase/middleware.ts` (see the route classification comment there
 * and PUBLIC_SITE_NOTES.md).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};