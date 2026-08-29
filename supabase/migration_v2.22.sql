-- ============================================================
-- NUSKOR migration v2.22
--   Overall section leaderboard now ranks by WEIGHTED OVERALL %,
--   not total raw marks.
--
--   weighted % = SUM over published assessments of
--                (obtained / total_marks) * weightage
--
--   • Highest weighted % = rank #1; ties share rank (competition
--     ranking), display ordered by registration_no.
--   • Published assessments only, enrolled active students only,
--     TA/admin accounts excluded (role='student' gate).
--   • Computed on read → recalculates automatically whenever marks
--     or assessment weightage change.
--   • get_assessment_leaderboard (per-assessment ranks) unchanged.
-- ============================================================

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
