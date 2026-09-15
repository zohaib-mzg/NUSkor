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
