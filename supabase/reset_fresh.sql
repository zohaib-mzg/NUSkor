-- =========================================================
-- NUSkor — FULL FRESH RESET
-- Keeps ONLY the admin account (l242530@lhr.nu.edu.pk).
-- Deletes every other user and all app data, so everyone
-- else signs in again as brand-new students (the
-- handle_new_user trigger auto-registers them).
-- After this, run supabase/schema.sql to rebuild the schema.
-- Run in the Supabase SQL Editor (postgres role).
-- =========================================================

-- ---------- 1. REMOVE ALL NON-ADMIN USERS ----------
-- (profiles + students rows cascade-delete with their user)
delete from auth.sessions
where user_id not in (select id from auth.users where email = 'l242530@lhr.nu.edu.pk');

delete from auth.users
where email <> 'l242530@lhr.nu.edu.pk';

-- ---------- 2. DROP ALL APPLICATION TABLES ----------
-- (fresh rebuild happens via schema.sql, which also fixes any
--  stale constraints from the old v1-era tables)
drop table if exists public.announcement_email_deliveries cascade;
drop table if exists public.notifications cascade;
drop table if exists public.announcements cascade;
drop table if exists public.bookings cascade;
drop table if exists public.evaluation_slots cascade;
drop table if exists public.evaluation_periods cascade;
drop table if exists public.marks cascade;
drop table if exists public.assessments cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.section_tas cascade;
drop table if exists public.student_invites cascade;
drop table if exists public.ta_applications cascade;
drop table if exists public.course_sections cascade;
drop table if exists public.courses cascade;
drop table if exists public.students cascade;
drop table if exists public.profiles cascade;

-- ---------- 3. DROP ALL PUBLIC FUNCTIONS ----------
-- (stale v1-era signatures block schema.sql's create or replace)
do $$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;
end $$;

-- ---------- 4. VERIFY ----------
select email from auth.users order by email;
select 'tables remaining' as msg, count(*) from pg_tables
where schemaname = 'public';

-- =========================================================
-- NEXT STEP: run supabase/schema.sql (rebuilds everything)
-- =========================================================