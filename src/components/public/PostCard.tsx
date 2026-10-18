import Link from "next/link";
import { formatPostDate, type BlogPostMeta } from "@/lib/blog";

/** Server-only card used by the blog hub, category pages, home page and related lists. */
export default function PostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card group flex h-full flex-col p-5 transition-shadow hover:shadow-lift"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-deep">
        {post.category}
      </p>
      <h3 className="mt-2 font-bold leading-snug text-ink group-hover:underline">
        {post.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/55">
        {post.description}
      </p>
      <p className="mt-4 text-xs text-ink/40">
        {formatPostDate(post.date)} · {post.readingTime} min read
      </p>
    </Link>
  );
}
