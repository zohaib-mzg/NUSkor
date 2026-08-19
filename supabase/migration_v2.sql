-- =========================================================
-- NUSkor — Migration v2
-- TA role · Course Sections · Multiple TAs · Invitations
-- Notifications · Section-targeted announcements
--
-- Run ONCE in the Supabase SQL Editor on the existing v1.1 DB.
-- Data-preserving migration: existing courses get a default
-- "Section A"; enrollments/assessments/evaluation periods move
-- to section_id; announcements become section-targetable.
-- =========================================================

-- ---------------------------------------------------------
-- 0. PROFILES — allow the 'ta' role
-- ---------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'ta', 'student'));

-- ---------------------------------------------------------
-- 1. COURSE SECTIONS
-- ---------------------------------------------------------
create table if not exists course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  section_code text not null,
  semester text,
  academic_year text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (course_id, section_code)
);

-- Give every existing course a default "Section A"
insert into course_sections (course_id, section_code, created_by)
select c.id, 'A', c.created_by
from courses c
on conflict do nothing;

-- ---------------------------------------------------------
-- 2. SECTION TAs (many-to-many: section <-> TA)
-- ---------------------------------------------------------
create table if not exists section_tas (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references course_sections(id) on delete cascade,
  ta_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (section_id, ta_id)
);

-- ---------------------------------------------------------
-- 3. TA APPLICATIONS
-- ---------------------------------------------------------
create table if not exists ta_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  user_id uuid references profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text
);
create index if not exists idx_ta_applications_status on ta_applications(status);
create index if not exists idx_ta_applications_user on ta_applications(user_id);

-- ---------------------------------------------------------
-- 4. ENROLLMENTS — switch from course to SECTION
-- ---------------------------------------------------------
alter table enrollments add column if not exists section_id uuid
  references course_sections(id) on delete cascade;

update enrollments e
set section_id = cs.id
from course_sections cs
where cs.course_id = e.course_id;

alter table enrollments alter column section_id set not null;
alter table enrollments drop constraint if exists enrollments_student_id_course_id_key;
alter table enrollments drop column if exists course_id;
-- drop-then-add so re-running the migration after a partial failure is safe
alter table enrollments drop constraint if exists enrollments_student_section_unique;
alter table enrollments add constraint enrollments_student_section_unique
  unique (student_id, section_id);

-- ---------------------------------------------------------
-- 5. ASSESSMENTS — section-based + weightage + release + status
-- ---------------------------------------------------------
alter table assessments add column if not exists section_id uuid
  references course_sections(id) on delete cascade;

update assessments a
set section_id = cs.id
from course_sections cs
where cs.course_id = a.course_id;

alter table assessments alter column section_id set not null;
alter table assessments drop column if exists course_id;
alter table assessments add column if not exists weightage numeric not null default 0
  check (weightage >= 0);
alter table assessments add column if not exists release_date date;
alter table assessments add column if not exists status text not null default 'published'
  check (status in ('draft', 'published', 'archived'));

-- ---------------------------------------------------------
-- 6. EVALUATION PERIODS — section-based
-- ---------------------------------------------------------
alter table evaluation_periods add column if not exists section_id uuid
  references course_sections(id) on delete cascade;

update evaluation_periods ep
set section_id = cs.id
from course_sections cs
where cs.course_id = ep.course_id;

alter table evaluation_periods alter column section_id set not null;
alter table evaluation_periods drop column if exists course_id;

-- ---------------------------------------------------------
-- 7. EVALUATION SLOTS — start/end time (auto-generation support)
-- ---------------------------------------------------------
alter table evaluation_slots add column if not exists start_time time;
alter table evaluation_slots add column if not exists end_time time;

update evaluation_slots
set start_time = slot_time,
    end_time = slot_time + interval '5 minutes'
where start_time is null;

alter table evaluation_slots alter column start_time set not null;
alter table evaluation_slots alter column end_time set not null;
alter table evaluation_slots drop column if exists slot_time;

-- ---------------------------------------------------------
-- 8. ANNOUNCEMENTS — section-targetable + status
--    section_id NULL = announcement for everyone
-- ---------------------------------------------------------
alter table announcements add column if not exists section_id uuid
  references course_sections(id) on delete cascade;
alter table announcements add column if not exists status text not null default 'published'
  check (status in ('draft', 'published', 'archived'));
alter table announcements add column if not exists published_at timestamptz;

update announcements
set status = case when is_published then 'published' else 'draft' end,
    published_at = coalesce(published_at, created_at)
where published_at is null;

-- Old v1 policies reference is_published; drop them BEFORE the column.
-- (They are recreated with new names in the RLS section below.)
drop policy if exists "announcements_select_published" on announcements;
drop policy if exists "announcements_admin_write" on announcements;
drop policy if exists "announcements_admin_update" on announcements;
drop policy if exists "announcements_admin_delete" on announcements;

alter table announcements drop column if exists is_published;

-- ---------------------------------------------------------
-- 9. IN-APP NOTIFICATIONS
-- ---------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  announcement_id uuid references announcements(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, announcement_id)
);
create index if not exists idx_notifications_user on notifications(user_id, is_read);

-- ---------------------------------------------------------
-- 10. ANNOUNCEMENT EMAIL DELIVERIES (idempotent Resend tracking)
-- ---------------------------------------------------------
create table if not exists announcement_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  resend_message_id text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);
create index if not exists idx_email_deliveries_announcement
  on announcement_email_deliveries(announcement_id);

-- ---------------------------------------------------------
-- 11. STUDENT INVITES (secure enrollment tokens)
-- ---------------------------------------------------------
create table if not exists student_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  section_id uuid not null references course_sections(id) on delete cascade,
  created_by_ta uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  status text not null default 'active'
    check (status in ('active', 'inactive'))
);
create index if not exists idx_student_invites_section on student_invites(section_id);

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

-- Existing: is_admin() (profiles.role = 'admin' for auth.uid())

create or replace function public.is_ta_of_section(p_section_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from section_tas st
    where st.section_id = p_section_id and st.ta_id = auth.uid()
  );
$$;

create or replace function public.is_ta_of_student(p_student_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from enrollments e
    join section_tas st on st.section_id = e.section_id
    where e.student_id = p_student_id and st.ta_id = auth.uid()
  );
$$;

-- Enroll the signed-in student via a secure invitation token.
-- Validates expiry/status/usage, enrolls, increments used_count.
-- security definer: students cannot bypass by inserting directly.
create or replace function public.join_section(p_token text)
returns uuid
language plpgsql security definer as $$
declare
  v_invite student_invites%rowtype;
  v_student_id uuid;
begin
  select * into v_invite from student_invites where token = p_token;
  if v_invite is null then
    raise exception 'Invalid invitation link';
  elsif v_invite.status <> 'active' then
    raise exception 'This invitation is no longer active';
  elsif v_invite.expires_at < now() then
    raise exception 'This invitation has expired';
  elsif v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    raise exception 'This invitation has reached its usage limit';
  end if;

  select id into v_student_id from students where id = auth.uid();
  if v_student_id is null then
    raise exception 'Only registered students can join through an invitation';
  end if;

  insert into enrollments (student_id, section_id)
  values (auth.uid(), v_invite.section_id)
  on conflict (student_id, section_id) do nothing;

  update student_invites set used_count = used_count + 1
  where id = v_invite.id;

  return v_invite.section_id;
end;
$$;

-- Create in-app notifications for an announcement's target section
-- (NULL section = all students). Returns rows created.
create or replace function public.create_announcement_notifications(p_announcement_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
  v_count int;
begin
  select * into v_ann from announcements where id = p_announcement_id;
  if v_ann is null then
    raise exception 'Announcement not found';
  end if;

  if v_ann.section_id is null then
    insert into notifications (user_id, announcement_id, title, message)
    select p.id, v_ann.id, v_ann.title, v_ann.body
    from profiles p
    join students s on s.id = p.id
    on conflict (user_id, announcement_id) do nothing;
  else
    insert into notifications (user_id, announcement_id, title, message)
    select p.id, v_ann.id, v_ann.title, v_ann.body
    from profiles p
    join enrollments e on e.student_id = p.id and e.section_id = v_ann.section_id
    on conflict (user_id, announcement_id) do nothing;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------
-- LEADERBOARD — now section-scoped
-- ---------------------------------------------------------
drop function if exists public.get_leaderboard(uuid);
create or replace function public.get_leaderboard(p_section_id uuid)
returns table (registration_no text, total numeric, percent numeric, rank bigint)
language sql security definer stable as $$
  with scored as (
    select s.id, s.registration_no,
           coalesce(sum(m.obtained), 0) as total,
           coalesce(sum(a.total_marks), 0) as possible
    from students s
    join enrollments e on e.student_id = s.id and e.section_id = p_section_id
    left join marks m on m.student_id = s.id
    left join assessments a on a.id = m.assessment_id and a.section_id = p_section_id
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

-- Slots with live confirmed-booking counts (start/end times)
create or replace function public.get_slots_with_counts(p_period_id uuid)
returns table (slot_id uuid, slot_date date, start_time time, end_time time,
               capacity int, is_open boolean, booked bigint)
language sql security definer stable as $$
  select s.id, s.slot_date, s.start_time, s.end_time, s.capacity, s.is_open,
         (select count(*) from bookings b
          where b.slot_id = s.id and b.status = 'confirmed') as booked
  from evaluation_slots s
  where s.evaluation_period_id = p_period_id
  order by s.slot_date, s.start_time;
$$;

-- =========================================================
-- ROW LEVEL SECURITY — full rewrite
-- =========================================================

alter table profiles enable row level security;
alter table students enable row level security;
alter table courses enable row level security;
alter table course_sections enable row level security;
alter table section_tas enable row level security;
alter table enrollments enable row level security;
alter table assessments enable row level security;
alter table marks enable row level security;
alter table evaluation_periods enable row level security;
alter table evaluation_slots enable row level security;
alter table bookings enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;
alter table ta_applications enable row level security;
alter table student_invites enable row level security;
alter table announcement_email_deliveries enable row level security;

-- ---- PROFILES ----
drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_update_own_name_only" on profiles;
drop policy if exists "profiles_admin_full_access" on profiles;
create policy "profiles_select_own_admin_or_section_ta" on profiles
  for select using (
    id = auth.uid()
    or is_admin()
    or exists (
      select 1 from enrollments e
      join section_tas st on st.section_id = e.section_id
      where e.student_id = profiles.id and st.ta_id = auth.uid()
    )
  );
create policy "profiles_update_own_no_role_change" on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
  );
create policy "profiles_admin_full_access" on profiles
  for all using (is_admin()) with check (is_admin());

-- ---- STUDENTS ----
drop policy if exists "students_select_own_or_admin" on students;
drop policy if exists "students_admin_write" on students;
drop policy if exists "students_admin_update" on students;
drop policy if exists "students_admin_delete" on students;
create policy "students_select_own_admin_or_section_ta" on students
  for select using (
    id = auth.uid()
    or is_admin()
    or exists (
      select 1 from enrollments e
      join section_tas st on st.section_id = e.section_id
      where e.student_id = students.id and st.ta_id = auth.uid()
    )
  );
create policy "students_admin_write" on students
  for insert with check (is_admin());
create policy "students_admin_update" on students
  for update using (is_admin()) with check (is_admin());
create policy "students_admin_delete" on students
  for delete using (is_admin());

-- ---- COURSES (read: signed-in; write: admin) ----
drop policy if exists "courses_select_authenticated" on courses;
drop policy if exists "courses_admin_write" on courses;
drop policy if exists "courses_admin_update" on courses;
drop policy if exists "courses_admin_delete" on courses;
create policy "courses_select_authenticated" on courses
  for select using (auth.uid() is not null);
create policy "courses_admin_write" on courses
  for insert with check (is_admin());
create policy "courses_admin_update" on courses
  for update using (is_admin()) with check (is_admin());
create policy "courses_admin_delete" on courses
  for delete using (is_admin());

-- ---- COURSE SECTIONS ----
create policy "sections_select_member_admin" on course_sections
  for select using (
    is_admin()
    or is_ta_of_section(id)
    or exists (
      select 1 from enrollments e
      where e.section_id = course_sections.id and e.student_id = auth.uid()
    )
  );
create policy "sections_admin_write" on course_sections
  for insert with check (is_admin());
create policy "sections_admin_update" on course_sections
  for update using (is_admin()) with check (is_admin());
create policy "sections_admin_delete" on course_sections
  for delete using (is_admin());

-- ---- SECTION TAs ----
create policy "section_tas_select_member_admin" on section_tas
  for select using (
    is_admin()
    or ta_id = auth.uid()
    or is_ta_of_section(section_id)
  );
create policy "section_tas_admin_write" on section_tas
  for insert with check (is_admin());
create policy "section_tas_admin_update" on section_tas
  for update using (is_admin()) with check (is_admin());
create policy "section_tas_admin_delete" on section_tas
  for delete using (is_admin());

-- ---- ENROLLMENTS (students join ONLY via join_section() RPC) ----
drop policy if exists "enrollments_select_own_or_admin" on enrollments;
drop policy if exists "enrollments_admin_write" on enrollments;
drop policy if exists "enrollments_admin_update" on enrollments;
drop policy if exists "enrollments_admin_delete" on enrollments;
create policy "enrollments_select_own_admin_or_section_ta" on enrollments
  for select using (
    student_id = auth.uid()
    or is_admin()
    or is_ta_of_section(section_id)
  );
create policy "enrollments_admin_write" on enrollments
  for insert with check (is_admin());
create policy "enrollments_admin_update" on enrollments
  for update using (is_admin()) with check (is_admin());
create policy "enrollments_admin_delete" on enrollments
  for delete using (is_admin());

-- ---- ASSESSMENTS ----
drop policy if exists "assessments_select_authenticated" on assessments;
drop policy if exists "assessments_admin_write" on assessments;
drop policy if exists "assessments_admin_update" on assessments;
drop policy if exists "assessments_admin_delete" on assessments;
create policy "assessments_select_section_members" on assessments
  for select using (
    is_admin()
    or is_ta_of_section(section_id)
    or exists (
      select 1 from enrollments e
      where e.section_id = assessments.section_id and e.student_id = auth.uid()
    )
  );
create policy "assessments_admin_or_ta_write" on assessments
  for insert with check (is_admin() or is_ta_of_section(section_id));
create policy "assessments_admin_or_ta_update" on assessments
  for update using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));
create policy "assessments_admin_or_ta_delete" on assessments
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---- MARKS ----
drop policy if exists "marks_select_own_or_admin" on marks;
drop policy if exists "marks_admin_write" on marks;
drop policy if exists "marks_admin_update" on marks;
drop policy if exists "marks_admin_delete" on marks;
create policy "marks_select_own_admin_or_ta" on marks
  for select using (
    student_id = auth.uid()
    or is_admin()
    or is_ta_of_student(student_id)
  );
create policy "marks_admin_or_ta_write" on marks
  for insert with check (is_admin() or is_ta_of_student(student_id));
create policy "marks_admin_or_ta_update" on marks
  for update using (is_admin() or is_ta_of_student(student_id))
  with check (is_admin() or is_ta_of_student(student_id));
create policy "marks_admin_or_ta_delete" on marks
  for delete using (is_admin() or is_ta_of_student(student_id));

-- ---- EVALUATION PERIODS ----
drop policy if exists "eval_periods_select_authenticated" on evaluation_periods;
drop policy if exists "eval_periods_admin_write" on evaluation_periods;
drop policy if exists "eval_periods_admin_update" on evaluation_periods;
drop policy if exists "eval_periods_admin_delete" on evaluation_periods;
create policy "periods_select_section_members" on evaluation_periods
  for select using (
    is_admin()
    or is_ta_of_section(section_id)
    or exists (
      select 1 from enrollments e
      where e.section_id = evaluation_periods.section_id and e.student_id = auth.uid()
    )
  );
create policy "periods_admin_or_ta_write" on evaluation_periods
  for insert with check (is_admin() or is_ta_of_section(section_id));
create policy "periods_admin_or_ta_update" on evaluation_periods
  for update using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));
create policy "periods_admin_or_ta_delete" on evaluation_periods
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---- EVALUATION SLOTS ----
drop policy if exists "eval_slots_select_authenticated" on evaluation_slots;
drop policy if exists "eval_slots_admin_write" on evaluation_slots;
drop policy if exists "eval_slots_admin_update" on evaluation_slots;
drop policy if exists "eval_slots_admin_delete" on evaluation_slots;
create policy "slots_select_section_members" on evaluation_slots
  for select using (
    is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = evaluation_slots.evaluation_period_id
        and (is_ta_of_section(ep.section_id)
             or exists (
               select 1 from enrollments e
               where e.section_id = ep.section_id and e.student_id = auth.uid()
             ))
    )
  );
create policy "slots_admin_or_ta_write" on evaluation_slots
  for insert with check (
    is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = evaluation_slots.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  );
create policy "slots_admin_or_ta_update" on evaluation_slots
  for update using (
    is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = evaluation_slots.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  ) with check (
    is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = evaluation_slots.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  );
create policy "slots_admin_or_ta_delete" on evaluation_slots
  for delete using (
    is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = evaluation_slots.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  );

-- ---- BOOKINGS ----
drop policy if exists "bookings_select_own_or_admin" on bookings;
drop policy if exists "bookings_insert_own" on bookings;
drop policy if exists "bookings_update_own_or_admin" on bookings;
drop policy if exists "bookings_admin_delete" on bookings;
create policy "bookings_select_own_admin_or_ta" on bookings
  for select using (
    student_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = bookings.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  );
create policy "bookings_insert_own" on bookings
  for insert with check (student_id = auth.uid());
create policy "bookings_update_own_or_admin" on bookings
  for update using (student_id = auth.uid() or is_admin())
  with check (student_id = auth.uid() or is_admin());
create policy "bookings_admin_delete" on bookings
  for delete using (is_admin());

-- ---- ANNOUNCEMENTS ----
drop policy if exists "announcements_select_published" on announcements;
drop policy if exists "announcements_admin_write" on announcements;
drop policy if exists "announcements_admin_update" on announcements;
drop policy if exists "announcements_admin_delete" on announcements;
create policy "announcements_select_section_members" on announcements
  for select using (
    is_admin()
    or is_ta_of_section(section_id)
    or (status = 'published' and (
      section_id is null
      or exists (
        select 1 from enrollments e
        where e.section_id = announcements.section_id
          and e.student_id = auth.uid()
      )
    ))
  );
create policy "announcements_admin_or_ta_write" on announcements
  for insert with check (is_admin() or is_ta_of_section(section_id));
create policy "announcements_admin_or_ta_update" on announcements
  for update using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));
create policy "announcements_admin_or_ta_delete" on announcements
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---- NOTIFICATIONS (own only; created via security definer RPC) ----
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- TA APPLICATIONS ----
create policy "ta_applications_select_own_or_admin" on ta_applications
  for select using (user_id = auth.uid() or is_admin());
create policy "ta_applications_insert_own" on ta_applications
  for insert with check (user_id = auth.uid());
create policy "ta_applications_admin_update" on ta_applications
  for update using (is_admin()) with check (is_admin());
create policy "ta_applications_admin_delete" on ta_applications
  for delete using (is_admin());

-- ---- STUDENT INVITES ----
create policy "invites_select_owner_admin" on student_invites
  for select using (created_by_ta = auth.uid() or is_admin());
create policy "invites_insert_owner_admin" on student_invites
  for insert with check (
    is_admin()
    or (created_by_ta = auth.uid() and is_ta_of_section(section_id))
  );
create policy "invites_update_owner_admin" on student_invites
  for update using (created_by_ta = auth.uid() or is_admin())
  with check (created_by_ta = auth.uid() or is_admin());
create policy "invites_delete_owner_admin" on student_invites
  for delete using (created_by_ta = auth.uid() or is_admin());

-- ---- ANNOUNCEMENT EMAIL DELIVERIES ----
create policy "email_deliveries_select_ta_admin" on announcement_email_deliveries
  for select using (
    is_admin()
    or exists (
      select 1 from announcements a
      where a.id = announcement_email_deliveries.announcement_id
        and is_ta_of_section(a.section_id)
    )
  );

-- =========================================================
-- INDEXES (section-based)
-- =========================================================
drop index if exists idx_enrollments_course;
create index if not exists idx_enrollments_section on enrollments(section_id);
create index if not exists idx_assessments_section on assessments(section_id);
create index if not exists idx_periods_section on evaluation_periods(section_id);
create index if not exists idx_marks_student on marks(student_id);
create index if not exists idx_marks_assessment on marks(assessment_id);
create index if not exists idx_enrollments_student on enrollments(student_id);
create index if not exists idx_bookings_slot on bookings(slot_id);
create index if not exists idx_bookings_student on bookings(student_id);
create index if not exists idx_slots_period on evaluation_slots(evaluation_period_id);

-- =========================================================
-- END migration v2
-- =========================================================