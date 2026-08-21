-- =========================================================
-- NUSkor — Migration v2.8 (BUGFIX)
-- "new row violates row-level security policy for table
--  \"announcements\"" when soft-deleting an announcement.
--
-- Cause: the UPDATE policies live in the database have
-- drifted from the canonical set (a stricter WITH CHECK
-- rejects the new row once deleted_at/deleted_by are set).
--
-- Fix: drop EVERY policy on announcements and recreate the
-- canonical set. The update policy is explicitly
-- soft-delete-safe: its WITH CHECK never references
-- deleted_at / deleted_by, so marking a row deleted passes.
-- Idempotent: safe to run repeatedly in the SQL Editor.
-- =========================================================

-- ---------- 1. DROP ALL ANNOUNCEMENTS POLICIES ----------
do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'announcements'
  loop
    execute format('drop policy if exists %I on announcements', rec.policyname);
  end loop;
end $$;

-- ---------- 2. CANONICAL ANNOUNCEMENTS POLICIES ----------
-- Read: admins see everything; TAs see their sections' plus
-- published portal-wide ones; students see active published
-- announcements for their section (or global).
create policy "announcements_select_section_members" on announcements
  for select using (
    is_admin()
    or (
      deleted_at is null
      and (
        is_ta_of_section(section_id)
        or (
          status = 'published'
          and (
            section_id is null
            or exists (
              select 1 from enrollments e
              where e.section_id = announcements.section_id
                and e.student_id = auth.uid()
            )
          )
        )
      )
    )
  );

-- Create: admin anywhere; TA only into their own sections.
create policy "announcements_admin_or_ta_write" on announcements
  for insert with check (is_admin() or is_ta_of_section(section_id));

-- Update (incl. edit / publish toggle / SOFT DELETE):
-- admin anywhere; TA only within their own sections.
-- NOTE: with check intentionally does NOT constrain
-- deleted_at / deleted_by so the soft delete succeeds.
create policy "announcements_admin_or_ta_update" on announcements
  for update
  using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));

-- Hard delete: admin anywhere; TA within own sections.
create policy "announcements_admin_or_ta_delete" on announcements
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---------- 3. VERIFY ----------
-- Run after applying; should list exactly the four policies above:
--   select policyname, cmd
--   from pg_policies
--   where schemaname = 'public' and tablename = 'announcements'
--   order by policyname;

-- =========================================================
-- END v2.8
-- =========================================================
