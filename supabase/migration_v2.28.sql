-- =========================================================
-- NOTIFICATION: EVALUATION COMPLETED
-- Notifies the specific student when their evaluation
-- is marked as done by a TA.
-- =========================================================

-- 1. Add 'evaluation_completed' to the notification type CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'announcement',
    'marks_released',
    'evaluation_created',
    'booking_confirmed',
    'booking_cancelled',
    'important_update',
    'evaluation_completed'
  ));

-- 2. Add resolve_notification_target case for evaluation_completed
--    Recipient: the single student whose booking was marked done.
--    Title/Message per the spec.
drop function if exists public.resolve_notification_target(text, uuid);
create or replace function public.resolve_notification_target(p_type text, p_related_id uuid)
returns table (recipient_id uuid, title text, message text)
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
  v_assess assessments%rowtype;
  v_period evaluation_periods%rowtype;
  v_booking bookings%rowtype;
  v_slot evaluation_slots%rowtype;
  v_course_code text;
  v_subject text;
  v_section_code text;
  v_period_title text;
begin
  if p_type = 'announcement' then
    select * into v_ann from announcements
    where id = p_related_id and deleted_at is null;
    if v_ann.id is null then
      raise exception 'Announcement not found';
    end if;
    if not (is_admin() or is_ta_of_section(v_ann.section_id)) then
      raise exception 'You do not have access to this announcement';
    end if;

    return query
      select p.id, v_ann.title, v_ann.body
      from profiles p
      join students s on s.id = p.id and s.archived_at is null
      left join enrollments e
        on e.student_id = p.id and e.section_id = v_ann.section_id
      where v_ann.section_id is null or e.student_id is not null;

  elsif p_type = 'marks_released' then
    select * into v_assess from assessments where id = p_related_id;
    if v_assess.id is null then
      raise exception 'Assessment not found';
    end if;
    if v_assess.status <> 'published'
       or (v_assess.release_date is not null and v_assess.release_date > current_date) then
      raise exception 'Assessment is not released yet';
    end if;
    if not (is_admin() or is_ta_of_section(v_assess.section_id)) then
      raise exception 'You do not have access to this assessment';
    end if;

    select c.code, c.title, s.section_code
      into v_course_code, v_subject, v_section_code
    from course_sections s
    join courses c on c.id = s.course_id
    where s.id = v_assess.section_id;

    return query
      select p.id,
             'Your ' || v_assess.title || ' marks have been uploaded.',
             'Course: ' || v_course_code || E'\nSubject: ' || v_subject ||
             E'\nSection: ' || v_section_code || E'\n\nTap to view your marks.'
      from profiles p
      join students s on s.id = p.id and s.archived_at is null
      join enrollments e
        on e.student_id = p.id and e.section_id = v_assess.section_id
      where exists (
        select 1 from marks m
        where m.student_id = p.id and m.assessment_id = v_assess.id
      );

  elsif p_type = 'evaluation_created' then
    select * into v_period from evaluation_periods where id = p_related_id;
    if v_period.id is null then
      raise exception 'Evaluation period not found';
    end if;
    if not (is_admin() or is_ta_of_section(v_period.section_id)) then
      raise exception 'You do not have access to this section';
    end if;

    select c.code, c.title, s.section_code
      into v_course_code, v_subject, v_section_code
    from course_sections s
    join courses c on c.id = s.course_id
    where s.id = v_period.section_id;

    return query
      select p.id,
             'New evaluation period created.',
             'Course: ' || v_course_code || E'\nSubject: ' || v_subject ||
             E'\nSection: ' || v_section_code || E'\n\nBook your evaluation slot.'
      from profiles p
      join students s on s.id = p.id and s.archived_at is null
      join enrollments e
        on e.student_id = p.id and e.section_id = v_period.section_id;

  elsif p_type = 'evaluation_completed' then
    -- p_related_id = booking_id
    select * into v_booking from bookings where id = p_related_id;
    if v_booking.id is null then
      raise exception 'Booking not found';
    end if;

    -- Resolve section via the evaluation period
    select ep.section_id, ep.title
      into v_period.section_id, v_period_title
    from evaluation_periods ep
    where ep.id = v_booking.evaluation_period_id;

    if not (is_admin() or is_ta_of_section(v_period.section_id)) then
      raise exception 'You do not have access to this evaluation';
    end if;

    -- Get the evaluation period title for the message
    if v_period_title is null then
      v_period_title := 'your evaluation';
    end if;

    -- Notify ONLY the student who owns this booking
    return query
      select p.id,
             'Evaluation Completed',
             'Thank you for giving your evaluation! Your ' || v_period_title ||
             ' has been completed successfully. Please wait for the marks to be finalized.'
      from profiles p
      where p.id = v_booking.student_id;

  else
    raise exception 'Unsupported notification type';
  end if;
end;
$$;

-- Revoke execute from client roles (only callable via SECURITY DEFINER)
revoke execute on function public.resolve_notification_target(text, uuid)
  from public, anon, authenticated;
