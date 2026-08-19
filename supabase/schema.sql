-- =========================================================
-- NUSkor â€” Database Schema + RLS Policies (v1.1, runnable)
-- Run this in the Supabase SQL Editor once.
-- Based on NUSkor_schema_v1.sql (kept faithful) + the RPC
-- functions the web app depends on.
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
  role text not null default 'student' check (role in ('student', 'admin')),
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
-- 4. ENROLLMENTS
-- ---------------------------------------------------------
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ---------------------------------------------------------
-- 5. ASSESSMENTS
-- ---------------------------------------------------------
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  type text not null check (type in ('quiz', 'assignment', 'midterm', 'project', 'other')),
  total_marks numeric not null check (total_marks > 0),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. MARKS
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
-- 7. EVALUATION PERIODS
-- ---------------------------------------------------------
create table if not exists evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  starts_on date not null,
  ends_on date not null,
  is_closed boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 8. EVALUATION SLOTS
-- ---------------------------------------------------------
create table if not exists evaluation_slots (
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
-- 10. ANNOUNCEMENTS
-- ---------------------------------------------------------
create table if not exists announcements (
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

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ARE THERE RLS POLICIES?
-- The policies below are created with drop-if-exists so re-running is safe.

-- ---- PROFILES ----
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
drop policy if exists "profiles_update_own_name_only" on profiles;
create policy "profiles_update_own_name_only" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_admin_full_access" on profiles;
create policy "profiles_admin_full_access" on profiles
  for all using (is_admin()) with check (is_admin());

-- ---- STUDENTS ----
drop policy if exists "students_select_own_or_admin" on students;
create policy "students_select_own_or_admin" on students
  for select using (id = auth.uid() or is_admin());
drop policy if exists "students_admin_write" on students;
create policy "students_admin_write" on students
  for insert with check (is_admin());
drop policy if exists "students_admin_update" on students;
create policy "students_admin_update" on students
  for update using (is_admin()) with check (is_admin());
drop policy if exists "students_admin_delete" on students;
create policy "students_admin_delete" on students
  for delete using (is_admin());

-- ---- COURSES ----
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

-- ---- ENROLLMENTS ----
drop policy if exists "enrollments_select_own_or_admin" on enrollments;
create policy "enrollments_select_own_or_admin" on enrollments
  for select using (student_id = auth.uid() or is_admin());
drop policy if exists "enrollments_admin_write" on enrollments;
create policy "enrollments_admin_write" on enrollments
  for insert with check (is_admin());
drop policy if exists "enrollments_admin_update" on enrollments;
create policy "enrollments_admin_update" on enrollments
  for update using (is_admin()) with check (is_admin());
drop policy if exists "enrollments_admin_delete" on enrollments;
create policy "enrollments_admin_delete" on enrollments
  for delete using (is_admin());

-- ---- ASSESSMENTS ----
drop policy if exists "assessments_select_authenticated" on assessments;
create policy "assessments_select_authenticated" on assessments
  for select using (auth.uid() is not null);
drop policy if exists "assessments_admin_write" on assessments;
create policy "assessments_admin_write" on assessments
  for insert with check (is_admin());
drop policy if exists "assessments_admin_update" on assessments;
create policy "assessments_admin_update" on assessments
  for update using (is_admin()) with check (is_admin());
drop policy if exists "assessments_admin_delete" on assessments;
create policy "assessments_admin_delete" on assessments
  for delete using (is_admin());

-- ---- MARKS (student sees only own; admin sees/edits all) ----
drop policy if exists "marks_select_own_or_admin" on marks;
create policy "marks_select_own_or_admin" on marks
  for select using (student_id = auth.uid() or is_admin());
drop policy if exists "marks_admin_write" on marks;
create policy "marks_admin_write" on marks
  for insert with check (is_admin());
drop policy if exists "marks_admin_update" on marks;
create policy "marks_admin_update" on marks
  for update using (is_admin()) with check (is_admin());
drop policy if exists "marks_admin_delete" on marks;
create policy "marks_admin_delete" on marks
  for delete using (is_admin());

-- ---- EVALUATION PERIODS ----
drop policy if exists "eval_periods_select_authenticated" on evaluation_periods;
create policy "eval_periods_select_authenticated" on evaluation_periods
  for select using (auth.uid() is not null);
drop policy if exists "eval_periods_admin_write" on evaluation_periods;
create policy "eval_periods_admin_write" on evaluation_periods
  for insert with check (is_admin());
drop policy if exists "eval_periods_admin_update" on evaluation_periods;
create policy "eval_periods_admin_update" on evaluation_periods
  for update using (is_admin()) with check (is_admin());
drop policy if exists "eval_periods_admin_delete" on evaluation_periods;
create policy "eval_periods_admin_delete" on evaluation_periods
  for delete using (is_admin());

-- ---- EVALUATION SLOTS ----
drop policy if exists "eval_slots_select_authenticated" on evaluation_slots;
create policy "eval_slots_select_authenticated" on evaluation_slots
  for select using (auth.uid() is not null);
drop policy if exists "eval_slots_admin_write" on evaluation_slots;
create policy "eval_slots_admin_write" on evaluation_slots
  for insert with check (is_admin());
drop policy if exists "eval_slots_admin_update" on evaluation_slots;
create policy "eval_slots_admin_update" on evaluation_slots
  for update using (is_admin()) with check (is_admin());
drop policy if exists "eval_slots_admin_delete" on evaluation_slots;
create policy "eval_slots_admin_delete" on evaluation_slots
  for delete using (is_admin());

-- ---- BOOKINGS ----
drop policy if exists "bookings_select_own_or_admin" on bookings;
create policy "bookings_select_own_or_admin" on bookings
  for select using (student_id = auth.uid() or is_admin());
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
drop policy if exists "announcements_select_published" on announcements;
create policy "announcements_select_published" on announcements
  for select using (is_published = true or is_admin());
drop policy if exists "announcements_admin_write" on announcements;
create policy "announcements_admin_write" on announcements
  for insert with check (is_admin());
drop policy if exists "announcements_admin_update" on announcements;
create policy "announcements_admin_update" on announcements
  for update using (is_admin()) with check (is_admin());
drop policy if exists "announcements_admin_delete" on announcements;
create policy "announcements_admin_delete" on announcements
  for delete using (is_admin());

-- =========================================================
-- RPC FUNCTIONS USED BY THE WEB APP
-- (security definer so students get aggregates/leaderboard
--  without ever being able to read other students' marks)
-- =========================================================

-- Class stats for ONE assessment: avg / min / max / count
create or replace function public.get_assessment_stats(p_assessment_id uuid)
returns table (avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
language sql security definer stable
as $$
  select
    round(avg(obtained)::numeric, 2),
    min(obtained),
    max(obtained),
    count(*)
  from marks
  where assessment_id = p_assessment_id;
$$;

-- Batch variant: stats for MANY assessments in a single round trip.
-- (Marks page previously fired one RPC per assessment, which was slow.)
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
  where m.assessment_id = any(p_assessment_ids)
  group by m.assessment_id;
$$;

-- Slots for a period with live confirmed-booking counts
create or replace function public.get_slots_with_counts(p_period_id uuid)
returns table (slot_id uuid, slot_date date, slot_time time, capacity int, is_open boolean, booked bigint)
language sql security definer stable
as $$
  select
    s.id,
    s.slot_date,
    s.slot_time,
    s.capacity,
    s.is_open,
    (select count(*) from bookings b
      where b.slot_id = s.id and b.status = 'confirmed') as booked
  from evaluation_slots s
  where s.evaluation_period_id = p_period_id
  order by s.slot_date, s.slot_time;
$$;

-- Privacy-conscious leaderboard: registration numbers ONLY, never names.
-- Students can match their own row via their registration number.
create or replace function public.get_leaderboard(p_course_id uuid)
returns table (registration_no text, total numeric, percent numeric, rank bigint)
language sql security definer stable
as $$
  with scores as (
    select
      m.student_id,
      coalesce(sum(m.obtained), 0) as total,
      sum(a.total_marks) as possible
    from marks m
    join assessments a on a.id = m.assessment_id
    where a.course_id = p_course_id
    group by m.student_id
  ),
  ranked as (
    select
      st.registration_no,
      s.total,
      case
        when s.possible > 0 then round((s.total / s.possible * 100)::numeric, 2)
        else 0
      end as percent,
      rank() over (order by s.total desc) as rank
    from scores s
    join students st on st.id = s.student_id
  )
  select registration_no, total, percent, rank
  from ranked
  order by rank;
$$;

-- =========================================================
-- USEFUL INDEXES
-- =========================================================
create index if not exists idx_marks_student on marks(student_id);
create index if not exists idx_marks_assessment on marks(assessment_id);
create index if not exists idx_enrollments_student on enrollments(student_id);
create index if not exists idx_enrollments_course on enrollments(course_id);
create index if not exists idx_assessments_course on assessments(course_id);
create index if not exists idx_bookings_slot on bookings(slot_id);
create index if not exists idx_bookings_student on bookings(student_id);
create index if not exists idx_slots_period on evaluation_slots(evaluation_period_id);

-- =========================================================
-- END v1.1
-- =========================================================