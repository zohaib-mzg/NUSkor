import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Crawler rules: allow the public site, disallow every private/account route.
 * Matches the middleware classification in src/lib/supabase/middleware.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/marks",
          "/evaluations",
          "/announcements",
          "/settings",
          "/ta",
          "/auth",
          "/login",
          "/access-denied",
          "/join",
          "/ta-apply",
          "/invite",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
