/**
 * Regenerates src/lib/blog-index.json from the MDX frontmatter.
 * The JSON is imported by the edge-runtime per-post OG image route, which
 * cannot read the filesystem. Run after adding or renaming posts:
 *
 *   npm run gen:blog
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const dir = path.join(process.cwd(), "src", "content", "blog");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

const posts = files
  .map((f) => {
    const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    return {
      slug: f.replace(/\.mdx$/, ""),
      title: String(data.title),
      description: String(data.description),
      category: String(data.category),
      date: String(data.date),
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const out = path.join(process.cwd(), "src", "lib", "blog-index.json");
fs.writeFileSync(out, `${JSON.stringify(posts, null, 2)}\n`);
console.log(`wrote ${posts.length} posts to src/lib/blog-index.json`);
