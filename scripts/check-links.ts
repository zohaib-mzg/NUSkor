/**
 * Internal link checker over the public sitemap.
 *
 * Fetches every URL in /sitemap.xml, then follows every same-origin href found
 * in those pages and asserts each resolves below 400. Catches missing routes,
 * renamed slugs and typos in related-links blocks.
 *
 * Usage (against a production server):
 *   npm run build && npm run start   # in another terminal
 *   npm run check:links
 *
 * Exits with code 1 if any check fails.
 */

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

interface Failure {
  check: string;
  detail: string;
}

async function main() {
  const base = new URL(BASE);

  const sitemapRes = await fetch(new URL("/sitemap.xml", base));
  if (!sitemapRes.ok) {
    throw new Error(`sitemap.xml -> ${sitemapRes.status}`);
  }
  const xml = await sitemapRes.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  if (urls.length === 0) {
    throw new Error("sitemap.xml contains no <loc> entries");
  }

  const failures: Failure[] = [];
  const internalLinks = new Map<string, string>(); // pathname -> first page that linked it

  for (const url of urls) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      failures.push({ check: "sitemap URL", detail: `${url} -> ${res.status}` });
      continue;
    }
    const html = await res.text();
    const pagePath = new URL(url).pathname;

    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }
      let resolved: URL;
      try {
        resolved = new URL(href, url);
      } catch {
        continue;
      }
      if (resolved.origin !== base.origin) continue;
      resolved.hash = "";
      const pathname = resolved.pathname;
      if (pathname === pagePath) continue; // self-link
      if (!internalLinks.has(pathname)) internalLinks.set(pathname, pagePath);
    }
  }

  const sortedLinks = [...internalLinks.keys()].sort();
  console.log(
    `Sitemap URLs checked: ${urls.length}; unique internal links found: ${sortedLinks.length}\n`
  );

  for (const pathname of sortedLinks) {
    const res = await fetch(new URL(pathname, base), { redirect: "manual" });
    if (res.status >= 400) {
      failures.push({
        check: "internal link",
        detail: `${pathname} -> ${res.status} (linked from ${internalLinks.get(pathname)})`,
      });
    }
  }

  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) {
      console.log(`  FAIL  [${failure.check}] ${failure.detail}`);
    }
    console.log(`\n${failures.length} failure(s).`);
    process.exit(1);
  }

  console.log("All sitemap URLs and internal links resolve.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
