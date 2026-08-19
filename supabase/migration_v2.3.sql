-- =========================================================
-- NUSkor — Migration v2.3
-- 1. Soft-delete for announcements (deleted_at / deleted_by)
-- 2. Archive for students (archived_at / archived_by) — safe deactivation
-- 3. RLS updates so archived students & deleted announcements are hidden
-- 4. RPC updates to skip archived students / deleted announcements
-- Idempotent: safe to run repeatedly in the SQL Editor.
-- =========================================================

-- ---------- 1. ANNOUNCEMENT SOFT DELETE ----------
alter table announcements
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id);

-- ---------- 2. STUDENT ARCHIVE ----------
alter table students
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references profiles(id);

-- ---------- 3. RLS: STUDENTS ----------
-- Students see their own row. TAs/admin see active students; archived
-- students stay visible to admins only (for management/restore).
drop policy if exists "students_select_own_admin_or_section_ta" on students;
create policy "students_select_own_admin_or_section_ta" on students
  for select using (
    id = auth.uid()
    or is_admin()
    or (
      archived_at is null
      and exists (
        select 1 from enrollments e
        join section_tas st on st.section_id = e.section_id
        where e.student_id = students.id and st.ta_id = auth.uid()
      )
    )
  );

-- ---------- 4. RLS: ANNOUNCEMENTS ----------
-- Deleted announcements disappear for everyone except admins.
drop policy if exists "announcements_select_section_members" on announcements;
create policy "announcements_select_section_members" on announcements
  for select using (
    is_admin()
    or (
      deleted_at is null
      and (
        is_ta_of_section(section_id)
        or (
          status = 'published'
          and (
            section_id is null
            or exists (
              select 1 from enrollments e
              where e.section_id = announcements.section_id
                and e.student_id = auth.uid()
            )
          )
        )
      )
    )
  );

-- ---------- 5. ENROLL-BY-EMAIL skips archived students ----------
create or replace function public.enroll_student_by_email(p_section_id uuid, p_email text)
returns uuid
language plpgsql security definer as $$
declare
  v_student_id uuid;
begin
  if not (is_admin() or is_ta_of_section(p_section_id)) then
    raise exception 'You do not have access to this section';
  end if;

  select s.id into v_student_id
  from students s
  join profiles p on p.id = s.id
  where lower(p.email) = lower(p_email)
    and s.archived_at is null;

  if v_student_id is null then
    raise exception 'No registered active student with that email';
  end if;

  insert into enrollments (student_id, section_id)
  values (v_student_id, p_section_id)
  on conflict (student_id, section_id) do nothing;

  return p_section_id;
end;
$$;

-- ---------- 6. NOTIFICATIONS skip archived students ----------
create or replace function public.create_announcement_notifications(p_announcement_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
  v_count int;
begin
  select * into v_ann from announcements where id = p_announcement_id and deleted_at is null;
  if v_ann.id is null then
    raise exception 'Announcement not found';
  end if;

  if v_ann.section_id is null then
    insert into notifications (user_id, announcement_id, title, message)
    select p.id, v_ann.id, v_ann.title, v_ann.body
    from profiles p
    join students s on s.id = p.id and s.archived_at is null
    on conflict (user_id, announcement_id) do nothing;
  else
    insert into notifications (user_id, announcement_id, title, message)
    select p.id, v_ann.id, v_ann.title, v_ann.body
    from profiles p
    join enrollments e on e.student_id = p.id and e.section_id = v_ann.section_id
    join students s on s.id = p.id and s.archived_at is null
    on conflict (user_id, announcement_id) do nothing;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------- 7. EMAIL DELIVERIES skip archived students ----------
create or replace function public.prepare_email_deliveries(p_announcement_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
  v_count int;
begin
  select * into v_ann from announcements where id = p_announcement_id and deleted_at is null;
  if v_ann.id is null then
    raise exception 'Announcement not found';
  end if;
  if not (is_admin() or is_ta_of_section(v_ann.section_id)) then
    raise exception 'You do not have access to this announcement';
  end if;

  if v_ann.section_id is null then
    insert into announcement_email_deliveries (announcement_id, student_id)
    select p_announcement_id, s.id
    from students s
    where s.archived_at is null
    on conflict (announcement_id, student_id) do nothing;
  else
    insert into announcement_email_deliveries (announcement_id, student_id)
    select p_announcement_id, e.student_id
    from enrollments e
    join students s on s.id = e.student_id and s.archived_at is null
    where e.section_id = v_ann.section_id
    on conflict (announcement_id, student_id) do nothing;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------- 8. LEADERBOARD / STATS exclude archived students ----------
create or replace function public.get_leaderboard(p_section_id uuid)
returns table (registration_no text, total numeric, percent numeric, rank bigint)
language sql security definer stable
as $$
  with scored as (
    select s.id, s.registration_no,
           coalesce(sum(m.obtained), 0) as total,
           coalesce(sum(a.total_marks), 0) as possible
    from students s
    join enrollments e on e.student_id = s.id and e.section_id = p_section_id
    left join marks m on m.student_id = s.id
    left join assessments a on a.id = m.assessment_id and a.section_id = p_section_id
    where s.archived_at is null
    group by s.id, s.registration_no
  ),
  ranked as (
    select registration_no,
           total,
           case when possible > 0 then round((total / possible) * 100, 1) else 0 end as percent,
           rank() over (order by total desc, registration_no) as rank
    from scored
  )
  select registration_no, total, percent, rank
  from ranked
  order by rank;
$$;

create or replace function public.get_assessment_stats(p_assessment_id uuid)
returns table (avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql security definer stable
as $$
  select
    round(avg(m.obtained)::numeric, 2),
    min(m.obtained),
    max(m.obtained),
    count(*)
  from marks m
  join students s on s.id = m.student_id and s.archived_at is null
  where m.assessment_id = p_assessment_id;
$$;

create or replace function public.get_assessment_stats_many(p_assessment_ids uuid[])
returns table (assessment_id uuid, avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql security definer stable
as $$
  select
    m.assessment_id,
    round(avg(m.obtained)::numeric, 2),
    min(m.obtained),
    max(m.obtained),
    count(*)
  from marks m
  join students s on s.id = m.student_id and s.archived_at is null
  where m.assessment_id = any(p_assessment_ids)
  group by m.assessment_id;
$$;

-- ---------- 9. INDEX on deleted_at for announcements ----------
create index if not exists idx_announcements_deleted
  on announcements(deleted_at);
create index if not exists idx_students_archived
  on students(archived_at);

-- =========================================================
-- END v2.3
-- =========================================================