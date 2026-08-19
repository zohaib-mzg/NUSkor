-- =========================================================
-- NUSkor — Database Schema + RLS Policies (v2, fresh install)
-- Run this in the Supabase SQL Editor once on a NEW project.
-- Existing v1.x projects: run supabase/migration_v2.sql instead.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Extension needed for gen_random_uuid()
-- ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin', 'ta')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email not like '%@lhr.nu.edu.pk' then
    raise exception 'Only @lhr.nu.edu.pk accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when new.email = 'l242530@lhr.nu.edu.pk' then 'admin' else 'student' end
  );

  -- Auto-register every non-admin user as a student on first sign-in,
  -- so they appear in the admin Students list immediately.
  if new.email <> 'l242530@lhr.nu.edu.pk' then
    insert into public.students (id) values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 2. STUDENTS
-- ---------------------------------------------------------
create table if not exists students (
  id uuid primary key references profiles(id) on delete cascade,
  registration_no text unique,
  program text,
  semester text,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. COURSES
-- ---------------------------------------------------------
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  is_archived boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. COURSE SECTIONS
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

-- ---------------------------------------------------------
-- 5. SECTION TAs (many-to-many: section <-> TA)
-- ---------------------------------------------------------
create table if not exists section_tas (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references course_sections(id) on delete cascade,
  ta_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (section_id, ta_id)
);

-- ---------------------------------------------------------
-- 6. TA APPLICATIONS
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

-- ---------------------------------------------------------
-- 7. ENROLLMENTS (by section)
-- ---------------------------------------------------------
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  section_id uuid not null references course_sections(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, section_id)
);

-- ---------------------------------------------------------
-- 8. ASSESSMENTS (section-based, weightage, release, status)
-- ---------------------------------------------------------
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references course_sections(id) on delete cascade,
  title text not null,
  type text not null check (type in ('quiz', 'assignment', 'midterm', 'project', 'final', 'other')),
  total_marks numeric not null check (total_marks > 0),
  weightage numeric not null default 0 check (weightage >= 0),
  release_date date,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 9. MARKS
-- ---------------------------------------------------------
create table if not exists marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  obtained numeric not null check (obtained >= 0),
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (student_id, assessment_id)
);

-- ---------------------------------------------------------
-- 10. EVALUATION PERIODS (by section)
-- ---------------------------------------------------------
create table if not exists evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references course_sections(id) on delete cascade,
  title text not null,
  starts_on date not null,
  ends_on date not null,
  is_closed boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 11. EVALUATION SLOTS (start/end time)
-- ---------------------------------------------------------
create table if not exists evaluation_slots (
  id uuid primary key default gen_random_uuid(),
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  capacity int not null default 1 check (capacity > 0),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 12. BOOKINGS
-- ---------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  slot_id uuid not null references evaluation_slots(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (student_id, evaluation_period_id)
);

-- Prevent overbooking a slot beyond its capacity via a trigger
create or replace function public.check_slot_capacity()
returns trigger as $$
declare
  current_count int;
  slot_cap int;
begin
  select capacity into slot_cap from evaluation_slots where id = new.slot_id;
  select count(*) into current_count from bookings
    where slot_id = new.slot_id and status = 'confirmed';

  if current_count >= slot_cap then
    raise exception 'This slot is full';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_slot_capacity on bookings;
create trigger trg_check_slot_capacity
  before insert on bookings
  for each row execute procedure public.check_slot_capacity();

-- ---------------------------------------------------------
-- 13. ANNOUNCEMENTS (section-targetable + status)
--     section_id NULL = announcement for everyone
-- ---------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  section_id uuid references course_sections(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid
);

-- ---------------------------------------------------------
-- 14. IN-APP NOTIFICATIONS
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

-- ---------------------------------------------------------
-- 15. ANNOUNCEMENT EMAIL DELIVERIES (idempotent Resend tracking)
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

-- ---------------------------------------------------------
-- 16. STUDENT INVITES (secure enrollment tokens)
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

-- =========================================================
-- ROW LEVEL SECURITY
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

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Current signed-in user's role (security definer: used inside
-- profiles policies without re-entering RLS on profiles).
create or replace function public.my_role()
returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

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

-- ---- PROFILES ----
drop policy if exists "profiles_select_own_admin_or_section_ta" on profiles;
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
drop policy if exists "profiles_update_own_no_role_change" on profiles;
create policy "profiles_update_own_no_role_change" on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = my_role()
  );
drop policy if exists "profiles_admin_full_access" on profiles;
create policy "profiles_admin_full_access" on profiles
  for all using (is_admin()) with check (is_admin());

-- ---- STUDENTS ----
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
drop policy if exists "students_admin_write" on students;
create policy "students_admin_write" on students
  for insert with check (is_admin());
drop policy if exists "students_admin_update" on students;
create policy "students_admin_update" on students
  for update using (is_admin()) with check (is_admin());
drop policy if exists "students_admin_delete" on students;
create policy "students_admin_delete" on students
  for delete using (is_admin());

-- ---- COURSES (read: signed-in; write: admin) ----
drop policy if exists "courses_select_authenticated" on courses;
create policy "courses_select_authenticated" on courses
  for select using (auth.uid() is not null);
drop policy if exists "courses_admin_write" on courses;
create policy "courses_admin_write" on courses
  for insert with check (is_admin());
drop policy if exists "courses_admin_update" on courses;
create policy "courses_admin_update" on courses
  for update using (is_admin()) with check (is_admin());
drop policy if exists "courses_admin_delete" on courses;
create policy "courses_admin_delete" on courses
  for delete using (is_admin());

-- ---- COURSE SECTIONS ----
drop policy if exists "sections_select_member_admin" on course_sections;
create policy "sections_select_member_admin" on course_sections
  for select using (
    is_admin()
    or is_ta_of_section(id)
    or exists (
      select 1 from enrollments e
      where e.section_id = course_sections.id and e.student_id = auth.uid()
    )
  );
drop policy if exists "sections_admin_write" on course_sections;
create policy "sections_admin_write" on course_sections
  for insert with check (is_admin());
drop policy if exists "sections_admin_update" on course_sections;
create policy "sections_admin_update" on course_sections
  for update using (is_admin()) with check (is_admin());
drop policy if exists "sections_admin_delete" on course_sections;
create policy "sections_admin_delete" on course_sections
  for delete using (is_admin());

-- ---- SECTION TAs ----
drop policy if exists "section_tas_select_member_admin" on section_tas;
create policy "section_tas_select_member_admin" on section_tas
  for select using (
    is_admin()
    or ta_id = auth.uid()
    or is_ta_of_section(section_id)
  );
drop policy if exists "section_tas_admin_write" on section_tas;
create policy "section_tas_admin_write" on section_tas
  for insert with check (is_admin());
drop policy if exists "section_tas_admin_update" on section_tas;
create policy "section_tas_admin_update" on section_tas
  for update using (is_admin()) with check (is_admin());
drop policy if exists "section_tas_admin_delete" on section_tas;
create policy "section_tas_admin_delete" on section_tas
  for delete using (is_admin());

-- ---- ENROLLMENTS (students join ONLY via join_section() RPC) ----
drop policy if exists "enrollments_select_own_admin_or_section_ta" on enrollments;
create policy "enrollments_select_own_admin_or_section_ta" on enrollments
  for select using (
    student_id = auth.uid()
    or is_admin()
    or is_ta_of_section(section_id)
  );
drop policy if exists "enrollments_admin_write" on enrollments;
create policy "enrollments_admin_write" on enrollments
  for insert with check (is_admin());
drop policy if exists "enrollments_admin_update" on enrollments;
create policy "enrollments_admin_update" on enrollments
  for update using (is_admin()) with check (is_admin());
drop policy if exists "enrollments_admin_delete" on enrollments;
create policy "enrollments_admin_delete" on enrollments
  for delete using (is_admin());
drop policy if exists "enrollments_ta_write" on enrollments;
create policy "enrollments_ta_write" on enrollments
  for insert with check (is_ta_of_section(section_id));
drop policy if exists "enrollments_ta_delete" on enrollments;
create policy "enrollments_ta_delete" on enrollments
  for delete using (is_ta_of_section(section_id));

-- Enroll a registered student into one of the caller's sections
-- by email. TAs cannot SELECT students outside their sections,
-- so this is a security-definer helper that validates ownership.
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

-- ---- ASSESSMENTS ----
drop policy if exists "assessments_select_section_members" on assessments;
create policy "assessments_select_section_members" on assessments
  for select using (
    is_admin()
    or is_ta_of_section(section_id)
    or exists (
      select 1 from enrollments e
      where e.section_id = assessments.section_id and e.student_id = auth.uid()
    )
  );
drop policy if exists "assessments_admin_or_ta_write" on assessments;
create policy "assessments_admin_or_ta_write" on assessments
  for insert with check (is_admin() or is_ta_of_section(section_id));
drop policy if exists "assessments_admin_or_ta_update" on assessments;
create policy "assessments_admin_or_ta_update" on assessments
  for update using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));
drop policy if exists "assessments_admin_or_ta_delete" on assessments;
create policy "assessments_admin_or_ta_delete" on assessments
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---- MARKS ----
drop policy if exists "marks_select_own_admin_or_ta" on marks;
create policy "marks_select_own_admin_or_ta" on marks
  for select using (
    student_id = auth.uid()
    or is_admin()
    or is_ta_of_student(student_id)
  );
drop policy if exists "marks_admin_or_ta_write" on marks;
create policy "marks_admin_or_ta_write" on marks
  for insert with check (is_admin() or is_ta_of_student(student_id));
drop policy if exists "marks_admin_or_ta_update" on marks;
create policy "marks_admin_or_ta_update" on marks
  for update using (is_admin() or is_ta_of_student(student_id))
  with check (is_admin() or is_ta_of_student(student_id));
drop policy if exists "marks_admin_or_ta_delete" on marks;
create policy "marks_admin_or_ta_delete" on marks
  for delete using (is_admin() or is_ta_of_student(student_id));

-- ---- EVALUATION PERIODS ----
drop policy if exists "periods_select_section_members" on evaluation_periods;
create policy "periods_select_section_members" on evaluation_periods
  for select using (
    is_admin()
    or is_ta_of_section(section_id)
    or exists (
      select 1 from enrollments e
      where e.section_id = evaluation_periods.section_id and e.student_id = auth.uid()
    )
  );
drop policy if exists "periods_admin_or_ta_write" on evaluation_periods;
create policy "periods_admin_or_ta_write" on evaluation_periods
  for insert with check (is_admin() or is_ta_of_section(section_id));
drop policy if exists "periods_admin_or_ta_update" on evaluation_periods;
create policy "periods_admin_or_ta_update" on evaluation_periods
  for update using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));
drop policy if exists "periods_admin_or_ta_delete" on evaluation_periods;
create policy "periods_admin_or_ta_delete" on evaluation_periods
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---- EVALUATION SLOTS ----
drop policy if exists "slots_select_section_members" on evaluation_slots;
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
drop policy if exists "slots_admin_or_ta_write" on evaluation_slots;
create policy "slots_admin_or_ta_write" on evaluation_slots
  for insert with check (
    is_admin()
    or exists (
      select 1 from evaluation_periods ep
      where ep.id = evaluation_slots.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  );
drop policy if exists "slots_admin_or_ta_update" on evaluation_slots;
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
drop policy if exists "slots_admin_or_ta_delete" on evaluation_slots;
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
drop policy if exists "bookings_select_own_admin_or_ta" on bookings;
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
drop policy if exists "bookings_insert_own" on bookings;
create policy "bookings_insert_own" on bookings
  for insert with check (student_id = auth.uid());
drop policy if exists "bookings_update_own_or_admin" on bookings;
create policy "bookings_update_own_or_admin" on bookings
  for update using (student_id = auth.uid() or is_admin())
  with check (student_id = auth.uid() or is_admin());
drop policy if exists "bookings_admin_delete" on bookings;
create policy "bookings_admin_delete" on bookings
  for delete using (is_admin());

-- ---- ANNOUNCEMENTS ----
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
drop policy if exists "announcements_admin_or_ta_write" on announcements;
create policy "announcements_admin_or_ta_write" on announcements
  for insert with check (is_admin() or is_ta_of_section(section_id));
drop policy if exists "announcements_admin_or_ta_update" on announcements;
create policy "announcements_admin_or_ta_update" on announcements
  for update using (is_admin() or is_ta_of_section(section_id))
  with check (is_admin() or is_ta_of_section(section_id));
drop policy if exists "announcements_admin_or_ta_delete" on announcements;
create policy "announcements_admin_or_ta_delete" on announcements
  for delete using (is_admin() or is_ta_of_section(section_id));

-- ---- NOTIFICATIONS (own only; created via security definer RPC) ----
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- TA APPLICATIONS ----
drop policy if exists "ta_applications_select_own_or_admin" on ta_applications;
create policy "ta_applications_select_own_or_admin" on ta_applications
  for select using (user_id = auth.uid() or is_admin());
drop policy if exists "ta_applications_insert_own" on ta_applications;
create policy "ta_applications_insert_own" on ta_applications
  for insert with check (user_id = auth.uid());
drop policy if exists "ta_applications_admin_update" on ta_applications;
create policy "ta_applications_admin_update" on ta_applications
  for update using (is_admin()) with check (is_admin());
drop policy if exists "ta_applications_admin_delete" on ta_applications;
create policy "ta_applications_admin_delete" on ta_applications
  for delete using (is_admin());

-- ---- STUDENT INVITES ----
drop policy if exists "invites_select_owner_admin" on student_invites;
create policy "invites_select_owner_admin" on student_invites
  for select using (created_by_ta = auth.uid() or is_admin());
drop policy if exists "invites_insert_owner_admin" on student_invites;
create policy "invites_insert_owner_admin" on student_invites
  for insert with check (
    is_admin()
    or (created_by_ta = auth.uid() and is_ta_of_section(section_id))
  );
drop policy if exists "invites_update_owner_admin" on student_invites;
create policy "invites_update_owner_admin" on student_invites
  for update using (created_by_ta = auth.uid() or is_admin())
  with check (created_by_ta = auth.uid() or is_admin());
drop policy if exists "invites_delete_owner_admin" on student_invites;
create policy "invites_delete_owner_admin" on student_invites
  for delete using (created_by_ta = auth.uid() or is_admin());

-- ---- ANNOUNCEMENT EMAIL DELIVERIES ----
drop policy if exists "email_deliveries_select_ta_admin" on announcement_email_deliveries;
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
-- HELPER FUNCTIONS / RPC USED BY THE WEB APP
-- (security definer so students get aggregates/leaderboard
--  without ever being able to read other students' marks)
-- =========================================================

-- Enroll the signed-in student via a secure invitation token.
-- Validates expiry/status/usage, enrolls, increments used_count.
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

-- Class stats for ONE assessment: avg / min / max / count
-- (excludes archived students)
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

-- Batch variant: stats for MANY assessments in a single round trip.
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

-- Slots for a period with live confirmed-booking counts
create or replace function public.get_slots_with_counts(p_period_id uuid)
returns table (slot_id uuid, slot_date date, start_time time, end_time time, capacity int, is_open boolean, booked bigint)
language sql security definer stable
as $$
  select
    s.id,
    s.slot_date,
    s.start_time,
    s.end_time,
    s.capacity,
    s.is_open,
    (select count(*) from bookings b
      where b.slot_id = s.id and b.status = 'confirmed') as booked
  from evaluation_slots s
  where s.evaluation_period_id = p_period_id
  order by s.slot_date, s.start_time;
$$;

-- Privacy-conscious leaderboard: registration numbers ONLY, never names.
-- Students can match their own row via their registration number.
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

-- =========================================================
-- USEFUL INDEXES
-- =========================================================
create index if not exists idx_enrollments_section on enrollments(section_id);
create index if not exists idx_assessments_section on assessments(section_id);
create index if not exists idx_periods_section on evaluation_periods(section_id);
create index if not exists idx_marks_student on marks(student_id);
create index if not exists idx_marks_assessment on marks(assessment_id);
create index if not exists idx_enrollments_student on enrollments(student_id);
create index if not exists idx_bookings_slot on bookings(slot_id);
create index if not exists idx_bookings_student on bookings(student_id);
create index if not exists idx_slots_period on evaluation_slots(evaluation_period_id);
create index if not exists idx_ta_applications_status on ta_applications(status);
create index if not exists idx_ta_applications_user on ta_applications(user_id);
create index if not exists idx_notifications_user on notifications(user_id, is_read);
create index if not exists idx_email_deliveries_announcement
  on announcement_email_deliveries(announcement_id);
create index if not exists idx_student_invites_section on student_invites(section_id);
create index if not exists idx_announcements_deleted on announcements(deleted_at);
create index if not exists idx_students_archived on students(archived_at);

-- Exact-duplicate slot guard (auto-generation safety)
create unique index if not exists idx_slots_unique
  on evaluation_slots(evaluation_period_id, slot_date, start_time, end_time);

-- Auto-generate slots for a period: for each date, walk start_time ->
-- end_time in p_duration_minutes steps, creating one slot per step.
-- Validates the caller is the section's TA or an admin, and that every
-- date falls inside the period's date range.
create or replace function public.generate_slots(
  p_period_id uuid,
  p_dates date[],
  p_start_time time,
  p_end_time time,
  p_duration_minutes int,
  p_capacity int
) returns int
language plpgsql security definer as $$
declare
  v_section uuid;
  v_created int := 0;
  v_cur time;
  v_date date;
begin
  select section_id into v_section from evaluation_periods where id = p_period_id;
  if v_section is null then
    raise exception 'Evaluation period not found';
  end if;
  if not (is_admin() or is_ta_of_section(v_section)) then
    raise exception 'You do not have access to this section';
  end if;
  if p_duration_minutes <= 0 or p_end_time <= p_start_time then
    raise exception 'Invalid time range or duration';
  end if;

  foreach v_date in array p_dates loop
    if v_date < (select starts_on from evaluation_periods where id = p_period_id)
       or v_date > (select ends_on from evaluation_periods where id = p_period_id) then
      raise exception 'Slot date % is outside the period date range', v_date;
    end if;
    v_cur := p_start_time;
    while v_cur < p_end_time loop
      insert into evaluation_slots
        (evaluation_period_id, slot_date, start_time, end_time, capacity)
      values (p_period_id, v_date, v_cur,
              least(v_cur + make_interval(mins => p_duration_minutes), p_end_time),
              p_capacity)
      on conflict (evaluation_period_id, slot_date, start_time, end_time) do nothing;
      v_created := v_created + 1;
      v_cur := v_cur + make_interval(mins => p_duration_minutes);
    end loop;
  end loop;

  return v_created;
end;
$$;

-- Create "pending" email delivery rows for an announcement's targets
-- (NULL section = every student). Returns newly created rows.
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

-- Mark one delivery row sent/failed (caller must be the section's TA/admin).
create or replace function public.mark_email_delivery(
  p_delivery_id uuid,
  p_status text,
  p_message_id text default null,
  p_error text default null
) returns void
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
begin
  select a.* into v_ann
  from announcements a
  join announcement_email_deliveries d on d.announcement_id = a.id
  where d.id = p_delivery_id;
  if v_ann.id is null then
    raise exception 'Delivery not found';
  end if;
  if not (is_admin() or is_ta_of_section(v_ann.section_id)) then
    raise exception 'You do not have access to this announcement';
  end if;

  update announcement_email_deliveries
  set status = p_status,
      resend_message_id = coalesce(p_message_id, resend_message_id),
      error_message = p_error,
      sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_delivery_id;
end;
$$;

-- ---------------------------------------------------------
-- Backfill: register existing non-admin users as students
-- (for anyone who signed in before auto-registration existed).
-- ---------------------------------------------------------
insert into students (id)
select id from profiles
where role = 'student'
on conflict do nothing;

-- =========================================================
-- END v2
-- =========================================================