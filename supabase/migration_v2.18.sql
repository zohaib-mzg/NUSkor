-- =========================================================
-- NUSkor migration v2.18 — TA course deletion
--
-- Lets an assigned TA (or an admin) delete a course section and
-- every piece of data belonging to it in ONE atomic operation:
--   enrollments, invitations, assessments -> marks,
--   evaluation periods -> slots -> bookings, announcements,
--   section assignments, and course-specific notifications.
--
-- Student accounts and TAs themselves are NEVER deleted — only
-- their rows referencing this section. If it was the last section
-- under the course, the course shell is removed too; a shared
-- course taught by another TA keeps its other sections untouched.
--
-- Single plpgsql body => single implicit transaction: either the
-- whole deletion succeeds or nothing changes.
-- =========================================================

create or replace function public.delete_ta_section(p_section_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_assessment_ids uuid[] := '{}';
  v_period_ids uuid[] := '{}';
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Permission: only a TA assigned to this section, or an admin.
  -- Students can never reach past this guard.
  if not exists (
    select 1 from section_tas st
    where st.section_id = p_section_id and st.ta_id = v_uid
  )
  and not exists (
    select 1 from profiles where id = v_uid and role = 'admin'
  ) then
    raise exception 'You are not authorized to delete this course';
  end if;

  select cs.course_id into v_course_id
  from course_sections cs
  where cs.id = p_section_id;
  if v_course_id is null then
    raise exception 'Section not found';
  end if;

  -- Capture child ids BEFORE deletion: notifications.related_id has
  -- no foreign key, so those rows would otherwise outlive their
  -- targets (marks_released -> assessment, evaluation_created ->
  -- period, booking_* -> booking).
  select coalesce(array_agg(id), '{}') into v_assessment_ids
  from assessments where section_id = p_section_id;
  select coalesce(array_agg(id), '{}') into v_period_ids
  from evaluation_periods where section_id = p_section_id;

  -- Sweep course-specific notifications lacking FK coverage.
  delete from notifications n
  where n.related_id = p_section_id
     or n.related_id = any(v_assessment_ids)
     or n.related_id = any(v_period_ids)
     or n.related_id in (
          select b.id
          from bookings b
          join evaluation_slots es on es.id = b.slot_id
          join evaluation_periods ep on ep.id = es.evaluation_period_id
          where ep.section_id = p_section_id
        );
  -- Announcement-typed notifications die automatically via
  -- notifications.announcement_id ON DELETE CASCADE.

  -- The big cascade: removes enrollments, student_invites,
  -- section_tas, assessments -> marks, evaluation_periods ->
  -- slots -> bookings, announcements (+ their notifications).
  delete from course_sections where id = p_section_id;

  -- Drop the course shell once its last section is gone. A course
  -- still taught by another TA survives untouched.
  delete from courses c
  where c.id = v_course_id
    and not exists (
      select 1 from course_sections cs where cs.course_id = c.id
    );
end;
$$;

grant execute on function public.delete_ta_section(uuid) to authenticated;

-- =========================================================
-- END v2.18
-- =========================================================
