import type { Metadata } from "next";
import type { AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import {
  extractHeadings,
  formatPostDate,
  getAllPosts,
  getCategoryByName,
  getPost,
  getRelatedPosts,
} from "@/lib/blog";
import { SITE } from "@/lib/site";
import { blogPostingSchema } from "@/lib/schema";
import JsonLd from "@/components/public/JsonLd";
import Breadcrumbs from "@/components/public/Breadcrumbs";
import Prose from "@/components/public/Prose";
import AdSlot from "@/components/public/AdSlot";
import Callout from "@/components/public/Callout";
import CtaCard from "@/components/public/CtaCard";
import PostCard from "@/components/public/PostCard";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const category = getCategoryByName(post.category);
  const headings = extractHeadings(post.content);
  const related = getRelatedPosts(post.slug, 3);

  const url = `${SITE.url}/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(post.title);
  const shareLinks = [
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ];

  return (
    <>
      <JsonLd
        data={blogPostingSchema({
          title: post.title,
          description: post.description,
          path: `/blog/${post.slug}`,
          datePublished: post.date,
          dateModified: post.updated,
        })}
      />

      {/* Header */}
      <section className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:pt-12">
          <Breadcrumbs
            items={[
              { name: "Blog", href: "/blog" },
              { name: post.title, href: `/blog/${post.slug}` },
            ]}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {category ? (
              <Link
                href={`/blog/category/${category.slug}`}
                className="badge bg-gold/15 text-gold-deep hover:bg-gold/25"
              >
                {post.category}
              </Link>
            ) : (
              <span className="badge bg-gold/15 text-gold-deep">
                {post.category}
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/60">
            {post.description}
          </p>
          <p className="mt-4 text-xs text-ink/40">
            {post.author} · {formatPostDate(post.date)} · {post.readingTime} min
            read
            {post.updated !== post.date
              ? ` · Updated ${formatPostDate(post.updated)}`
              : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {shareLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-ink/60 transition-colors hover:border-gold hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <Prose className="max-w-none">
            <MDXRemote
              source={post.content}
              components={{
                AdSlot,
                Callout,
                a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
                  <Link href={props.href ?? "#"}>{props.children}</Link>
                ),
              }}
              options={{ mdxOptions: { rehypePlugins: [rehypeSlug] } }}
            />
          </Prose>

          <div className="mt-10">
            <CtaCard />
          </div>

          <AdSlot variant="display" />

          {/* Related posts */}
          <section aria-label="Related guides">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Related guides
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <PostCard key={item.slug} post={item} />
              ))}
            </div>
            <p className="mt-6">
              <Link
                href="/blog"
                className="text-sm font-semibold text-gold-deep hover:underline"
              >
                Browse all guides →
              </Link>
            </p>
          </section>
        </div>

        {/* Table of contents */}
        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                On this page
              </p>
              <ul className="mt-3 space-y-1.5">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="block border-l-2 border-transparent pl-3 text-sm leading-snug text-ink/55 transition-colors hover:border-gold hover:text-ink"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}
