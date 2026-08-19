# NUSkor — Full Session Context (savepoint)

Last updated: Thu Aug 20 2026. Project is at a **full fresh reset** state — DB is empty except the admin account. Everything must be rebuilt via the UI.

## 1. Project
- **NUSkor** — exam-management system for NUS (`@lhr.nu.edu.pk` domain): courses → sections → TAs → students → assessments/marks → evaluation bookings → announcements + email notifications.
- Objective: complete implementation per the final master prompt (section-based architecture, no hardcoded data, xlsx exports, email pipeline).

## 2. Stack & architecture (DO NOT change)
- Next.js 14.2.35 App Router, TypeScript, Tailwind.
- Supabase: Postgres + Auth (Google OAuth, **domain-restricted** to `@lhr.nu.edu.pk` in middleware + `handle_new_user` trigger) + RLS.
- Deployed on **Vercel**: `https://nuskor.vercel.app` (auto-deploys on push to `master`).
- Emails: **Supabase Edge Function** (`send-announcement-emails`) + **Resend**. App calls it via `/api/announcements/send-emails` (stages `prepare_email_deliveries` RPC, then fetches the function directly — surfaces real error bodies).
- Excel exports: `exceljs@4.4.0`, dynamically imported (keeps bundles small).
- Roles: `admin | ta | student` on `profiles.role`.

## 3. Repo & environment
- Repo: `D:\NUSkor\nuskor-web` → `https://github.com/zohaib-mzg/NUSkor.git`, branch `master`.
- Supabase project ref: **`abngexnefigyroucacxy`**.
- Supabase CLI 2.115.0 at `%LOCALAPPDATA%\SupabaseCLI\supabase.exe` — PATH updated, **new terminals only**.
- `tsconfig.json` excludes `supabase/functions`; `.gitignore` ignores `supabase/.temp/`.

## 4. Accounts
- **Admin**: `l242530@lhr.nu.edu.pk` (also the `ADMIN_EMAIL` fallback in `/auth/callback`).
- Students `l242558`, `l242610`: their `auth.users` rows were **deleted** in the reset — next Google sign-in creates brand-new users (new UUID, auto-registered as students by the trigger). Old marks/enrollments are gone permanently.

## 5. Database state (IMPORTANT)
- **FULL FRESH RESET done today**: only the admin auth user remains; all 16 tables dropped and rebuilt via `schema.sql`; all functions rebuilt; RLS enabled everywhere.
- **All data is EMPTY** — no courses, sections, students, assessments, marks, bookings, announcements. Rebuild via the UI.
- `schema.sql` is now the canonical, **self-healing** script: it drops ALL public functions at the top, plus a targeted `drop function if exists ...` before every `create`, so `42P13` drift can never happen again. Also includes `my_role()`, `is_admin()` (security definer), v2.3/v2.4 audit columns (`archived_by`, `deleted_by`) as plain `uuid` **without** FK constraints.

## 6. SQL scripts in `supabase/`
| Script | Purpose |
|---|---|
| `schema.sql` | Canonical fresh install. **Self-healing** (drops all public functions first + targeted drops). Run after any reset. |
| `reset_fresh.sql` | Full reset: deletes non-admin `auth.users` + sessions, drops all tables **and** all public functions. Keeps admin only. |
| `migration_v2.sql` / `v2.1` / `v2.2` / `v2.3` | Upgrade path from old v1-era DBs. |
| `migration_v2.4.sql` | Dropped `archived_by`/`deleted_by` FK constraints (fixes PostgREST embed ambiguity). |
| `migration_v2.5.sql` | Rebuilds ALL `profiles` policies (fixes infinite-recursion bug); adds `my_role()`. |
| `seed_restore.sql` | Optional demo-data restore (idempotent) — only if placeholder data is wanted again. |

## 7. Bugs found & fixed (all pushed)
1. **PostgREST embed ambiguity 500** (`Could not embed because more than one relationship was found for 'students' and 'profiles'`) — caused by v2.3 FK on audit columns. Fixed by `migration_v2.4.sql` (drop FKs; plain uuid).
2. **Infinite recursion in policy for relation "profiles"** (while approving TA) — stale/self-referencing profiles policy. Fixed by `migration_v2.5.sql` (drop all profiles policies, recreate canonical set; `is_admin()` explicit security definer).
3. **`current_role` is a reserved SQL keyword** — renamed helper to `my_role()`. Never use `current_role` as a function name.
4. **Missing `profiles` rows after manual deletion → sign-in redirect loop** ("Throttling navigation" = infinite `/dashboard → /login` loop). The `handle_new_user` trigger only fires on NEW `auth.users` inserts — deleting a profile row is NOT self-healing. Restore with `insert into profiles ... select ... from auth.users on conflict (id) do nothing`.
5. **`42P13` function-signature drift** (`get_slots_with_counts`, `get_leaderboard` etc. from v1-era DBs) — fixed by self-healing schema.sql (drop-before-create).
6. **`assessments_type_check` drift** (old constraint lacked `'final'`) — fixed by the fresh table rebuild.

## 8. Edge function (email pipeline)
- File: `supabase/functions/send-announcement-emails/index.ts` — **already deployed** (`--no-verify-jwt`).
- URL: `https://abngexnefigyroucacxy.supabase.co/functions/v1/send-announcement-emails`
- Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (auto-injected) + secrets: `RESEND_API_KEY`, `EMAIL_FROM` (`NUSkor Announcements <onboarding@resend.dev>`), `APP_URL` (default `https://nuskor.vercel.app`).
- **Check**: if `RESEND_API_KEY` was never set on Supabase, the Send button returns a "skipped" 200 message. Set it via CLI (new terminal): `supabase login` → `supabase link --project-ref abngexnefigyroucacxy` → `supabase secrets set RESEND_API_KEY=re_... EMAIL_FROM="NUSkor Announcements <onboarding@resend.dev>"`. Function code changes require `supabase functions deploy send-announcement-emails --no-verify-jwt`.

## 9. Implemented features (code done — needs fresh-data testing)
- Slot auto-generation (admin + TA evaluations), CSV exports (marks, students), ExcelJS `.xlsx` exports (single assessment / all completed / entire section — bold headers, frozen row, filters, percent formats, Summary + All Marks + Assessment Details sheets), weightage totals + Weight column, NotificationBell (unread badge, mark-all-read, 60s polling, routes to `/marks` for mark titles), announcements soft-delete, student archive/restore (admin Students page with status filter + confirm), TA bookings modal (reg no / name / section / slot / status), dynamic dashboard Latest + Recent assessments, admin bookings shows reg no.

## 10. Next steps
1. Sign in as `l242530` → verify admin portal loads (fresh DB).
2. Rebuild from UI: course → section → assign TA → create invites → students sign in (auto student registration) → join via invite → assessments (publish/release) → marks → announcements → notifications → email send → evaluation periods → auto-generate slots → bookings → xlsx exports.
3. Verify email pipeline end-to-end (Send button → delivery rows + Resend inbox).
4. Confirm `RESEND_API_KEY` secret is set (see §8).
5. Run the final 37-item acceptance checklist (course→sections→multi-TA→invite→join→marks→stats→announcement→notification→email→slot gen→bookings→xlsx exports→RLS).

## 11. Conventions
- PostgREST to-one embeds return objects → normalize with `one()`/`many()` from `@/lib/utils`.
- RPCs: `get_leaderboard`, `get_slots_with_counts`, `join_section`, `create_announcement_notifications`, `generate_slots`, `prepare_email_deliveries`, `mark_email_delivery`, `enroll_student_by_email`, `get_assessment_stats(_many)` — all `security definer`.
- `handle_new_user` trigger: creates `profiles` (admin role for l242530) + `students` row for non-admin; raises for non-lhr emails.
- TA approval (admin): update `ta_applications` → set `profiles.role = 'ta'` (works post-v2.5).
- **Never manually delete** `profiles`/`students` rows without restoring them — sign-in does NOT recreate them.