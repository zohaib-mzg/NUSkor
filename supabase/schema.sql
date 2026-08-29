-- =========================================================
-- NUSkor — Database Schema + RLS Policies (v2, fresh install)
-- Run this in the Supabase SQL Editor once on a NEW project.
-- Existing v1.x projects: run supabase/migration_v2.sql instead.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Drop any stale public functions first: older schema
--    versions changed OUT/returns-table signatures, and
--    "create or replace" cannot alter those. Dropping all
--    public functions here makes re-runs self-healing.
-- ---------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;
end $$;

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

drop function if exists public.handle_new_user();
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

  -- NOTE: no student row is auto-created here. Students are registered
  -- ONLY through a TA invitation via join_section(). The dashboard gates
  -- student accounts without a students row to the invitation flow.

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
  created_by uuid references profiles(id) on delete set null,
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
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, section_code)
);

-- ---------------------------------------------------------
-- 5. SECTION TAs (one TA per section)
-- ---------------------------------------------------------
create table if not exists section_tas (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references course_sections(id) on delete cascade,
  ta_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (section_id)
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
  reviewed_by uuid references profiles(id) on delete set null,
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
  invited_by uuid references profiles(id) on delete set null,
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
  created_by uuid references profiles(id) on delete set null,
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
  updated_by uuid references profiles(id) on delete set null,
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
  created_by uuid references profiles(id) on delete set null,
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
drop function if exists public.check_slot_capacity();
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
  created_by uuid references profiles(id) on delete set null,
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
  type text not null default 'announcement'
    check (type in (
      'announcement',
      'marks_released',
      'evaluation_created',
      'booking_confirmed',
      'booking_cancelled',
      'important_update'
    )),
  related_id uuid,
  announcement_id uuid references announcements(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, type, related_id)
);

-- ---------------------------------------------------------
-- 15. WEB PUSH SUBSCRIPTIONS (one per device; a user may
--     have many, e.g. laptop + phone browsers)
-- ---------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 15b. USER NOTIFICATION SETTINGS (push category toggles)
-- ---------------------------------------------------------
create table if not exists user_notification_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  announcements boolean not null default true,
  marks_released boolean not null default true,
  evaluation_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 16. STUDENT INVITES (secure enrollment tokens)
-- ---------------------------------------------------------
create table if not exists student_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  section_id uuid not null references course_sections(id) on delete cascade,
  created_by_ta uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  accepted_at timestamptz,
  accepted_by uuid references profiles(id),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'accepted', 'revoked'))
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
alter table push_subscriptions enable row level security;
alter table user_notification_settings enable row level security;
alter table ta_applications enable row level security;
alter table student_invites enable row level security;

drop function if exists public.is_admin();
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Current signed-in user's role (security definer: used inside
-- profiles policies without re-entering RLS on profiles).
drop function if exists public.my_role();
create or replace function public.my_role()
returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

drop function if exists public.is_ta_of_section(uuid);
create or replace function public.is_ta_of_section(p_section_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from section_tas st
    where st.section_id = p_section_id and st.ta_id = auth.uid()
  );
$$;

-- Semester-aware overload. IMPORTANT: no DEFAULT on p_semester —
-- a default here makes every 1-arg call ambiguous (PG error 42725
-- "function is not unique"), which silently breaks notifications
-- and every RLS policy that checks TA access.
drop function if exists public.is_ta_of_section(uuid, text);
create or replace function public.is_ta_of_section(p_section_id uuid, p_semester text)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from section_tas st
    where st.section_id = p_section_id
      and st.ta_id = auth.uid()
      and (p_semester is null or st.semester = p_semester)
  );
$$;

drop function if exists public.is_ta_of_student(uuid);
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
drop function if exists public.enroll_student_by_email(uuid, text);
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
-- Students can only see marks for published assessments.
-- TAs and Admins see all marks (is_admin / is_ta_of_student).
drop policy if exists "marks_select_own_admin_or_ta" on marks;
create policy "marks_select_own_admin_or_ta" on marks
  for select using (
    is_admin()
    or is_ta_of_student(student_id)
    or (
      student_id = auth.uid()
      and exists (
        select 1 from assessments a
        where a.id = marks.assessment_id
          and a.status = 'published'
      )
    )
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

-- ---- PUSH SUBSCRIPTIONS (own only; the Edge Function uses
--      the service role to read recipients' subscriptions) ----
drop policy if exists "push_subs_select_own" on push_subscriptions;
create policy "push_subs_select_own" on push_subscriptions
  for select using (user_id = auth.uid());
drop policy if exists "push_subs_insert_own" on push_subscriptions;
create policy "push_subs_insert_own" on push_subscriptions
  for insert with check (user_id = auth.uid());
drop policy if exists "push_subs_update_own" on push_subscriptions;
create policy "push_subs_update_own" on push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_subs_delete_own" on push_subscriptions;
create policy "push_subs_delete_own" on push_subscriptions
  for delete using (user_id = auth.uid());

-- ---- USER NOTIFICATION SETTINGS (own only) ----
drop policy if exists "notif_settings_select_own" on user_notification_settings;
create policy "notif_settings_select_own" on user_notification_settings
  for select using (user_id = auth.uid());
drop policy if exists "notif_settings_insert_own" on user_notification_settings;
create policy "notif_settings_insert_own" on user_notification_settings
  for insert with check (user_id = auth.uid());
drop policy if exists "notif_settings_update_own" on user_notification_settings;
create policy "notif_settings_update_own" on user_notification_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- HELPER FUNCTIONS / RPC USED BY THE WEB APP
-- (security definer so students get aggregates/leaderboard
--  without ever being able to read other students' marks)
-- =========================================================

-- Enroll the signed-in user via a secure invitation token.
-- Creates a student row on first join (invitation-only registration),
-- validates expiry/status/usage and that the invitation belongs to the
-- section's CURRENT single TA. Returns jsonb:
--   { "section_id": uuid, "already_enrolled": bool }
drop function if exists public.join_section(text, text, text);
drop function if exists public.join_section(text);
create or replace function public.join_section(
  p_token text,
  p_program text default null,
  p_semester text default null
)
returns jsonb
language plpgsql security definer as $$
declare
  v_invite student_invites%rowtype;
  v_ta_id uuid;
  v_inserted int;
  v_already boolean := false;
begin
  select * into v_invite from student_invites where token = p_token;
  if v_invite is null then
    raise exception 'Invalid invitation link';
  elsif v_invite.status = 'revoked' then
    raise exception 'This invitation is no longer valid';
  elsif v_invite.status <> 'active' then
    raise exception 'This invitation is no longer active';
  elsif v_invite.expires_at < now() then
    raise exception 'This invitation has expired';
  elsif v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    raise exception 'This invitation has reached its usage limit';
  end if;

  -- Security: the invitation must belong to the section's current TA.
  select st.ta_id into v_ta_id
  from section_tas st
  where st.section_id = v_invite.section_id
  limit 1;
  if v_ta_id is null then
    raise exception 'This section no longer has an assigned TA';
  elsif v_ta_id <> v_invite.created_by_ta then
    raise exception 'This invitation is no longer valid';
  end if;

  -- Only student accounts may join. First-time students are created here.
  -- Program/semester (and registration_no via trigger) are captured once,
  -- on account creation.
  if not exists (select 1 from students where id = auth.uid()) then
    if public.my_role() in ('ta', 'admin') then
      raise exception 'Only student accounts can join a section';
    end if;
    insert into students (id, program, semester)
    values (
      auth.uid(),
      nullif(btrim(coalesce(p_program, '')), ''),
      nullif(btrim(coalesce(p_semester, '')), '')
    );
  end if;

  insert into enrollments (student_id, section_id, invited_by)
  values (auth.uid(), v_invite.section_id, v_invite.created_by_ta)
  on conflict (student_id, section_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update student_invites
    set used_count = used_count + 1,
        status = case
          when v_invite.max_uses is not null
               and v_invite.used_count + 1 >= v_invite.max_uses
          then 'accepted'
          else status
        end,
        accepted_at = case
          when v_invite.max_uses is not null
               and v_invite.used_count + 1 >= v_invite.max_uses
          then now()
          else accepted_at
        end,
        accepted_by = case
          when v_invite.max_uses is not null
               and v_invite.used_count + 1 >= v_invite.max_uses
          then auth.uid()
          else accepted_by
        end
    where id = v_invite.id;
  else
    v_already := true;
  end if;

  return jsonb_build_object(
    'section_id', v_invite.section_id,
    'already_enrolled', v_already
  );
end;
$$;

-- Public preview of an invitation (safe, minimal data) so the landing page
-- can show course/section/TA info BEFORE sign-in. Security definer: anon
-- callers never touch the invites table directly via RLS.
drop function if exists public.get_invite_details(text);
create or replace function public.get_invite_details(p_token text)
returns jsonb
language plpgsql security definer stable as $$
declare
  v_invite student_invites%rowtype;
  v_result jsonb;
begin
  select * into v_invite from student_invites where token = p_token;
  if v_invite is null or v_invite.status = 'revoked' then
    raise exception 'This invitation is no longer valid';
  elsif v_invite.expires_at < now() then
    raise exception 'This invitation has expired';
  elsif v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    raise exception 'This invitation has reached its usage limit';
  elsif v_invite.status <> 'active' then
    raise exception 'This invitation is no longer active';
  end if;

  select jsonb_build_object(
    'section_id', s.id,
    'section_code', s.section_code,
    'course_code', c.code,
    'course_title', c.title,
    'ta_name', p.full_name,
    'created_at', v_invite.created_at
  )
  into v_result
  from course_sections s
  join courses c on c.id = s.course_id
  join profiles p on p.id = v_invite.created_by_ta
  where s.id = v_invite.section_id;

  if v_result is null then
    raise exception 'This invitation is no longer valid';
  end if;

  return v_result;
end;
$$;

grant execute on function public.join_section(text, text, text) to authenticated;
grant execute on function public.get_invite_details(text) to anon, authenticated;

-- =========================================================
-- TA SECTION CREATION (server-side validated)
-- =========================================================
create or replace function public.create_ta_section(
  p_course_code text,
  p_course_name text,
  p_section_code text,
  p_semester text,
  p_year text
)
returns uuid
language plpgsql security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_section_id uuid;
  v_full_semester text;
begin
  if not exists (select 1 from profiles where id = v_uid and role = 'ta') then
    raise exception 'Only TAs can create sections';
  end if;

  -- Validate all inputs server-side (never trust the client).
  p_course_code := upper(btrim(coalesce(p_course_code, '')));
  p_course_name := btrim(coalesce(p_course_name, ''));
  p_section_code := btrim(coalesce(p_section_code, ''));
  p_semester := btrim(coalesce(p_semester, ''));

  if p_course_code !~ '^[A-Z0-9]{2,10}$' then
    raise exception 'Course code must be 2-10 letters/digits (e.g. EE2003)';
  end if;
  if length(p_course_name) < 2 then
    raise exception 'Course name is required';
  end if;
  if p_section_code = '' or length(p_section_code) > 16 then
    raise exception 'Section code is required (max 16 chars)';
  end if;
  if p_semester not in ('Spring', 'Summer', 'Fall') then
    raise exception 'Semester must be Spring, Summer or Fall';
  end if;
  begin
    if coalesce(p_year, '')::int not between 2020 and 2100 then
      raise exception 'Invalid year';
    end if;
  exception when invalid_text_representation then
    raise exception 'Invalid year';
  end;

  v_full_semester := p_semester || ' ' || p_year;

  select id into v_course_id from courses where code = p_course_code;
  if v_course_id is null then
    insert into courses (code, title, created_by)
    values (p_course_code, p_course_name, v_uid)
    returning id into v_course_id;
  end if;

  insert into course_sections (course_id, section_code, semester, academic_year, status, created_by)
  values (v_course_id, p_section_code, v_full_semester, p_year, 'active', v_uid)
  returning id into v_section_id;

  insert into section_tas (ta_id, section_id, semester)
  values (v_uid, v_section_id, v_full_semester);

  return v_section_id;
end;
$$;

grant execute on function public.create_ta_section(text,text,text,text,text) to authenticated;

-- =========================================================
-- REVOKE TA (cascades TA-created content)
--
-- Removes the TA's assignments AND hard-deletes sections they
-- created (cascading to assessments, marks, enrollments, invites,
-- evaluation periods, bookings and section announcements), plus any
-- global announcements they authored. Sections created by others
-- survive — the TA is only unassigned from those.
-- =========================================================
create or replace function public.revoke_ta(p_ta_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can revoke TA role';
  end if;

  -- Audit-trail attribution no longer needed (FKs also SET NULL on
  -- profile deletion; explicit here because the profile SURVIVES as a
  -- demoted student).
  update enrollments set invited_by = null where invited_by = p_ta_id;
  update student_invites set accepted_by = null where accepted_by = p_ta_id;
  update assessments set created_by = null where created_by = p_ta_id;

  -- Content owned by the TA goes away.
  delete from announcements where created_by = p_ta_id;
  -- Cascades to: section_tas, enrollments, student_invites,
  -- assessments -> marks, evaluation_periods -> slots -> bookings,
  -- announcements (via section_id).
  delete from course_sections where created_by = p_ta_id;

  -- Anything still referencing them as TA (sections they didn't create).
  delete from section_tas where ta_id = p_ta_id;
  delete from student_invites where created_by_ta = p_ta_id;
  delete from ta_applications where user_id = p_ta_id;

  update profiles set role = 'student' where id = p_ta_id;
end;
$$;

grant execute on function public.revoke_ta(uuid) to authenticated;

-- =========================================================
-- DELETE ACCOUNT (removes everything safely)
-- =========================================================
create or replace function public.delete_account()
returns void
language plpgsql security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Owned teaching content disappears entirely.
  delete from course_sections where created_by = uid;
  delete from announcements where created_by = uid;

  -- Student-side data.
  delete from marks where student_id = uid;
  delete from enrollments where student_id = uid;
  delete from bookings where student_id = uid;
  delete from user_notification_settings where user_id = uid;
  delete from notifications where user_id = uid;
  delete from push_subscriptions where user_id = uid;
  delete from section_tas where ta_id = uid;
  delete from student_invites where created_by_ta = uid;
  delete from ta_applications where user_id = uid;

  -- Catalog rows they created survive without attribution
  -- (courses.created_by etc. are ON DELETE SET NULL).
  delete from profiles where id = uid;

  -- Remove the auth entry LAST: cascades sessions, refresh tokens
  -- and identities, instantly invalidating every signed-in device.
  -- Re-signup goes through handle_new_user as a brand-new user.
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- =========================================================
-- PROFILE DELETION CLEANUP
--
-- Keeps dashboard/auth-admin deletions consistent with the app:
-- a deleted TA takes their sections and announcements with them.
-- =========================================================
create or replace function public.handle_profile_delete()
returns trigger
language plpgsql security definer
as $$
begin
  if old.role = 'ta' then
    delete from announcements where created_by = old.id;
    -- Cascades to assessments -> marks, enrollments, invites,
    -- evaluation periods -> slots -> bookings, section_tas,
    -- section announcements.
    delete from course_sections where created_by = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_profiles_delete_cleanup on public.profiles;
create trigger trg_profiles_delete_cleanup
  before delete on public.profiles
  for each row execute function public.handle_profile_delete();

-- =========================================================
-- TA COURSE DELETION
--
-- Lets an assigned TA (or an admin) delete a course section and
-- every piece of data belonging to it in ONE atomic operation.
-- Student/TA accounts are NEVER deleted — only rows referencing
-- the section. The course shell is removed once its last section
-- is gone; shared courses taught by another TA stay untouched.
-- =========================================================
create or replace function public.delete_ta_section(p_section_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_assessment_ids uuid[] := '{}';
  v_period_ids uuid[] := '{}';
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Permission: only a TA assigned to this section, or an admin.
  -- Students can never reach past this guard.
  if not exists (
    select 1 from section_tas st
    where st.section_id = p_section_id and st.ta_id = v_uid
  )
  and not exists (
    select 1 from profiles where id = v_uid and role = 'admin'
  ) then
    raise exception 'You are not authorized to delete this course';
  end if;

  select cs.course_id into v_course_id
  from course_sections cs
  where cs.id = p_section_id;
  if v_course_id is null then
    raise exception 'Section not found';
  end if;

  -- Capture child ids BEFORE deletion: notifications.related_id has
  -- no foreign key, so those rows would otherwise outlive their
  -- targets (marks_released -> assessment, evaluation_created ->
  -- period, booking_* -> booking).
  select coalesce(array_agg(id), '{}') into v_assessment_ids
  from assessments where section_id = p_section_id;
  select coalesce(array_agg(id), '{}') into v_period_ids
  from evaluation_periods where section_id = p_section_id;

  -- Sweep course-specific notifications lacking FK coverage.
  delete from notifications n
  where n.related_id = p_section_id
     or n.related_id = any(v_assessment_ids)
     or n.related_id = any(v_period_ids)
     or n.related_id in (
          select b.id
          from bookings b
          join evaluation_slots es on es.id = b.slot_id
          join evaluation_periods ep on ep.id = es.evaluation_period_id
          where ep.section_id = p_section_id
        );
  -- Announcement-typed notifications die automatically via
  -- notifications.announcement_id ON DELETE CASCADE.

  -- The big cascade: removes enrollments, student_invites,
  -- section_tas, assessments -> marks, evaluation_periods ->
  -- slots -> bookings, announcements (+ their notifications).
  delete from course_sections where id = p_section_id;

  -- Drop the course shell once its last section is gone. A course
  -- still taught by another TA survives untouched.
  delete from courses c
  where c.id = v_course_id
    and not exists (
      select 1 from course_sections cs where cs.course_id = c.id
    );
end;
$$;

grant execute on function public.delete_ta_section(uuid) to authenticated;

-- =========================================================
-- NOTIFICATIONS RPCs (in-app + Web Push)
--
-- Recipients and payloads are ALWAYS derived server-side.
-- The caller must be an admin or the section's TA. Two entry
-- points for the client (both security definer):
--   create_notifications(type, related_id) -> jsonb
--     inserts in-app rows (idempotent per user) and returns
--     { created, recipients, payload } so the caller can then
--     invoke the send-push-notification Edge Function.
--   get_push_recipients(type, related_id) -> jsonb
--     read-only variant used by the Edge Function to
--     re-validate the caller and re-derive recipients before
--     sending push. Never insertable from the client.
-- resolve_notification_target() is internal ONLY (execute
-- revoked from clients).
-- =========================================================

drop function if exists public.resolve_notification_target(text, uuid);
create or replace function public.resolve_notification_target(p_type text, p_related_id uuid)
returns table (recipient_id uuid, title text, message text)
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
  v_assess assessments%rowtype;
  v_period evaluation_periods%rowtype;
  v_course_code text;
  v_subject text;
  v_section_code text;
begin
  if p_type = 'announcement' then
    select * into v_ann from announcements
    where id = p_related_id and deleted_at is null;
    if v_ann.id is null then
      raise exception 'Announcement not found';
    end if;
    if not (is_admin() or is_ta_of_section(v_ann.section_id)) then
      raise exception 'You do not have access to this announcement';
    end if;

    return query
      select p.id, v_ann.title, v_ann.body
      from profiles p
      join students s on s.id = p.id and s.archived_at is null
      left join enrollments e
        on e.student_id = p.id and e.section_id = v_ann.section_id
      where v_ann.section_id is null or e.student_id is not null;

  elsif p_type = 'marks_released' then
    select * into v_assess from assessments where id = p_related_id;
    if v_assess.id is null then
      raise exception 'Assessment not found';
    end if;
    if v_assess.status <> 'published'
       or (v_assess.release_date is not null and v_assess.release_date > current_date) then
      raise exception 'Assessment is not released yet';
    end if;
    if not (is_admin() or is_ta_of_section(v_assess.section_id)) then
      raise exception 'You do not have access to this assessment';
    end if;

    select c.code, c.title, s.section_code
      into v_course_code, v_subject, v_section_code
    from course_sections s
    join courses c on c.id = s.course_id
    where s.id = v_assess.section_id;

    return query
      select p.id,
             'Your ' || v_assess.title || ' marks have been uploaded.',
             'Course: ' || v_course_code || E'\nSubject: ' || v_subject ||
             E'\nSection: ' || v_section_code || E'\n\nTap to view your marks.'
      from profiles p
      join students s on s.id = p.id and s.archived_at is null
      join enrollments e
        on e.student_id = p.id and e.section_id = v_assess.section_id
      where exists (
        select 1 from marks m
        where m.student_id = p.id and m.assessment_id = v_assess.id
      );

  elsif p_type = 'evaluation_created' then
    select * into v_period from evaluation_periods where id = p_related_id;
    if v_period.id is null then
      raise exception 'Evaluation period not found';
    end if;
    if not (is_admin() or is_ta_of_section(v_period.section_id)) then
      raise exception 'You do not have access to this section';
    end if;

    select c.code, c.title, s.section_code
      into v_course_code, v_subject, v_section_code
    from course_sections s
    join courses c on c.id = s.course_id
    where s.id = v_period.section_id;

    return query
      select p.id,
             'New evaluation period created.',
             'Course: ' || v_course_code || E'\nSubject: ' || v_subject ||
             E'\nSection: ' || v_section_code || E'\n\nBook your evaluation slot.'
      from profiles p
      join students s on s.id = p.id and s.archived_at is null
      join enrollments e
        on e.student_id = p.id and e.section_id = v_period.section_id;

  else
    raise exception 'Unsupported notification type';
  end if;
end;
$$;

revoke execute on function public.resolve_notification_target(text, uuid)
  from public, anon, authenticated;

-- Inserts in-app notifications (idempotent) and returns the
-- recipient list + payload for the push Edge Function.
drop function if exists public.create_notifications(text, uuid);
create or replace function public.create_notifications(p_type text, p_related_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_created int := 0;
  v_out jsonb;
begin
  create temp table t_target on commit drop as
    select recipient_id, title, message
    from resolve_notification_target(p_type, p_related_id);

  if not exists (select 1 from t_target) then
    return jsonb_build_object('created', 0, 'recipients', '[]'::jsonb, 'payload', null);
  end if;

  insert into notifications (user_id, type, related_id, announcement_id, title, message)
  select t.recipient_id,
         p_type,
         p_related_id,
         case when p_type = 'announcement' then p_related_id end,
         t.title,
         t.message
  from t_target t
  on conflict (user_id, type, related_id) do nothing;

  get diagnostics v_created = row_count;

  select jsonb_build_object(
    'created', v_created,
    'recipients', coalesce(jsonb_agg(t.recipient_id), '[]'::jsonb),
    'payload', (select jsonb_build_object(
                  'title', t2.title,
                  'message', t2.message,
                  'url', case p_type
                           when 'announcement' then '/announcements'
                           when 'marks_released' then '/marks'
                           else '/evaluations'
                         end
                ) from t_target t2 limit 1)
  )
  into v_out
  from t_target t;

  return v_out;
end;
$$;

-- Read-only recipient derivation for the Edge Function.
drop function if exists public.get_push_recipients(text, uuid);
create or replace function public.get_push_recipients(p_type text, p_related_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_out jsonb;
begin
  create temp table t_target on commit drop as
    select recipient_id, title, message
    from resolve_notification_target(p_type, p_related_id);

  if not exists (select 1 from t_target) then
    return jsonb_build_object('recipients', '[]'::jsonb, 'payload', null);
  end if;

  select jsonb_build_object(
    'recipients', coalesce(jsonb_agg(t.recipient_id), '[]'::jsonb),
    'payload', (select jsonb_build_object(
                  'title', t2.title,
                  'message', t2.message,
                  'url', case p_type
                           when 'announcement' then '/announcements'
                           when 'marks_released' then '/marks'
                           else '/evaluations'
                         end
                ) from t_target t2 limit 1)
  )
  into v_out
  from t_target t;

  return v_out;
end;
$$;

grant execute on function public.create_notifications(text, uuid)
  to authenticated;
grant execute on function public.get_push_recipients(text, uuid)
  to authenticated;

-- Caller gate for section aggregates: admin, TA of the section,
-- or an enrolled student of it. Everyone else gets empty results.
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

-- Class stats for ONE assessment: avg / min / max / count.
-- SECURITY DEFINER so a student sees real class aggregates despite
-- per-student RLS. Scoping enforced INSIDE: enrolled active students
-- of the assessment's own section only, profiles.role='student'
-- (never TA/admin), published assessments only.
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
  from marks m
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

-- Batch variant: stats for MANY assessments in a single round trip.
-- Same scoping as above; draft/archived assessments never appear.
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

-- Slots for a period with live confirmed-booking counts
drop function if exists public.get_slots_with_counts(uuid);
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

-- Overall section leaderboard: ranked by WEIGHTED OVERALL PERCENTAGE,
-- not raw totals. Weighted % per student = SUM over PUBLISHED
-- assessments of this section of (obtained / total_marks) * weightage.
-- Highest weighted % = rank #1; ties share the same rank (standard
-- competition ranking), displayed in registration_no order. Enrolled
-- active students only (role='student'). SECURITY DEFINER + internal
-- gate (see can_view_section_aggregates). Computed on read, so ranks
-- always reflect current marks/weightage.
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

-- Assessment-specific leaderboard: ranks students within a single
-- assessment. Only enrolled active STUDENTS of the given section who
-- HAVE a mark on THIS published assessment; the assessment must belong
-- to that exact section. Highest obtained mark = rank #1; ties share
-- a rank. SECURITY DEFINER + internal gate.
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
create index if not exists idx_push_subs_user on push_subscriptions(user_id);
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
drop function if exists public.generate_slots(uuid, date[], time, time, int, int);
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

-- Email notification mechanism was removed in v2.7 (replaced by
-- Web Push). Old functions/table are dropped for fresh rebuilds.
drop function if exists public.prepare_email_deliveries(uuid);
drop function if exists public.mark_email_delivery(uuid, text, text, text);
drop table if exists announcement_email_deliveries;

-- ---------------------------------------------------------
-- Backfill: register existing non-admin users as students
-- (for anyone who signed in before auto-registration existed).
-- ---------------------------------------------------------
insert into students (id)
select id from profiles
where role = 'student'
on conflict do nothing;

-- =========================================================
-- Trigger: auto-notify students when assessment status changes to published
-- =========================================================
create or replace function public.on_assessment_published()
returns trigger as $$
begin
  if new.status = 'published'
     and (old.status is null or old.status <> 'published') then
    if exists (select 1 from marks m where m.assessment_id = new.id) then
      perform create_notifications('marks_released', new.id);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_assessment_published on assessments;
create trigger trg_assessment_published
  after update of status on assessments
  for each row
  execute function on_assessment_published();

-- =========================================================
-- END v2
-- =========================================================