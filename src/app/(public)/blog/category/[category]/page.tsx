import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, getCategory, getPostsByCategory } from "@/lib/blog";
import PageHero from "@/components/public/PageHero";
import AdSlot from "@/components/public/AdSlot";
import RelatedLinks from "@/components/public/RelatedLinks";
import PostCard from "@/components/public/PostCard";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export const dynamicParams = false;

export function generateMetadata({
  params,
}: {
  params: { category: string };
}): Metadata {
  const category = getCategory(params.category);
  if (!category) return {};
  return {
    title: `${category.name} — guides`,
    description: category.blurb,
    alternates: { canonical: `/blog/category/${category.slug}` },
  };
}

export default function BlogCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = getCategory(params.category);
  if (!category) return null;

  const posts = getPostsByCategory(category.slug);
  const firstRow = posts.slice(0, 3);
  const remaining = posts.slice(3);

  return (
    <>
      <PageHero
        title={category.name}
        description={category.blurb}
        crumbs={[
          { name: "Blog", href: "/blog" },
          { name: category.name, href: `/blog/category/${category.slug}` },
        ]}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* Category switcher */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/blog/category/${c.slug}`}
              className={
                c.slug === category.slug
                  ? "rounded-full border border-gold bg-gold/15 px-3 py-1.5 text-xs font-semibold text-ink"
                  : "rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-gold hover:text-ink"
              }
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firstRow.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>

        {posts.length > firstRow.length && (
          <>
            <AdSlot variant="display" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {remaining.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}

        <div className="mt-14">
          <RelatedLinks
            links={[
              {
                href: "/blog",
                label: "All guides",
                description: "Every post across all categories, newest first.",
              },
              {
                href: "/tools",
                label: "Student tools",
                description:
                  "Nine working calculators — CGPA, GPA, attendance and more.",
              },
              {
                href: "/faq",
                label: "FAQ",
                description: "Common questions about using nuSkor.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
