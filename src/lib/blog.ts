import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Blog content layer. Posts are MDX files in `src/content/blog` with
 * frontmatter. This module is server-only (uses fs) and feeds the /blog
 * routes, the sitemap, the home page's latest guides and the per-post OG
 * images (via `scripts/gen-blog-index.mjs` → `blog-index.json`).
 *
 * Date strings are fixed by hand and spread across recent months — never
 * generated at request time, so the content stays deterministic.
 */

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. "2026-07-06". */
  date: string;
  updated: string;
  category: string;
  tags: string[];
  readingTime: number;
  author: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

export const CATEGORIES: { name: string; slug: string; blurb: string }[] = [
  {
    name: "Grades & GPA",
    slug: "grades-gpa",
    blurb:
      "How grades, GPA and CGPA actually work — formulas, worked examples and planning strategies.",
  },
  {
    name: "Study Skills",
    slug: "study-skills",
    blurb:
      "Methods that survive exam week: recall, spacing, time-boxing and subject-specific tactics.",
  },
  {
    name: "University Life",
    slug: "university-life",
    blurb:
      "The non-academic syllabus: attendance rhythm, group projects, emails that work and settling in.",
  },
  {
    name: "Careers & Skills",
    slug: "careers-skills",
    blurb:
      "What to build alongside the degree — skills, projects and habits that compound.",
  },
];

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

function readPostFile(fileName: string): BlogPost {
  const raw = fs.readFileSync(path.join(BLOG_DIR, fileName), "utf8");
  const { data, content } = matter(raw);
  return {
    slug: fileName.replace(/\.mdx?$/, ""),
    title: String(data.title),
    description: String(data.description),
    date: String(data.date),
    updated: String(data.updated ?? data.date),
    category: String(data.category),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingTime: Number(data.readingTime ?? 6),
    author: String(data.author ?? "nuSkor Team"),
    content,
  };
}

/** All posts, newest first. */
export function getAllPosts(): BlogPostMeta[] {
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"));
  return files
    .map(readPostFile)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string): BlogPost | null {
  try {
    return readPostFile(`${slug}.mdx`);
  } catch {
    return null;
  }
}

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function getCategoryByName(name: string) {
  return CATEGORIES.find((c) => c.name === name) ?? null;
}

export function getPostsByCategory(categorySlug: string): BlogPostMeta[] {
  const name = getCategory(categorySlug)?.name;
  if (!name) return [];
  return getAllPosts().filter((p) => p.category === name);
}

/** Same-category posts first, then the newest elsewhere. */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return all.slice(0, limit);
  const sameCategory = all.filter(
    (p) => p.slug !== slug && p.category === current.category
  );
  const others = all.filter(
    (p) => p.slug !== slug && p.category !== current.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Slug for an H2 heading — matches what rehype-slug produces for plain
 * ASCII headings (lowercase, punctuation stripped, spaces to hyphens).
 */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Extract H2 headings for the table of contents. */
export function extractHeadings(content: string): { text: string; id: string }[] {
  const headings: { text: string; id: string }[] = [];
  const re = /^## (.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const text = match[1].trim();
    headings.push({ text, id: headingSlug(text) });
  }
  return headings;
}
