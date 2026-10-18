import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { CATEGORIES, getAllPosts } from "@/lib/blog";

/**
 * Sitemap for the public (university-neutral) side of nuSkor.
 * Private routes (portal, admin, auth, account flows) are never listed here —
 * see src/app/robots.ts for the matching disallow rules.
 */

const STATIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: "weekly" | "monthly";
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/tools", priority: 0.9, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/resources", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features", priority: 0.7, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/for-students", priority: 0.7, changeFrequency: "monthly" },
  { path: "/for-tas", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/glossary", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/updates", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/features/marksheet", priority: 0.6, changeFrequency: "monthly" },
  { path: "/features/evaluation-slots", priority: 0.6, changeFrequency: "monthly" },
  { path: "/features/leaderboard", priority: 0.6, changeFrequency: "monthly" },
  { path: "/features/announcements", priority: 0.6, changeFrequency: "monthly" },
  { path: "/features/csv-import", priority: 0.6, changeFrequency: "monthly" },
  { path: "/features/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/resources/gpa-scale-explained", priority: 0.7, changeFrequency: "monthly" },
  { path: "/resources/cgpa-formula", priority: 0.7, changeFrequency: "monthly" },
  { path: "/resources/study-resources", priority: 0.6, changeFrequency: "monthly" },
  { path: "/resources/evaluation-prep-checklist", priority: 0.6, changeFrequency: "monthly" },
  { path: "/resources/ta-guide", priority: 0.6, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
  { path: "/disclaimer", priority: 0.2, changeFrequency: "monthly" },
  { path: "/cookie-policy", priority: 0.2, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const toolEntries: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: `${SITE.url}/tools/${tool.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE.url}/blog/${post.slug}`,
    lastModified: new Date(`${post.updated}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogCategoryEntries: MetadataRoute.Sitemap = CATEGORIES.map(
    (category) => ({
      url: `${SITE.url}/blog/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })
  );

  return [
    ...staticEntries,
    ...toolEntries,
    ...blogEntries,
    ...blogCategoryEntries,
  ];
}
