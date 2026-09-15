-- =========================================================
-- TRIMMED MEAN FOR ASSESSMENT STATISTICS
-- Replaces plain arithmetic average with 10% trimmed mean.
-- 
-- Trimmed mean: sort marks, remove lowest k and highest k
-- values where k = floor(0.10 × n), then average the rest.
-- For small datasets where k = 0, uses simple mean.
-- =========================================================

-- 1. get_student_marks_data — use trimmed mean instead of plain avg
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
  -- Raw marks for each assessment (for trimmed mean calculation)
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
  -- Trimmed mean: remove lowest k and highest k where k = floor(0.10 * n)
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
  where sa.assessment_id is not null
  order by sa.section_code, sa.assessment_title, sl.rnk;
$$;

grant execute on function public.get_student_marks_data(uuid)
  to authenticated;

-- 2. get_assessment_stats — trimmed mean for single assessment
drop function if exists public.get_assessment_stats(uuid);
create or replace function public.get_assessment_stats(p_assessment_id uuid)
returns table (avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql stable
security definer
set search_path = ''
as $$
  with raw_marks as (
    select m.obtained,
           row_number() over (order by m.obtained) as rn,
           count(*) over () as total_count
    from marks m
    join public.assessments a
      on a.id = m.assessment_id
     and a.status = 'published'
    join public.enrollments e
      on e.student_id = m.student_id and e.section_id = a.section_id
    join public.students s
      on s.id = m.student_id and s.archived_at is null
    join public.profiles pr
      on pr.id = s.id and pr.role = 'student'
    where m.assessment_id = p_assessment_id
      and public.can_view_section_aggregates(a.section_id)
  )
  select
    round(avg(obtained)::numeric, 2),
    min(obtained),
    max(obtained),
    count(*)::bigint
  from raw_marks
  where rn > floor(0.10 * total_count)
    and rn <= total_count - floor(0.10 * total_count);
$$;

-- 3. get_assessment_stats_many — trimmed mean for many assessments
drop function if exists public.get_assessment_stats_many(uuid[]);
create or replace function public.get_assessment_stats_many(p_assessment_ids uuid[])
returns table (assessment_id uuid, avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql stable
security definer
set search_path = ''
as $$
  with raw_marks as (
    select a.id as assessment_id,
           m.obtained,
           row_number() over (partition by a.id order by m.obtained) as rn,
           count(*) over (partition by a.id) as total_count
    from public.assessments a
    join public.marks m
      on m.assessment_id = a.id
    join public.enrollments e
      on e.student_id = m.student_id and e.section_id = a.section_id
    join public.students s
      on s.id = m.student_id and s.archived_at is null
    join public.profiles pr
      on pr.id = s.id and pr.role = 'student'
    where a.id = any(p_assessment_ids)
      and a.status = 'published'
      and public.can_view_section_aggregates(a.section_id)
  )
  select
    assessment_id,
    round(avg(obtained)::numeric, 2),
    min(obtained),
    max(obtained),
    count(*)::bigint
  from raw_marks
  where rn > floor(0.10 * total_count)
    and rn <= total_count - floor(0.10 * total_count)
  group by assessment_id;
$$;

grant execute on function public.get_assessment_stats(uuid)
  to authenticated;
grant execute on function public.get_assessment_stats_many(uuid[])
  to authenticated;
