-- =========================================================
-- FIX 1: get_student_marks_data — return sections even when
-- no assessments are published. The student IS enrolled;
-- "no published marks" ≠ "no enrolled sections".
--
-- FIX 2: book_evaluation_slot / cancel_my_booking — block
-- operations on bookings where evaluation_status = 'done'.
-- =========================================================

-- ── FIX 1 ────────────────────────────────────────────────
-- Changed: final SELECT now uses the student_sections CTE
-- directly, LEFT JOINing assessment data. Sections with no
-- published assessments still appear (with NULL assessment
-- columns). The frontend can then show "Enrolled Sections: 1"
-- while keeping marks hidden.
drop function if exists public.get_student_marks_data(uuid);
create or replace function public.get_student_marks_data(
  p_student_id uuid
) returns table (
  section_id uuid,
  section_code text,
  course_code text,
  course_title text,
  leaderboard_visible boolean,
  assessment_id uuid,
  assessment_title text,
  assessment_type text,
  total_marks numeric,
  weightage numeric,
  obtained numeric,
  avg_marks numeric,
  min_marks numeric,
  max_marks numeric,
  stat_total_students bigint,
  lb_registration_no text,
  lb_obtained numeric,
  lb_total_marks numeric,
  lb_percent numeric,
  lb_rank bigint
)
language sql stable
security definer
set search_path = ''
as $$
  with student_sections as (
    select e.section_id, cs.section_code, c.code as course_code,
           c.title as course_title, cs.leaderboard_visible
    from public.enrollments e
    join public.course_sections cs on cs.id = e.section_id
    join public.courses c on c.id = cs.course_id
    where e.student_id = p_student_id
  ),
  section_assessments as (
    select ss.*, a.id as assessment_id, a.title as assessment_title,
           a.type as assessment_type, a.total_marks, a.weightage
    from student_sections ss
    left join public.assessments a on a.section_id = ss.section_id and a.status = 'published'
  ),
  assessment_marks_raw as (
    select sa.assessment_id,
           m.obtained,
           row_number() over (partition by sa.assessment_id order by m.obtained) as rn,
           count(*) over (partition by sa.assessment_id) as total_count
    from section_assessments sa
    join public.marks m on m.assessment_id = sa.assessment_id
    join public.enrollments e on e.student_id = m.student_id and e.section_id = sa.section_id
    join public.students s on s.id = m.student_id and s.archived_at is null
    join public.profiles pr on pr.id = s.id and pr.role = 'student'
    where sa.assessment_id is not null
  ),
  assessment_trimmed as (
    select assessment_id,
           avg(obtained) as trimmed_avg,
           count(*)::bigint as total_students,
           min(obtained) as min_marks,
           max(obtained) as max_marks
    from assessment_marks_raw
    where rn > floor(0.10 * total_count)
      and rn <= total_count - floor(0.10 * total_count)
    group by assessment_id
  ),
  assessment_stats as (
    select sa.assessment_id,
           round(at.trimmed_avg::numeric, 2) as avg_marks,
           at.min_marks,
           at.max_marks,
           at.total_students
    from section_assessments sa
    left join assessment_trimmed at on at.assessment_id = sa.assessment_id
  ),
  section_leaderboard as (
    select sa.section_id, sa.assessment_id,
           s.registration_no, m.obtained, a.total_marks,
           case when a.total_marks > 0
             then round((m.obtained / a.total_marks) * 100, 1)
             else 0 end as percent,
           rank() over (partition by sa.assessment_id order by m.obtained desc) as rnk
    from section_assessments sa
    join public.marks m on m.assessment_id = sa.assessment_id
    join public.assessments a on a.id = m.assessment_id and a.status = 'published'
    join public.enrollments e on e.student_id = m.student_id and e.section_id = sa.section_id
    join public.students s on s.id = m.student_id and s.archived_at is null
    join public.profiles pr on pr.id = s.id and pr.role = 'student'
    where sa.leaderboard_visible and sa.assessment_id is not null
  )
  select
    sa.section_id, sa.section_code, sa.course_code, sa.course_title,
    sa.leaderboard_visible, sa.assessment_id, sa.assessment_title,
    sa.assessment_type, sa.total_marks, sa.weightage,
    my_m.obtained,
    ast.avg_marks, ast.min_marks, ast.max_marks, ast.total_students,
    sl.registration_no, sl.obtained, sl.total_marks, sl.percent, sl.rnk
  from section_assessments sa
  left join public.marks my_m on my_m.student_id = p_student_id and my_m.assessment_id = sa.assessment_id
  left join assessment_stats ast on ast.assessment_id = sa.assessment_id
  left join section_leaderboard sl on sl.assessment_id = sa.assessment_id
  order by sa.section_code, sa.assessment_title, sl.rnk;
$$;

grant execute on function public.get_student_marks_data(uuid)
  to authenticated;

-- ── FIX 2a: book_evaluation_slot — block if already done ──
drop function if exists public.book_evaluation_slot(uuid, uuid);
create or replace function public.book_evaluation_slot(
  p_period_id uuid,
  p_slot_id uuid
)
returns void
language plpgsql security definer as $$
DECLARE
  v_slot evaluation_slots%rowtype;
  v_existing bookings%rowtype;
  v_count int;
BEGIN
  SELECT * INTO v_slot FROM evaluation_slots
  WHERE id = p_slot_id AND evaluation_period_id = p_period_id;
  IF v_slot.id IS NULL THEN
    RAISE EXCEPTION 'Slot not found for this evaluation period';
  END IF;
  IF NOT v_slot.is_open THEN
    RAISE EXCEPTION 'That slot is closed';
  END IF;

  -- Lock the slot row to prevent concurrent booking race conditions
  PERFORM 1 FROM evaluation_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  SELECT * INTO v_existing FROM bookings
  WHERE student_id = auth.uid() AND evaluation_period_id = p_period_id;

  -- Block if the student already has a completed evaluation for this period
  IF v_existing.id IS NOT NULL AND v_existing.evaluation_status = 'done' THEN
    RAISE EXCEPTION 'This evaluation has already been completed and cannot be changed';
  END IF;

  IF v_existing.id IS NOT NULL
     AND v_existing.status = 'confirmed'
     AND v_existing.slot_id = p_slot_id THEN
    RAISE EXCEPTION 'You are already booked into this slot';
  END IF;

  -- Capacity check excluding the caller's own current row.
  SELECT count(*) INTO v_count FROM bookings
  WHERE slot_id = p_slot_id
    AND status = 'confirmed'
    AND (v_existing.id IS NULL OR id <> v_existing.id);

  IF v_count >= v_slot.capacity THEN
    RAISE EXCEPTION 'This slot is full';
  END IF;

  INSERT INTO bookings (student_id, evaluation_period_id, slot_id, status)
  VALUES (auth.uid(), p_period_id, p_slot_id, 'confirmed')
  ON CONFLICT (student_id, evaluation_period_id) DO UPDATE
    SET slot_id = excluded.slot_id,
        status = 'confirmed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.book_evaluation_slot(uuid, uuid)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.book_evaluation_slot(uuid, uuid)
  TO authenticated;

-- ── FIX 2b: cancel_my_booking — block if done ────────────
drop function if exists public.cancel_my_booking(uuid);
create or replace function public.cancel_my_booking(p_booking_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from bookings
  where id = p_booking_id and student_id = auth.uid();

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.status = 'cancelled' then
    return;
  end if;
  -- Block cancellation of completed evaluations
  if v_booking.evaluation_status = 'done' then
    raise exception 'This evaluation has already been completed and cannot be cancelled';
  end if;

  update bookings set status = 'cancelled' where id = v_booking.id;
end;
$$;

revoke execute on function public.cancel_my_booking(uuid)
  from public, anon;
grant execute on function public.cancel_my_booking(uuid)
  to authenticated;
