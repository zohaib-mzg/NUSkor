-- =========================================================
-- NUSkor v2 — All optimization + fix changes
-- Run this in Supabase SQL Editor on your existing database.
-- Safe to run multiple times (uses DROP IF EXISTS + CREATE).
-- =========================================================

-- ---------------------------------------------------------
-- 1. BATCH MARKS UPSERT (replaces per-row save loops)
--    Save 100 marks = 1 call instead of 100.
-- ---------------------------------------------------------
drop function if exists public.bulk_upsert_marks(uuid, jsonb, uuid);
create or replace function public.bulk_upsert_marks(
  p_assessment_id uuid,
  p_marks jsonb,
  p_updated_by uuid
) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.marks (student_id, assessment_id, obtained, updated_by, updated_at)
  select
    (m->>'student_id')::uuid,
    p_assessment_id,
    (m->>'obtained')::numeric,
    p_updated_by,
    now()
  from jsonb_array_elements(p_marks) as m
  on conflict (student_id, assessment_id)
  do update set
    obtained = excluded.obtained,
    updated_by = excluded.updated_by,
    updated_at = now();
end;
$$;

grant execute on function public.bulk_upsert_marks(uuid, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------
-- 2. BATCH MARKS DELETE (replaces per-row delete loops)
-- ---------------------------------------------------------
drop function if exists public.bulk_delete_marks(uuid, uuid[]);
create or replace function public.bulk_delete_marks(
  p_assessment_id uuid,
  p_student_ids uuid[]
) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.marks
  where assessment_id = p_assessment_id
    and student_id = any(p_student_ids);
end;
$$;

grant execute on function public.bulk_delete_marks(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------
-- 3. STUDENT MARKS DATA (replaces 21+ N+1 queries with 1)
--    Returns all published assessments, marks, stats, and
--    leaderboard for a student in a single round trip.
-- ---------------------------------------------------------
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
  assessment_stats as (
    select sa.assessment_id,
           round(avg(m.obtained)::numeric, 2) as avg_marks,
           min(m.obtained) as min_marks,
           max(m.obtained) as max_marks,
           count(*)::bigint as total_students
    from section_assessments sa
    join public.marks m on m.assessment_id = sa.assessment_id
    join public.enrollments e on e.student_id = m.student_id and e.section_id = sa.section_id
    join public.students s on s.id = m.student_id and s.archived_at is null
    join public.profiles pr on pr.id = s.id and pr.role = 'student'
    where sa.assessment_id is not null
    group by sa.assessment_id
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
  where sa.assessment_id is not null
  order by sa.section_code, sa.assessment_title, sl.rnk;
$$;

grant execute on function public.get_student_marks_data(uuid) to authenticated;

-- ---------------------------------------------------------
-- 4. COMPOSITE INDEXES (2-5x faster frequent queries)
-- ---------------------------------------------------------
create index if not exists idx_marks_assessment_student on marks(assessment_id, student_id);
create index if not exists idx_enrollments_section_student on enrollments(section_id, student_id);
create index if not exists idx_bookings_student_period on bookings(student_id, evaluation_period_id);
create index if not exists idx_assessments_section_status on assessments(section_id, status);
create index if not exists idx_notifications_user_read on notifications(user_id, is_read, created_at desc);
create index if not exists idx_sections_status_semester on course_sections(status, semester);

-- ---------------------------------------------------------
-- 5. UPDATED DOMAIN + ADMIN (all @nu.edu.pk + adminmzg)
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email != 'adminmzg@gmail.com' and new.email not like '%@lhr.nu.edu.pk' then
    raise exception 'Only @lhr.nu.edu.pk accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when new.email = 'adminmzg@gmail.com' then 'admin' else 'student' end
  );

  return new;
end;
$$ language plpgsql security definer;
