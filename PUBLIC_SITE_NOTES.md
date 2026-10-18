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
- **App flow (reachable logged-out as today, no ads):** `/login`, `/admin/login`, `/join`,
  `/invite`, `/ta-apply`, `/access-denied`, `/auth/*`.
- **Guarded (redirect to `/login` when logged out):** `/dashboard`, `/marks`, `/evaluations`,
  `/announcements`, `/settings`, `/ta`, `/admin` (except `/admin/login`).

Runtime proof: `scripts/check-guards.mjs` (run against `npm run start` in Phase 6).

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
- [ ] Phase 4c — blog (18 posts + category pages)
- [ ] Phase 5 — student-first funnel
- [ ] Phase 6 — performance & quality gates
- [ ] Phase 7 — handoff & owner TODOs
