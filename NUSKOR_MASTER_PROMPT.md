# NUSkor — Master Project Brief

TA Evaluation & Marks Portal. Free-tier stack. Reuse this doc in any future session to restore full context.

---

## 1. Project Summary

- **Name:** NUSkor
- **Purpose:** Replace Excel/Google Sheets for a TA managing marks, evaluation slots, and bookings.
- **Roles:** Admin (TA) and Student — enforced via database, never via frontend logic.
- **Golden rule:** Once deployed, **no code changes required** to add/edit/delete students, courses, marks, slots, or announcements. All of that happens through the Admin UI, backed by Supabase.
- **Login:** Google Sign-In restricted to `@lhr.nu.edu.pk` addresses only, enforced at the application/authorization layer (Google auth ≠ authorization).
- **Theme:** Clean academic dashboard — white/off-white background, yellow/gold primary accent, card-based layout, sidebar navigation, tables, calendar/schedule widgets. Separate Admin Panel and Student Panel visual styles (see attached reference mockup).

---

## 2. Tech Stack (target cost: $0/month)

| Component | Choice |
|---|---|
| Frontend | React / Next.js |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Login Provider | Google OAuth |
| Authorization | Supabase Row Level Security (RLS) |
| Hosting | Vercel or Netlify (free tier) — **[DECISION NEEDED]** |
| Bulk data import | CSV upload (marks) |
| Analytics | PostgreSQL queries (avg, min, max, rank, leaderboard) |
| Icons | Lucide |
| Charts | Lightweight chart library (TBD) |

No Firebase, Auth0, Clerk, separate backend, or Google Sheets.

---

## 3. Credentials & Config Needed

### Safe to share directly (not secret, used in frontend)
- [x] Supabase Project URL — `https://abngexnefigyroucacxy.supabase.co`
- [x] Supabase anon/publishable key — `sb_publishable_ykax2CSDobTbdkozsFwCpQ_ssZY90gM`
- [x] Google OAuth Client ID — `768965497444-ogrt2b4gu2lkv0752sror8s5c4e8m5at.apps.googleusercontent.com`

### NEVER share in chat — keep only in Supabase dashboard / server env vars
- Supabase `service_role` key
- Google OAuth Client Secret

### Config to confirm is already done
- [ ] Google Cloud Console → Authorized redirect URI set to: `https://abngexnefigyroucacxy.supabase.co/auth/v1/callback`
- [ ] Google Cloud Console → Authorized JavaScript origins set (localhost for dev, real domain after deploy)
- [ ] Supabase → Authentication → Providers → Google → toggled on, Client ID + Secret entered

### Decisions needed
- [x] **First admin's email** — `l242530@lhr.nu.edu.pk`
- [x] Hosting provider — **Vercel**

### Branding
- [x] Logo received — `NUSKOR_Logo.png`: black circular badge, yellow/gold ring, gold "N" monogram merging into a graduation cap and open book, white secondary accent, tagline "Empowering Students. Elevating Futures." This confirms the palette: **black/near-black, gold/yellow (#F5C518-ish), white**, to be used across sidebar, buttons, and highlight states.

---

## 4. Planned Database Tables (design, not yet created)

```
profiles            -- id, email, full_name, role (admin/student)
students            -- linked to profiles, program, semester, etc.
courses
enrollments
assessments          -- quiz, assignment, midterm, project
marks                -- student_id, assessment_id, obtained, total
evaluation_periods
evaluation_slots
bookings             -- one booking per student per evaluation period, enforced at DB level
announcements
```

Schema + RLS policies will be finalized together before any table is created in Supabase.

---

## 5. RLS Policy Summary

**Student can:**
See own profile/marks, class stats, leaderboard, available evaluation periods/slots, own bookings, announcements. Book one open slot per evaluation period.

**Student cannot:**
Modify/delete marks, edit other students' data, create/delete slots or evaluation periods, touch admin functions, modify other students' bookings.

**Admin can:**
Full CRUD on students, courses, assessments, marks (incl. bulk CSV upload), evaluation periods/slots, view/manage bookings, publish announcements, view analytics.

Enforced via Postgres RLS policies — not just hidden UI buttons.

---

## 6. Feature Notes

- **Marks section (student view):** full marksheet with grade per assessment, plus class average/min/max, student's rank, and a leaderboard (privacy-conscious — consider anonymized IDs or opt-in names).
- **Evaluation slots:** Admin creates an evaluation period (e.g. "Assignment 1 Evaluation, May 21–23") with discrete time slots. Students pick one slot; DB constraint prevents double-booking even via direct API calls.
- **Bulk marks upload:** Admin uploads CSV (`student_email,score`), system reports imported/not-found/duplicate counts before confirming.
- **Google login flow:** Google Sign-In → Supabase Auth → check email domain is `@lhr.nu.edu.pk` → allow/deny → route to Student or Admin dashboard based on `profiles.role`.

---

## 7. Build Order (don't skip ahead)

1. Confirm Supabase URL + anon key + Google Client ID/Secret are correctly wired end-to-end.
2. Test auth: `@lhr.nu.edu.pk` → dashboard, any other domain → access denied.
3. Finalize schema + RLS policies (review together before creating tables).
4. Build Admin portal (students, courses, assessments, marks, evaluation periods/slots, bookings, announcements).
5. Build Student portal (marksheet, stats, leaderboard, slot booking, bookings, announcements).
6. Apply NUSkor theme (yellow/gold accent, card layout, sidebar nav) per attached reference.
7. Deploy to Vercel/Netlify. Freeze code — all further changes go through Admin UI.

---

## 8. Open Items

- [ ] First admin email
- [ ] Hosting choice
- [ ] Supabase URL + anon key
- [ ] Google Client ID
- [ ] Confirm redirect URI + provider config in Supabase dashboard
