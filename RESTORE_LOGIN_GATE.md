# RESTORE GUIDE — Temporarily Disabled Login Gate

Applied: 2026-08-20

## What was disabled

The `@lhr.nu.edu.pk`-only login restriction was temporarily switched OFF in TWO places so the app can be tested with any email address. It must be switched back ON after testing is complete.

## Files touched

1. `supabase/schema.sql` — `handle_new_user()` function (source of truth for fresh rebuilds)
2. Live Supabase DB (`abngexnefigyroucacxy`) — same function
3. `src/lib/supabase/middleware.ts` — `ALLOWED_DOMAIN` constant
4. `src/app/login/page.tsx` — Google OAuth `hd` query param
5. `src/app/invite/[token]/InviteClient.tsx` — Google OAuth `hd` query param + sign-in copy

## How to re-enable

### 1. Restore `handle_new_user` in schema.sql

In `supabase/schema.sql`, find the commented block and restore the two lines:

```sql
begin
  -- DOMAIN GATE TEMPORARILY DISABLED (2026-08-20) for testing.
  -- Re-enable by restoring:
  --   if new.email not like '%@lhr.nu.edu.pk' then
  --     raise exception 'Only @lhr.nu.edu.pk accounts are allowed';
  --   end if;

  insert into public.profiles (id, email, full_name, role)
```

must become:

```sql
begin
  if new.email not like '%@lhr.nu.edu.pk' then
    raise exception 'Only @lhr.nu.edu.pk accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
```

### 2. Restore `handle_new_user` in the live DB

Run via the Management API query helper (`sbquery.ps1`) or SQL editor:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email not like '%@lhr.nu.edu.pk' then
    raise exception 'Only @lhr.nu.edu.pk accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when new.email = 'l242530@lhr.nu.edu.pk' then 'admin' else 'student' end
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Note: `create or replace` alone is enough for the function. The `drop/create trigger` lines are idempotent safety.

### 3. Restore the Google `hd` parameter (2 spots)

In `src/app/login/page.tsx`:

```ts
queryParams: {
  // DOMAIN GATE TEMPORARILY DISABLED (2026-08-20) for testing.
  // Re-enable by restoring: hd: "lhr.nu.edu.pk",
  prompt: "select_account",
},
```

must become:

```ts
queryParams: {
  hd: "lhr.nu.edu.pk",
  prompt: "select_account",
},
```

Same change in `src/app/invite/[token]/InviteClient.tsx` (both the `queryParams` block and the helper-copy paragraph about `@lhr.nu.edu.pk` can be restored if desired).

### 4. Restore the middleware

In `src/lib/supabase/middleware.ts`, restore:

```ts
// DOMAIN GATE TEMPORARILY DISABLED (2026-08-20) for testing.
// Re-enable by restoring:
//   const ALLOWED_DOMAIN = "@lhr.nu.edu.pk";
const ALLOWED_DOMAIN = "";
```

must become:

```ts
const ALLOWED_DOMAIN = "@lhr.nu.edu.pk";
```

### 5. Redeploy Vercel

The middleware change ships with the app. Run `npm run build` and redeploy to Vercel.

---

## Notes

- While the gate is OFF, anyone with any Google account can sign up (they get role `student` automatically unless their email is `l242530@lhr.nu.edu.pk`, which becomes admin).
- The trigger `on_auth_user_created` was NOT removed — only the domain check inside it was disabled, so automatic profile creation still works.
- No test data was ever created and none will be created — only the gate was toggled.

## Related (Web Push v2.7) — for a full environment rebuild

If the project ever needs a fresh rebuild, `supabase/schema.sql` is the source of truth and `supabase/migration_v2.7.sql` is the v2.7 delta. VAPID keys for the push system live in `.env.local` (gitignored) and as Supabase secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Vercel needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set.