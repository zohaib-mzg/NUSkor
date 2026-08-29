-- ============================================================
-- MIGRATION v2.21 — Fix leaderboard / class-average / min-max
-- ============================================================
-- ROOT CAUSE (found on live DB): migration v2.20 made the stats &
-- leaderboard RPCs invoker-rights (prosecdef = false). When a STUDENT
-- calls them, RLS restricts `students`, `enrollments` and `marks` to
-- the caller's own rows, so:
--   • get_assessment_leaderboard returned ONLY the logged-in student
--   • get_assessment_stats(_many) computed avg/min/max over ONE mark
--
-- FIX: make the functions SECURITY DEFINER again (so one student can
-- see section aggregates without RLS hiding classmates) while moving
-- ALL scoping/isolation INSIDE each function:
--   course + section + assessment + enrollment + role + published.
--
-- Eligibility rules enforced in SQL (never by the frontend):
--   • enrolled in the SPECIFIC section (enrollments.section_id)
--   • has a row in students, not archived
--   • profiles.role = 'student'  → TA/admin accounts are NEVER counted,
--     even if a stray enrollment/students row exists for them
--   • assessment belongs to that exact section AND status='published'
--   • per-assessment leaderboard: only students WHO HAVE A MARK
--   • ties share the same rank (standard competition ranking)
--
-- Caller gate: admin, or TA of the section, or an enrolled student of
-- that section. Everyone else gets an empty result (no data leak).
-- ============================================================

-- ---------- shared helper: may the caller view this section's
--            aggregate marks? (definer-safe, fully qualified) ----------
drop function if exists public.can_view_section_aggregates(uuid);
create or replace function public.can_view_section_aggregates(p_section_id uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role = 'admin'
  ) or exists (
    select 1 from public.section_tas st
    where st.section_id = p_section_id and st.ta_id = auth.uid()
  ) or exists (
    select 1 from public.enrollments e
    where e.section_id = p_section_id and e.student_id = auth.uid()
  );
$$;

-- ============================================================
-- 1. PER-ASSESSMENT LEADERBOARD
--    Only enrolled, active STUDENTS of the given section who HAVE a
--    mark on THIS published assessment. Highest mark = rank #1, ties
--    share a rank. Assessment must belong to p_section_id.
-- ============================================================
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

-- ============================================================
-- 2. CLASS STATS FOR ONE ASSESSMENT (avg / min / max / count)
--    Average/min/max come ONLY from eligible students' obtained marks
--    (never the assessment total, never other sections/assessments).
-- ============================================================
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
    and public.can_view_section_aggregates(a.section_id);
$$;

-- ============================================================
-- 3. CLASS STATS FOR MANY ASSESSMENTS (single round trip)
--    Same scoping as above; assessments of ANY status are excluded.
-- ============================================================
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
  group by a.id;
$$;

grant execute on function public.get_assessment_stats_many(uuid[])
  to authenticated;
grant execute on function public.get_assessment_stats(uuid)
  to authenticated;

-- ============================================================
-- 4. OVERALL SECTION LEADERBOARD (sum across published assessments)
--    Same eligibility rules; totals only over PUBLISHED assessments
--    belonging to this section.
-- ============================================================
drop function if exists public.get_leaderboard(uuid);
create or replace function public.get_leaderboard(p_section_id uuid)
returns table (registration_no text, total numeric, percent numeric, rank bigint)
language sql stable
security definer
set search_path = ''
as $$
  with scored as (
    select s.id,
           s.registration_no,
           coalesce(sum(m.obtained), 0) as total,
           coalesce(sum(a.total_marks), 0) as possible
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
         total,
         case when possible > 0 then round((total / possible) * 100, 1) else 0 end as percent,
         rank() over (order by total desc, registration_no) as rank
  from scored
  order by rank;
$$;

grant execute on function public.get_leaderboard(uuid)
  to authenticated;

-- ============================================================
-- Done. Student-facing numbers now follow:
--   scope   → course + section + assessment + enrollment + role=student
--   visible → published assessments only (drafts/archives excluded)
--   ranked  → actual obtained marks, highest first, ties share rank
-- ============================================================
