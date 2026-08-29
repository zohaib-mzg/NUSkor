-- =========================================================
-- NUSkor — Migration v2.1 (delta)
-- Allow TAs to enroll/unenroll students in THEIR sections
-- (invitations are self-service via join_section(), but TAs
--  can also manage enrollments manually).
--
-- Run ONCE in the Supabase SQL Editor after migration_v2.sql.
-- Idempotent: safe to re-run.
-- =========================================================

drop policy if exists "enrollments_ta_write" on enrollments;
create policy "enrollments_ta_write" on enrollments
  for insert with check (
    is_ta_of_section(section_id)
  );

drop policy if exists "enrollments_ta_delete" on enrollments;
create policy "enrollments_ta_delete" on enrollments
  for delete using (
    is_ta_of_section(section_id)
  );

-- Enroll a registered student into one of the caller's sections
-- by email. TAs cannot SELECT students outside their sections,
-- so this is a security-definer helper that validates ownership.
create or replace function public.enroll_student_by_email(p_section_id uuid, p_email text)
returns uuid
language plpgsql security definer as $$
declare
  v_student_id uuid;
begin
  if not (is_admin() or is_ta_of_section(p_section_id)) then
    raise exception 'You do not have access to this section';
  end if;

  select s.id into v_student_id
  from students s
  join profiles p on p.id = s.id
  where lower(p.email) = lower(p_email);

  if v_student_id is null then
    raise exception 'No registered student with that email';
  end if;

  insert into enrollments (student_id, section_id)
  values (v_student_id, p_section_id)
  on conflict (student_id, section_id) do nothing;

  return p_section_id;
end;
$$;

-- =========================================================
-- END migration v2.1
-- =========================================================