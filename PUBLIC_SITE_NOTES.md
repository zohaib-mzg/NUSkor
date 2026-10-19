# nuSkor Public Site — Notes & Decisions

Working notes for the "nuSkor Public Pages + Ads" build (see `NUSKOR_PUBLIC_PAGES_PROMPT.md`).
Branch: `feat/public-pages` — commit after every phase. **Nothing is pushed until the owner says so.**

## What existed before (Phase 0 findings)

- Next.js 14 App Router project. Private area: `(portal)` (dashboard, marks, evaluations,
  announcements, settings, `ta/*`, `admin/*`) plus `login`, `admin/login`, `join`, `invite`,
  `ta-apply`, `access-denied`, `auth/*`.
- Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`) refreshed the session and
  enforced the university domain on sign-in. **Bug found:** the old `PUBLIC_ROUTES` list contained
  `"/"` and was matched with `startsWith`, so the login guard effectively never triggered. It has
  been rebuilt properly (guarded prefixes are listed in the file itself).
- Design tokens: Tailwind `gold #F5C518`, `ink`, `paper`; utility classes `.card`, `.btn-*`,
  `.input` in `globals.css`. Logo: `/logo.png`.
- Docs referenced by the prompt (`NUSKOR_CONTEXT.md`, `NUSKOR_MASTER_PROMPT.md`,
  `RESTORE_LOGIN_GATE.md`) do not exist in the repo → the codebase itself was treated as the
  source of truth. `.env.example` already existed (portal vars) and was extended with the
  public-site and AdSense variables (Phase 2).

## Ground rules applied (prompt §1A / §1B — these override everything)

- The public site is **university-neutral and independent**: no university names, campuses,
  policies, admissions or branded imagery on public pages. Only the untouched login/portal
  internals keep their university-domain logic.
- Independence line rendered in the public footer on every public page.
- Tools use **editable scales** (the common 4.0 scale is only a default); calculator inputs stay
  in the browser.
- Ads never load on `login`, `admin`, `auth`, `access-denied` or `(portal)` pages.
- Original copy only; hedged facts; fixed "Last updated" strings.

## Decisions made

- **Contact email**: confirmed by the owner — `zohaib.mzg158@gmail.com`. Used as the code
  fallback and in `.env.example`; still overridable via `NEXT_PUBLIC_CONTACT_EMAIL`.
- **Allow-list location**: the route allow-list lives in `src/lib/supabase/middleware.ts` (where
  the previous `PUBLIC_ROUTES` was); `src/middleware.ts` remains a thin wrapper.
- **Ads + cookie consent** are wired into `(public)/layout.tsx` in Phase 2 so every intermediate
  commit builds green (Phase 1 layout ships header/footer only).
- **Developer banner** ("Also from the developer: Travel Vista") stays above all pages — it is a
  visible link, not an ad, and carries no university branding.
- **Blog dates**: fixed date strings spread across the last 3 months, per prompt instruction.
- **Landing page** was moved from `src/app/page.tsx` to `src/app/(public)/page.tsx` (URL `/`
  unchanged) and rewritten neutral (new student-first copy arrives fully in Phase 4).
- **Copyright year** is computed at render time (build) in the public footer.
- **SEO**: `sitemap.ts` + `robots.ts` live at the app root and list only public routes; `(portal)`,
  `login` and `admin/login` layouts are `noindex, nofollow`; the default Open Graph image is the
  brand-yellow card in `(public)/opengraph-image.tsx` (blog posts get their own in Phase 4c).
  GSC verification is supported via `NEXT_PUBLIC_GSC_VERIFICATION`.
- **OG image runtime**: the `(public)` Open Graph image runs on the edge runtime — a workaround
  for a Windows-only path bug in `@vercel/og`'s Node runtime during `next build`; the route is
  therefore dynamic (rendered on demand), which is normal for OG images.
- **Calc checks**: `tsx` added as a devDependency with `npm run check:calcs`
  (`scripts/check-calcs.ts`) covering the worked example (3 CH A + 3 CH B- + 4 CH C+ = 2.93),
  guards (NaN / zero / negative inputs) and every pure function in `src/lib/calc/*`.
- **Tool page ads**: display unit sits after the whole tool card; the in-article unit lives inside
  the explainer prose. Neither ever sits between inputs and results.
- **Grade scale**: `src/lib/grading.ts` holds a commonly used 4.0 scale purely as an editable
  default; every tool that reads grade points renders the "Use my university's scale" editor.
- **Contact**: email only (`zohaib.mzg158@gmail.com`), never a university address. The contact
  form is a client-side `mailto:` composer with a hidden honeypot field — no server endpoint,
  consistent with the no-backend-for-advisors decision.
- **Feature mockups**: CSS-built, fictional, always labelled "Sample data" (`SampleMockup.tsx`).
  No screenshots of real users, no real names.
- **Legal pages carry no ads** and no ad-adjacent components; every content page has a soft CTA
  card (`CtaCard.tsx`) instead.
- **Glossary** ships 43 terms with `DefinedTermSet` JSON-LD; **FAQ** ships 28 Qs in 7 groups with
  one `FAQPage` schema for the whole page.
- **Blog**: 18 original MDX posts (4 categories: Grades & GPA, Study Skills, University Life,
  Careers & Skills). Dates are fixed hand-written strings, spread July–October 2026 — never
  generated at build time. Post pages carry a TOC (H2 anchors), reading time, plain share links
  (no SDKs), 2 in-article ad slots inside the MDX + 1 display slot before related posts, and
  `BlogPosting` + breadcrumb JSON-LD. **After adding/renaming posts run `npm run gen:blog`** —
  it regenerates `src/lib/blog-index.json`, which the edge OG image route imports (edge cannot
  read the filesystem).
- **Blog headings**: TOC anchors are produced by rehype-slug and mirrored by `headingSlug()` in
  `src/lib/blog.ts`. Keep H2 text plain (single spaces) — an em dash surrounded by spaces would
  produce a double hyphen in the anchor.
- **Home page**: one display ad between the tools grid and the guides, "Latest guides" (newest 3
  posts, auto-updating), and a 5-question FAQ teaser that renders `FAQPage` JSON-LD.
- **Funnel (Phase 5)**: one auth-aware `PortalButton` client component is the single "Student
  Portal" action (header, footer, CtaCard, home hero + final CTA, mobile bar). It renders
  "Student Portal" statically and upgrades to "Go to Dashboard" after a client-side session
  check (one shared Supabase `getUser()` per page load) — static rendering is untouched.
  `MobilePortalBar` is a fixed bottom bar on <sm, with a spacer in the layout so it never covers
  the footer. Soft CTA after every tool result (inside `ToolShell`) and at the end of every post.
  The admin login link exists only in the public footer.
- **Quality gates (Phase 6)**: three runnable checks against `npm run start` —
  `npm run check:guards` (public 200 / guarded redirect / flow reachable / no ads on auth
  surfaces), `npm run check:independence` (source term scan + independence footer line on every
  sitemap URL + no ad scripts on `/login` + `/admin/login`), and `npm run check:links` (every
  sitemap URL plus every same-origin link found on those pages resolves < 400). All green in
  this build.
- **Lighthouse** was not run in this environment (no throttled Chrome available). Run it on `/`,
  a tool page and a blog post before launch — targets: Performance ≥ 90 mobile (ads off),
  SEO 100, Accessibility ≥ 95. Static generation is already in place; only the calculators,
  consent banner, portal button and ads are client islands.

## Route plan (target 35+)

| Area | Routes |
|---|---|
| Core/trust | `/`, `/about`, `/contact`, `/privacy-policy`, `/terms`, `/disclaimer`, `/cookie-policy` |
| Product | `/features` + 6 sub-pages, `/how-it-works`, `/for-students`, `/for-tas`, `/updates` |
| Tools | `/tools` + 9 calculators (CGPA, GPA, final grade, course total, improvement planner, attendance, grade-point converter, weighted percentage, semester planner) |
| Resources | `/resources` + gpa-scale-explained, cgpa-formula, study-resources, evaluation-prep-checklist, ta-guide |
| Reference | `/glossary` (35+ terms), `/faq` (25+ Qs) |
| Blog | `/blog` + 18 posts |

## Guard map (middleware)

- **Public (no login, ads allowed):** `/`, `/about`, `/contact`, `/privacy-policy`, `/terms`,
  `/disclaimer`, `/cookie-policy`, `/features*`, `/how-it-works`, `/for-students`, `/for-tas`,
  `/faq`, `/glossary`, `/blog*`, `/tools*`, `/resources*`, `/updates`, plus static files
  (`.` in path: sitemap.xml, robots.txt, ads.txt, manifest, og images).
- **App flow (middleware leaves them reachable logged-out, no ads):** `/login`, `/admin/login`,
  `/join`, `/invite`, `/access-denied`, `/auth/*`. (`/ta-apply` sits in this list in the
  middleware, but the page itself requires a signed-in user and redirects to `/login` — the
  guard check asserts it as guarded.)
- **Guarded (redirect to `/login` when logged out):** `/dashboard`, `/marks`, `/evaluations`,
  `/announcements`, `/settings`, `/ta`, `/admin` (except `/admin/login`).

Runtime proof (all must pass against `npm run start`):
`npm run check:guards`, `npm run check:independence`, `npm run check:links`.

## Owner TODOs (do these before/at launch)

1. **Custom domain.** Buy a nuSkor-based domain, connect it in Vercel, set
   `NEXT_PUBLIC_SITE_URL=https://<domain>` and redeploy. AdSense does **not** approve
   `*.vercel.app` sites. Canonicals, sitemap, OG image URLs and the share links all follow
   `NEXT_PUBLIC_SITE_URL` — set it before applying.
2. **AdSense.** Publisher ID received: `ca-pub-8713827731867413` — now in `public/ads.txt` and
   in the gitignored `.env.local`. **Current status (owner):** account exists, but the site is
   not verified and the application has not been submitted yet. Order of operations:
   custom domain live → deploy → add the domain in AdSense → verify via **ads.txt** (the file is
   ready at the domain root) → submit for review → after approval, create the three ad units
   (display / in-article / multiplex) and send their slot IDs. Vercel env vars to set:
   `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8713827731867413` plus
   `NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY`, `NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE`,
   `NEXT_PUBLIC_ADSENSE_SLOT_MULTIPLEX`. Ads stay invisible until the slot IDs exist — the site
   is safe by default.
3. **Search Console.** Set `NEXT_PUBLIC_GSC_VERIFICATION`, verify the domain, submit
   `/sitemap.xml`.
4. **Contact email.** Keep `zohaib.mzg158@gmail.com` or change via
   `NEXT_PUBLIC_CONTACT_EMAIL` — never a university address anywhere on the public side.
5. **Legal review.** Have someone qualified read `/privacy-policy`, `/terms`, `/disclaimer` and
   `/cookie-policy` once; adjust wording/jurisdiction as advised.
6. **Screenshots.** Feature pages currently use labelled CSS mockups ("Sample data"). Replace
   with real screenshots later if desired — keep real names and emails out of any image.
7. **Lighthouse run.** Mobile Lighthouse on `/`, `/tools/cgpa-calculator` and
   `/blog/how-cgpa-is-calculated`: Performance ≥ 90 (ads off), SEO 100, Accessibility ≥ 95.

## AdSense approval checklist

- [ ] Custom domain live over HTTPS; `NEXT_PUBLIC_SITE_URL` points at it; canonicals follow.
- [ ] Required pages exist: About, Contact, Privacy, Terms, Disclaimer, Cookie policy ✓ (built).
- [ ] Original, useful content on every page ✓ (18 posts, 9 tools, 5 resource guides, glossary,
      28-question FAQ).
- [x] `public/ads.txt` contains the real `pub-` id (`pub-8713827731867413`).
- [ ] AdSense account: site added and verified. **Use the ads.txt method** — the crawler will
      not see the consent-gated script tag in the HTML. Requires the custom domain to be live
      first (`/ads.txt` must resolve at the domain root).
- [ ] Application submitted for review (wait for approval before creating ad units).
- [ ] Three ad units created (display / in-article / multiplex) → slot env vars set.
- [ ] Consent flow already gates ad loading (ads only after "Accept").
- [ ] No ads on legal/contact/404/login/portal pages ✓ (enforced by layout; covered by checks).
- [ ] After approval: accept cookies on the live site and confirm units fill; reserved heights
      prevent layout shift.

## How to add a blog post (5 steps)

1. Create `src/content/blog/<slug>.mdx` (the filename is the URL slug) with frontmatter:
   `title`, `description`, `date`, `updated` (fixed strings — never generated), `category`
   (must exactly match one of the four names in `src/lib/blog.ts`), `tags`, `readingTime`,
   `author: "nuSkor Team"`.
2. Write the body: introduction, optionally `<AdSlot variant="in-article" />` after the intro
   and again mid-article, H2/H3 sections, an FAQ section, and links to at least two tools or
   posts. Keep H2 text plain (no em dashes with spaces — see the heading note above).
3. Run `npm run gen:blog` (regenerates `src/lib/blog-index.json` for the OG images).
4. `npm run build` — the post appears on `/blog`, its category page and the sitemap
   automatically.
5. Verify with `npm run start` + `npm run check:links`, and eyeball the post's
   `/blog/<slug>/opengraph-image`.

## How to add a tool (5 steps)

1. Add the pure calculation to `src/lib/calc/` (no DOM, no React) with a sensible default scale
   from `src/lib/grading.ts`.
2. Register the tool in `TOOLS` in `src/lib/tools.ts` (slug, title, blurb) — the hub, home grid
   and sitemap pick it up automatically.
3. Build the client component in `src/components/public/tools/` and the page in
   `src/app/(public)/tools/<slug>/page.tsx` using `ToolShell` (explainer ≥ 300 words, FAQ,
   related links, `TOOLS_LAST_REVIEWED` line).
4. Add cases for the new function to `scripts/check-calcs.ts` and run `npm run check:calcs`.
5. `npm run build`, then `npm run check:links` + `npm run check:independence` against
   `npm run start`.

## Status log

- [x] Phase 0 — repo read, plan written, branch created
- [x] Phase 1 — `(public)` route group, neutral home, PublicHeader/PublicFooter, middleware allow-list, 404/error
- [x] Phase 2 — ads infrastructure (env, AdSenseScript, AdSlot, CookieConsent, ads.txt)
- [x] Phase 3 — SEO foundation (sitemap, robots, JSON-LD, OG image, noindex on private layouts)
- [x] Phase 4a — tools: 9 working calculators + `/tools` hub, `src/lib/calc/*` pure functions,
  `src/lib/grading.ts`, shared content components (ToolShell, FAQ, RelatedLinks, Prose, Callout,
  PageHero), `npm run check:calcs` all green, lint + build green (47 pages)
- [x] Phase 4b — public pages: about/contact/legal (6), features hub + 6 sub-pages, how-it-works,
  for-students, for-tas, updates, resources hub + 5 guides, glossary (43 terms, DefinedTermSet
  schema), FAQ (28 Qs, 7 groups). Contact form is mailto + honeypot, no server. Legal pages carry
  no ads. All 25 routes 200, term scan clean, lint + build green.
- [x] Phase 4c — blog: MDX infra (`src/content/blog`, gray-matter + next-mdx-remote/rsc +
  rehype-slug), 18 full posts across 4 categories, `/blog` hub, 4 category pages, per-post pages
  with TOC, share links, BlogPosting + breadcrumb JSON-LD, per-post OG image (edge, from
  `src/lib/blog-index.json` via `npm run gen:blog`), sitemap entries, home page updated (latest 3
  guides + 5-Q FAQ teaser + 1 display ad). All 23 blog routes 200, unknown slugs 404, term scan
  clean, lint + build green.
- [x] Phase 5 — student-first funnel: auth-aware `PortalButton` everywhere (header, footer,
  CtaCard, home, mobile sticky bar → "Go to Dashboard" when signed in), soft CTA after every
  tool result and post, admin link only in the footer. Static rendering preserved.
- [x] Phase 6 — quality gates: `check:guards` (23 public + 8 guarded + 4 flow + no-ads-on-auth),
  `check:independence` (99 files scanned clean; footer line on all 59 sitemap URLs; no ad
  scripts on auth pages), `check:links` (59 sitemap URLs + 72 internal links all resolve).
  Lighthouse deferred to owner (no throttled Chrome here) — see Owner TODOs.
- [x] Phase 7 — handoff: owner TODOs, AdSense checklist and how-to guides are in this file.
