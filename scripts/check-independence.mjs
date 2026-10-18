/**
 * Independence acceptance check (prompt §1B).
 *
 * 1. Source scan — the forbidden terms must not appear anywhere on the public
 *    side of the app (login/portal/admin files are exempt: they are the
 *    existing product and are not part of the public site).
 * 2. Runtime scan — every URL in /sitemap.xml must render the independence
 *    footer line.
 * 3. Auth surfaces (/login, /admin/login) must not contain ad scripts.
 *
 * Usage (against a production server):
 *   npm run build && npm run start   # in another terminal
 *   npm run check:independence
 *
 * Exits with code 1 if any check fails.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

/** Exact brand string — matched case-sensitively so lowercase "fast" is fine. */
const TERM_CASE_SENSITIVE = ["FAST"];

/** Matched case-insensitively. */
const TERMS = [
  "NUCES",
  "nu.edu.pk",
  "Lahore",
  "campus",
  "probation",
  "admission",
  "merit",
  "prospectus",
  "registrar",
  "Dean's List",
  "Rector",
  "FAST.png",
  "NU-logo",
  "111-128-128",
  "Rohtas",
];

const SOURCE_DIRS = [
  "src/app/(public)",
  "src/components/public",
  "src/content/blog",
];

const SOURCE_FILES = [
  "src/lib/schema.ts",
  "src/lib/grading.ts",
  "src/lib/blog.ts",
  "src/lib/tools.ts",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
];

const EXTENSIONS = new Set([".ts", ".tsx", ".mdx", ".json"]);

const INDEPENDENCE_FRAGMENT =
  "not affiliated with, endorsed by, or operated by any university";

let failures = 0;

function fail(message) {
  failures++;
  console.log(`  FAIL  ${message}`);
}

function pass(message) {
  console.log(`  PASS  ${message}`);
}

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

console.log(`Independence checks against ${BASE}\n`);

console.log("1) Source scan (forbidden terms):");
const files = [
  ...SOURCE_DIRS.flatMap((dir) => collectFiles(dir)),
  ...SOURCE_FILES.filter((file) => fs.existsSync(file)),
];
let sourceHits = 0;
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const term of TERM_CASE_SENSITIVE) {
      if (line.includes(term)) {
        sourceHits++;
        fail(`${file}:${index + 1} contains "${term}" -> ${line.trim()}`);
      }
    }
    const haystack = line.toLowerCase();
    for (const term of TERMS) {
      if (haystack.includes(term.toLowerCase())) {
        sourceHits++;
        fail(`${file}:${index + 1} contains "${term}" -> ${line.trim()}`);
      }
    }
  });
}
if (sourceHits === 0) {
  pass(`scanned ${files.length} files — no forbidden terms`);
}

console.log("\n2) Runtime: independence footer on every sitemap URL:");
try {
  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  const xml = await sitemapRes.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let missing = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      if (!html.includes(INDEPENDENCE_FRAGMENT)) {
        missing++;
        fail(`${url} is missing the independence footer line`);
      }
    } catch (error) {
      missing++;
      fail(`${url} -> network error: ${error.message}`);
    }
  }
  if (missing === 0) {
    pass(`independence footer present on all ${urls.length} sitemap URLs`);
  }
} catch (error) {
  fail(`sitemap.xml -> network error: ${error.message}`);
}

console.log("\n3) Auth surfaces carry no ad scripts:");
for (const route of ["/login", "/admin/login"]) {
  try {
    const res = await fetch(`${BASE}${route}`);
    const html = await res.text();
    if (html.includes("adsbygoogle")) {
      fail(`${route} contains "adsbygoogle"`);
    } else {
      pass(`${route} contains no ad script`);
    }
  } catch (error) {
    fail(`${route} -> network error: ${error.message}`);
  }
}

console.log(
  failures === 0
    ? "\nAll independence checks passed."
    : `\n${failures} independence check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
