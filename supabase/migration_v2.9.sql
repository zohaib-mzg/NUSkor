-- =========================================================
-- NUSkor — Migration v2.9 (BUGFIX)
-- "new row violates row-level security policy for table
--  \"announcements\"" when soft-deleting.
--
-- Bulletproof fix: soft delete moves out of the client's
-- direct UPDATE (which depends on table RLS policies) into
-- a SECURITY DEFINER RPC that enforces permissions itself.
-- Also re-applies the canonical announcements policies
-- (same as v2.8) so this script fixes everything in one run.
-- Idempotent: safe to run repeatedly in the SQL Editor.
-- =========================================================

-- ---------- 1. SOFT DELETE RPC ----------
create or replace function public.soft_delete_announcement(p_announcement_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
begin
  select * into v_ann from announcements
  where id = p_announcement_id and deleted_at is null;

  if v_ann.id is null then
    raise exception 'Announcement not found';
  end if;

  -- Permission check happens HERE, not via table RLS.
  if not (is_admin() or is_ta_of_section(v_ann.section_id)) then
    raise exception 'You do not have access to this announcement';
  end if;

  update announcements
    set deleted_at = now(),
        deleted_by = auth.uid()
    where id = p_announcement_id;
end;
$$;

revoke execute on function public.soft_delete_announcement(uuid)
  from public, anon;
grant execute on function public.soft_delete_announcement(uuid)
  to authenticated;

-- ---------- 2. REBUILD CANONICAL ANNOUNCEMENTS POLICIES ----------
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

create policy "announcements_admin_or_ta_write" on announcements
  for insert with check (is_admin() or is_ta_of_section(section_id));

create policy "announcements_admin_or_ta_update" on announcements
  for update
  using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));

create policy "announcements_admin_or_ta_delete" on announcements
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---------- 3. VERIFY ----------
-- Should list exactly four policies plus the RPC:
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'announcements'
--   order by policyname;
--   select proname from pg_proc where proname = 'soft_delete_announcement';

-- =========================================================
-- END v2.9
-- =========================================================
