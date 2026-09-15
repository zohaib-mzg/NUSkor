-- =========================================================
-- migration_v2.32.sql
-- Fix leaderboard ranking: change rank() to dense_rank()
-- so tied students share a rank and the next distinct score
-- gets the immediately next rank (dense ranking).
-- =========================================================

-- 1. Overall section leaderboard
drop function if exists public.get_leaderboard(uuid);
create or replace function public.get_leaderboard(p_section_id uuid)
returns table (
  registration_no text,
  weighted_pct numeric,
  percent numeric,
  rank bigint
)
language sql stable
security definer
set search_path = ''
as $$
  with scored as (
    select s.id,
           s.registration_no,
           coalesce(
             sum(m.obtained / nullif(a.total_marks, 0) * a.weightage),
             0
           ) as weighted_pct
    from public.enrollments e
    join public.students s
      on s.id = e.student_id and s.archived_at is null
    join public.profiles pr
      on pr.id = s.id and pr.role = 'student'
    left join public.marks m
      on m.student_id = s.id
    left join public.assessments a
      on a.id = m.assessment_id
     and a.section_id = p_section_id
     and a.status = 'published'
    where e.section_id = p_section_id
      and public.can_view_section_aggregates(p_section_id)
    group by s.id, s.registration_no
  )
  select registration_no,
         weighted_pct,
         round(weighted_pct, 1) as percent,
         dense_rank() over (order by weighted_pct desc) as rank
  from scored
  order by weighted_pct desc, registration_no;
$$;

grant execute on function public.get_leaderboard(uuid)
  to authenticated;

-- 2. Per-assessment leaderboard
drop function if exists public.get_assessment_leaderboard(uuid, uuid);
create or replace function public.get_assessment_leaderboard(
  p_assessment_id uuid,
  p_section_id uuid
)
returns table (
  registration_no text,
  obtained numeric,
  total_marks numeric,
  percent numeric,
  rank bigint
)
language sql stable
security definer
set search_path = ''
as $$
  with scored as (
    select s.id,
           s.registration_no,
           m.obtained,
           a.total_marks,
           case when a.total_marks > 0
             then round((m.obtained / a.total_marks) * 100, 1)
             else 0
           end as pct
    from public.marks m
    join public.assessments a
      on a.id = m.assessment_id
     and a.id = p_assessment_id
     and a.section_id = p_section_id
     and a.status = 'published'
    join public.course_sections cs
      on cs.id = a.section_id and cs.id = p_section_id
    join public.enrollments e
      on e.student_id = m.student_id and e.section_id = p_section_id
    join public.students s
      on s.id = m.student_id and s.archived_at is null
    join public.profiles pr
      on pr.id = s.id and pr.role = 'student'
    where public.can_view_section_aggregates(p_section_id)
  )
  select registration_no, obtained, total_marks, pct,
         dense_rank() over (order by obtained desc) as rank
  from scored
  order by rank, registration_no;
$$;

grant execute on function public.get_assessment_leaderboard(uuid, uuid)
  to authenticated;

-- 3. Student marks data leaderboard (used by student marks page)
drop function if exists public.get_student_marks_data(uuid);
create or replace function public.get_student_marks_data(p_student_id uuid)
returns table (
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
  with student_section as (
    select e.section_id
    from public.enrollments e
    where e.student_id = p_student_id
  ),
  section_assessments as (
    select ss.section_id,
           cs.section_code,
           c.code as course_code,
           c.title as course_title,
           cs.leaderboard_visible,
           a.id as assessment_id,
           a.title as assessment_title,
           a.type as assessment_type,
           a.total_marks,
           a.weightage
    from student_section ss
    join public.course_sections cs on cs.id = ss.section_id
    join public.courses c on c.id = cs.course_id
    left join public.assessments a on a.section_id = ss.section_id and a.status = 'published'
  ),
  assessment_stats as (
    select sa.assessment_id,
           avg(m.obtained) as avg_marks,
           min(m.obtained) as min_marks,
           max(m.obtained) as max_marks,
           count(*) as total_students
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
           dense_rank() over (partition by sa.assessment_id order by m.obtained desc) as rnk
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
