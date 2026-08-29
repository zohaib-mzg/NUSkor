-- =========================================================
-- NUSkor — Migration v2.5 (BUGFIX)
-- "infinite recursion detected in policy for relation profiles"
-- A stale/v1 profiles policy (or a non-security-definer
-- is_admin()) causes a policy on profiles to re-query
-- profiles forever. Fix:
--   1. Recreate is_admin() as security definer (explicit).
--   2. Add current_role() security definer helper.
--   3. Drop EVERY policy on profiles and recreate the
--      canonical set (no policy subquery touches profiles).
-- Idempotent. Run in the Supabase SQL Editor.
-- =========================================================

-- ---------- 1. HELPERS (explicitly security definer) ----------
create or replace function public.is_admin()
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_role()
returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

-- ---------- 2. DROP ALL PROFILES POLICIES ----------
do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on profiles', rec.policyname);
  end loop;
end $$;

-- ---------- 3. CANONICAL PROFILES POLICIES ----------
create policy "profiles_select_own_admin_or_section_ta" on profiles
  for select using (
    id = auth.uid()
    or is_admin()
    or exists (
      select 1 from enrollments e
      join section_tas st on st.section_id = e.section_id
      where e.student_id = profiles.id and st.ta_id = auth.uid()
    )
  );

-- Self-update only, role cannot change; uses the security
-- definer helper so no subquery re-enters RLS on profiles.
create policy "profiles_update_own_no_role_change" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = my_role());

create policy "profiles_admin_full_access" on profiles
  for all using (is_admin()) with check (is_admin());

-- =========================================================
-- END v2.5
-- =========================================================