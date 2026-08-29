# NUSkor — TA Evaluation & Marks Portal

Production-ready web app that replaces Excel/Google Sheets for a TA managing
marks, evaluation slots, and bookings at FAST-NUCES Lahore.

Built per the design brief in `NUSKOR_MASTER_PROMPT.md`.

## Stack

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS**
- **Supabase** (Postgres, Auth, Row-Level Security)
- **Google OAuth** restricted to `@lhr.nu.edu.pk`
- **Lucide** icons, **Recharts** charts
- Hosted on Vercel (free tier) by default

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon/publishable key (public, safe) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID (public, safe) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, your Vercel URL in prod |

Never put the `service_role` key or Google Client Secret in env vars exposed to
the frontend — those live only in Supabase / Vercel secrets.

## Database setup

1. Open your Supabase project → SQL Editor.
2. Run **all** of `supabase/schema.sql` (tables, triggers, RLS policies, RPCs, indexes).
3. Confirm the Google provider is enabled under Authentication → Providers,
   with the Client ID and Client Secret entered.
4. Set the Google redirect URI in Google Cloud Console:
   `https://<project-ref>.supabase.co/auth/v1/callback`

The schema is **idempotent** (drops/creates policies, `create or replace`
functions) so you can re-run it safely.

> The first admin is hard-coded at the database level as
> `l242530@lhr.nu.edu.pk` (see the `handle_new_user` trigger). Every other
> `@lhr.nu.edu.pk` account becomes a student automatically.

## Roles & authorization

- **Admin (TA):** full CRUD on students, courses, assessments, marks (incl.
  CSV bulk upload), evaluation periods/slots, bookings, announcements, analytics.
- **Student:** own marksheet, class stats, anonymized leaderboard, slot
  booking, own bookings, announcements.

Everything is enforced by **Row-Level Security** in Postgres — not by hidden
buttons. Students can never read or write another student's data, even via
direct API calls. One-booking-per-period and slot capacity are enforced by
database constraints/triggers.

## CSV marks import

Format (first line optional header):

```
student_email,score
l242530@lhr.nu.edu.pk,24
```

The importer reports **ready / not found / duplicates / invalid** counts before
writing anything.

## Deploy

1. Push this repo to GitHub, import into Vercel.
2. Add the four env vars above.
3. Deploy.
4. Freeze the code — all future changes happen through the Admin UI.

## Project structure

```
src/app/                    # routes (App Router)
  page.tsx                  # public landing page
  login/                    # Google sign-in
  auth/callback/            # OAuth exchange
  access-denied/            # non-@lhr.nu.edu.pk screen
  (portal)/                 # authenticated area
    dashboard/              # student home
    marks/                  # student marksheet + stats + leaderboard
    evaluations/            # slot booking
    announcements/
    admin/                  # TA panel (guarded)
      students/ courses/ assessments/ marks/ evaluations/ bookings/
      announcements/ analytics/
src/components/             # shared UI + PortalShell layout
src/lib/                    # Supabase clients, types, utils
src/middleware.ts           # session + domain guard
supabase/schema.sql         # database (tables, RLS, RPCs)
```