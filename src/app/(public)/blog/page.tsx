import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, formatPostDate, getAllPosts } from "@/lib/blog";
import PageHero from "@/components/public/PageHero";
import AdSlot from "@/components/public/AdSlot";
import RelatedLinks from "@/components/public/RelatedLinks";
import PostCard from "@/components/public/PostCard";
import CtaCard from "@/components/public/CtaCard";

export const metadata: Metadata = {
  title: "Blog — grades, study skills and university life guides",
  description:
    "Original guides from the nuSkor team: CGPA and GPA mechanics, study methods that survive exam week, university life and career skills.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;
  const firstRow = rest.slice(0, 3);
  const remaining = rest.slice(3);

  return (
    <>
      <PageHero
        title="The nuSkor blog"
        description="Practical, university-neutral guides on grades, study methods, university life and career skills — written for students anywhere."
        crumbs={[{ name: "Blog", href: "/blog" }]}
      />

      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/blog/category/${category.slug}`}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-gold hover:text-ink"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* Featured (latest) post */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="card group mt-8 block p-6 transition-shadow hover:shadow-lift sm:p-8"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-deep">
              Latest · {featured.category}
            </p>
            <h2 className="mt-2 max-w-3xl text-2xl font-extrabold tracking-tight text-ink group-hover:underline sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">
              {featured.description}
            </p>
            <p className="mt-4 text-xs text-ink/40">
              {formatPostDate(featured.date)} · {featured.readingTime} min read
            </p>
          </Link>
        )}

        {/* First row of the grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firstRow.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>

        <AdSlot variant="display" />

        {/* Remaining posts */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {remaining.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>

        <div className="mt-12">
          <CtaCard
            title="Reading about grades is useful. Seeing yours is better."
            description="Sign in to the nuSkor portal to view the marks your instructors publish, class statistics and your evaluation slots — the guides here explain the arithmetic."
          />
        </div>

        <div className="mt-14">
          <RelatedLinks
            links={[
              {
                href: "/tools/cgpa-calculator",
                label: "CGPA Calculator",
                description:
                  "Run every formula from these guides on your own numbers.",
              },
              {
                href: "/tools/gpa-calculator",
                label: "GPA Calculator",
                description:
                  "A fast single-semester average with an editable grade scale.",
              },
              {
                href: "/resources/cgpa-formula",
                label: "CGPA formula guide",
                description:
                  "The reference page behind the blog's grade arithmetic.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
