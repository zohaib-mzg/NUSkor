-- =========================================================
-- NUSkor — Database Schema + RLS Policies (DRAFT v1)
-- Review before running. Run in Supabase SQL Editor once approved.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Extension needed for gen_random_uuid()
-- ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. PROFILES
-- One row per authenticated user (student or admin).
-- Created automatically via trigger when someone signs in via Google.
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
-- Domain check happens here too, as a second layer of defense.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 2. STUDENTS (extra academic info beyond the base profile)
-- ---------------------------------------------------------
create table students (
  id uuid primary key references profiles(id) on delete cascade,
  registration_no text unique,
  program text,             -- e.g. BSCS
  semester text,             -- e.g. 5th
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. COURSES
-- ---------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,      -- e.g. CS301
  title text not null,
  is_archived boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. ENROLLMENTS (which students are in which course)
-- ---------------------------------------------------------
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ---------------------------------------------------------
-- 5. ASSESSMENTS (quiz, assignment, midterm, project ...)
-- ---------------------------------------------------------
create table assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,             -- e.g. "Quiz 1"
  type text not null check (type in ('quiz', 'assignment', 'midterm', 'project', 'other')),
  total_marks numeric not null check (total_marks > 0),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. MARKS
-- ---------------------------------------------------------
create table marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  obtained numeric not null check (obtained >= 0),
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (student_id, assessment_id)
);

-- ---------------------------------------------------------
-- 7. EVALUATION PERIODS
-- ---------------------------------------------------------
create table evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,             -- e.g. "Assignment 1 Evaluation"
  starts_on date not null,
  ends_on date not null,
  is_closed boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 8. EVALUATION SLOTS
-- ---------------------------------------------------------
create table evaluation_slots (
  id uuid primary key default gen_random_uuid(),
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  slot_date date not null,
  slot_time time not null,
  capacity int not null default 1 check (capacity > 0),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 9. BOOKINGS
-- One booking per student per evaluation period — enforced below.
-- ---------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  evaluation_period_id uuid not null references evaluation_periods(id) on delete cascade,
  slot_id uuid not null references evaluation_slots(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'cancelled')),
  created_at timestamptz not null default now(),
  -- Hard DB-level guarantee: one active booking per student per evaluation period
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

create trigger trg_check_slot_capacity
  before insert on bookings
  for each row execute procedure public.check_slot_capacity();

-- ---------------------------------------------------------
-- 10. ANNOUNCEMENTS
-- ---------------------------------------------------------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_published boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table profiles enable row level security;
alter table students enable row level security;
alter table courses enable row level security;
alter table enrollments enable row level security;
alter table assessments enable row level security;
alter table marks enable row level security;
alter table evaluation_periods enable row level security;
alter table evaluation_slots enable row level security;
alter table bookings enable row level security;
alter table announcements enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ---- PROFILES ----
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles_update_own_name_only" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_full_access" on profiles
  for all using (is_admin()) with check (is_admin());

-- ---- STUDENTS ----
create policy "students_select_own_or_admin" on students
  for select using (id = auth.uid() or is_admin());
create policy "students_admin_write" on students
  for insert with check (is_admin());
create policy "students_admin_update" on students
  for update using (is_admin()) with check (is_admin());
create policy "students_admin_delete" on students
  for delete using (is_admin());

-- ---- COURSES (read: everyone signed in; write: admin only) ----
create policy "courses_select_authenticated" on courses
  for select using (auth.uid() is not null);
create policy "courses_admin_write" on courses
  for insert with check (is_admin());
create policy "courses_admin_update" on courses
  for update using (is_admin()) with check (is_admin());
create policy "courses_admin_delete" on courses
  for delete using (is_admin());

-- ---- ENROLLMENTS ----
create policy "enrollments_select_own_or_admin" on enrollments
  for select using (student_id = auth.uid() or is_admin());
create policy "enrollments_admin_write" on enrollments
  for insert with check (is_admin());
create policy "enrollments_admin_update" on enrollments
  for update using (is_admin()) with check (is_admin());
create policy "enrollments_admin_delete" on enrollments
  for delete using (is_admin());

-- ---- ASSESSMENTS (read: everyone signed in; write: admin only) ----
create policy "assessments_select_authenticated" on assessments
  for select using (auth.uid() is not null);
create policy "assessments_admin_write" on assessments
  for insert with check (is_admin());
create policy "assessments_admin_update" on assessments
  for update using (is_admin()) with check (is_admin());
create policy "assessments_admin_delete" on assessments
  for delete using (is_admin());

-- ---- MARKS (student sees only own; admin sees/edits all) ----
create policy "marks_select_own_or_admin" on marks
  for select using (student_id = auth.uid() or is_admin());
create policy "marks_admin_write" on marks
  for insert with check (is_admin());
create policy "marks_admin_update" on marks
  for update using (is_admin()) with check (is_admin());
create policy "marks_admin_delete" on marks
  for delete using (is_admin());

-- ---- EVALUATION PERIODS (read: everyone signed in; write: admin only) ----
create policy "eval_periods_select_authenticated" on evaluation_periods
  for select using (auth.uid() is not null);
create policy "eval_periods_admin_write" on evaluation_periods
  for insert with check (is_admin());
create policy "eval_periods_admin_update" on evaluation_periods
  for update using (is_admin()) with check (is_admin());
create policy "eval_periods_admin_delete" on evaluation_periods
  for delete using (is_admin());

-- ---- EVALUATION SLOTS (read: everyone signed in; write: admin only) ----
create policy "eval_slots_select_authenticated" on evaluation_slots
  for select using (auth.uid() is not null);
create policy "eval_slots_admin_write" on evaluation_slots
  for insert with check (is_admin());
create policy "eval_slots_admin_update" on evaluation_slots
  for update using (is_admin()) with check (is_admin());
create policy "eval_slots_admin_delete" on evaluation_slots
  for delete using (is_admin());

-- ---- BOOKINGS ----
-- Students can see their own bookings; admin sees all.
create policy "bookings_select_own_or_admin" on bookings
  for select using (student_id = auth.uid() or is_admin());
-- Students can create their own booking (one per evaluation period, enforced by unique constraint + trigger).
create policy "bookings_insert_own" on bookings
  for insert with check (student_id = auth.uid());
-- Students can cancel (update status on) only their own booking; admin can update any.
create policy "bookings_update_own_or_admin" on bookings
  for update using (student_id = auth.uid() or is_admin())
  with check (student_id = auth.uid() or is_admin());
create policy "bookings_admin_delete" on bookings
  for delete using (is_admin());

-- ---- ANNOUNCEMENTS (read: everyone signed in, published only; write: admin only) ----
create policy "announcements_select_published" on announcements
  for select using (is_published = true or is_admin());
create policy "announcements_admin_write" on announcements
  for insert with check (is_admin());
create policy "announcements_admin_update" on announcements
  for update using (is_admin()) with check (is_admin());
create policy "announcements_admin_delete" on announcements
  for delete using (is_admin());

-- =========================================================
-- END OF DRAFT v1 — review before running
-- =========================================================

-- Register existing non-admin users as students (backfill for
-- anyone who signed in before auto-registration existed).
insert into students (id)
select id from profiles
where role = 'student'
on conflict do nothing;
