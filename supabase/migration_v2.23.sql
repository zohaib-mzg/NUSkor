-- Migration v2.23: Hide leaderboard/stats/rank from students with no marks entered
-- Adds student_has_marks() helper and gates get_leaderboard, get_assessment_leaderboard,
-- and get_assessment_stats_many behind it so students see nothing until TA enters their marks.

-- Helper: returns true if the calling student has at least one mark entered
-- in any section they are enrolled in. Admins and TAs always return true.
drop function if exists public.student_has_marks();
create or replace function public.student_has_marks()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  -- Admins and TAs always bypass
  select exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role in ('admin', 'ta')
  ) or exists (
    select 1 from public.marks m
    where m.student_id = auth.uid()
  );
$$;

grant execute on function public.student_has_marks() to authenticated;

-- Gate get_leaderboard: only return data if caller has marks
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
         rank() over (order by weighted_pct desc) as rank
  from scored
  order by weighted_pct desc, registration_no;
$$;

grant execute on function public.get_leaderboard(uuid)
  to authenticated;

-- Gate get_assessment_leaderboard: only return data if caller has marks
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
     and a.section_id = p_section_id   -- assessment MUST be in this section
     and a.status = 'published'        -- drafts/archives never expose marks
    join public.course_sections cs
      on cs.id = a.section_id and cs.id = p_section_id
    join public.enrollments e
      on e.student_id = m.student_id and e.section_id = p_section_id
    join public.students s
      on s.id = m.student_id and s.archived_at is null
    join public.profiles pr
      on pr.id = s.id and pr.role = 'student'   -- never TA/admin accounts
    where public.can_view_section_aggregates(p_section_id)
  )
  select registration_no, obtained, total_marks, pct,
         rank() over (order by obtained desc) as rank
  from scored
  order by rank, registration_no;
$$;

grant execute on function public.get_assessment_leaderboard(uuid, uuid)
  to authenticated;

-- Gate get_assessment_stats_many: only return data if caller has marks
drop function if exists public.get_assessment_stats_many(uuid[]);
create or replace function public.get_assessment_stats_many(p_assessment_ids uuid[])
returns table (assessment_id uuid, avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql stable
security definer
set search_path = ''
as $$
  select
    a.id as assessment_id,
    round(avg(m.obtained)::numeric, 2),
    min(m.obtained),
    max(m.obtained),
    count(*)
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
    and public.student_has_marks()
  group by a.id;
$$;

grant execute on function public.get_assessment_stats_many(uuid[])
  to authenticated;

-- Also gate get_assessment_stats (single)
drop function if exists public.get_assessment_stats(uuid);
create or replace function public.get_assessment_stats(p_assessment_id uuid)
returns table (avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql stable
security definer
set search_path = ''
as $$
  select
    round(avg(m.obtained)::numeric, 2),
    min(m.obtained),
    max(m.obtained),
    count(*)
  from public.marks m
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
    and public.student_has_marks();
$$;

grant execute on function public.get_assessment_stats(uuid)
  to authenticated;
