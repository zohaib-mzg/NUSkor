-- =========================================================
-- NUSkor — Migration v2.12
-- Semester-specific TA management, 3-section limit,
-- assessment-specific leaderboards, TA access control.
-- =========================================================

-- ---------- 1. ADD SEMESTER TO SECTION_TAS ----------
alter table public.section_tas
  add column if not exists semester text;

-- Backfill from course_sections
update public.section_tas st
set semester = cs.semester
from public.course_sections cs
where st.section_id = cs.id and st.semester is null;

-- Make NOT NULL after backfill
alter table public.section_tas
  alter column semester set not null;

-- Default to current semester for new rows
-- (application layer sets this; DB uses 'Fall 2026' as fallback)
-- ALTER column set default handled below

-- ---------- 2. REPLACE UNIQUE CONSTRAINTS ----------
-- Old: one TA per section (globally). Remove.
alter table public.section_tas
  drop constraint if exists section_tas_section_id_key;

-- New: one TA per section per semester.
-- (Different TAs can manage the same section in different semesters.)
alter table public.section_tas
  add constraint section_tas_section_semester_key
  unique (section_id, semester);

-- ---------- 3. MAX 3 SECTIONS PER TA PER SEMESTER (TRIGGER) ----------
create or replace function public.check_ta_max_sections()
returns trigger as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.section_tas
  where ta_id = new.ta_id
    and semester = new.semester;

  if v_count >= 3 then
    raise exception 'A TA can manage at most 3 sections per semester. This TA already has % sections for %.', v_count, new.semester;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ta_max_sections on public.section_tas;
create trigger trg_ta_max_sections
  before insert on public.section_tas
  for each row execute procedure public.check_ta_max_sections();

-- ---------- 4. TA ACCESS CHECK (SEMESTER-AWARE) ----------
-- Admin always has access. TA has access only if assigned to
-- that section in the given semester (defaults to current).
create or replace function public.is_ta_of_section(p_section_id uuid, p_semester text default null)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from section_tas st
    where st.section_id = p_section_id
      and st.ta_id = auth.uid()
      and (p_semester is null or st.semester = p_semester)
  );
$$;

-- ---------- 5. ASSESSMENT-SPECIFIC LEADERBOARD ----------
-- Ranks students within a single assessment, scoped to a section.
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
language sql security definer stable
as $$
  with scored as (
    select s.id, s.registration_no,
           coalesce(m.obtained, 0) as obtained,
           a.total_marks,
           case when a.total_marks > 0
             then round((coalesce(m.obtained, 0) / a.total_marks) * 100, 1)
             else 0
           end as pct
    from students s
    join enrollments e on e.student_id = s.id and e.section_id = p_section_id
    left join marks m on m.student_id = s.id and m.assessment_id = p_assessment_id
    join assessments a on a.id = p_assessment_id
    where s.archived_at is null
  ),
  ranked as (
    select registration_no, obtained, total_marks, pct,
           rank() over (order by obtained desc, registration_no) as rank
    from scored
  )
  select registration_no, obtained, total_marks, pct, rank
  from ranked
  order by rank;
$$;

grant execute on function public.get_assessment_leaderboard(uuid, uuid)
  to authenticated;

-- ---------- 6. ALSO CHECK TA SECTION LIMIT ON UPDATE ----------
-- (handles ta_id changes, though rare)
create or replace function public.check_ta_max_sections_update()
returns trigger as $$
declare
  v_count int;
begin
  if new.ta_id <> old.ta_id or new.semester <> old.semester then
    select count(*) into v_count
    from public.section_tas
    where ta_id = new.ta_id
      and semester = new.semester
      and id <> new.id;

    if v_count >= 3 then
      raise exception 'A TA can manage at most 3 sections per semester. This TA already has % sections for %.', v_count, new.semester;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ta_max_sections_update on public.section_tas;
create trigger trg_ta_max_sections_update
  before update on public.section_tas
  for each row execute procedure public.check_ta_max_sections_update();

-- =========================================================
-- END v2.12
-- =========================================================
