-- =========================================================
-- NUSkor — Migration v2.14 (idempotent — safe to re-run)
-- Section requests, profile deletion, TA revocation, admin login fix.
-- =========================================================

-- ---------- 0. FIX HANDLE_NEW_USER TRIGGER ----------
-- Allow admin email and remove hardcoded l242530 reference
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Allow admin email + LHR emails
  if new.email != 'adminmzg@gmail.com' and new.email not like '%@lhr.nu.edu.pk' then
    raise exception 'Only @lhr.nu.edu.pk accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when new.email = 'adminmzg@gmail.com' then 'admin' else 'student' end
  );

  return new;
end;
$$ language plpgsql security definer;

-- ---------- 0b. SET ADMIN ROLE FUNCTION ----------
-- Bypasses RLS so the admin login page and portal layout can set the role.
create or replace function public.set_admin_role()
returns void
language plpgsql security definer
as $$
begin
  update profiles set role = 'admin' where id = auth.uid();
end;
$$;

grant execute on function public.set_admin_role() to authenticated;

-- ---------- 1. SECTION REQUESTS ----------
create table if not exists public.section_requests (
  id uuid default gen_random_uuid() primary key,
  ta_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  course_name text not null,
  section_code text not null,
  semester text not null,
  year integer not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- Migration safety: add columns if missing from earlier runs
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'section_requests' and column_name = 'course_name') then
    alter table public.section_requests add column course_name text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'section_requests' and column_name = 'section_code') then
    alter table public.section_requests add column section_code text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'section_requests' and column_name = 'course_code') then
    alter table public.section_requests add column course_code text not null default '';
  end if;
exception when others then null;
end $$;

alter table public.section_requests enable row level security;

drop policy if exists "section_requests_select_own" on public.section_requests;
create policy "section_requests_select_own" on public.section_requests
  for select using (auth.uid() = ta_id);

drop policy if exists "section_requests_insert_own" on public.section_requests;
create policy "section_requests_insert_own" on public.section_requests
  for insert with check (auth.uid() = ta_id);

drop policy if exists "section_requests_admin_all" on public.section_requests;
create policy "section_requests_admin_all" on public.section_requests
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- 2. APPROVE SECTION REQUEST ----------
-- Creates course (if new), creates section, assigns TA, upgrades role — all in one call.
create or replace function public.approve_section_request(p_request_id uuid)
returns void
language plpgsql security definer
as $$
declare
  req record;
  v_course_id uuid;
  v_section_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can approve section requests';
  end if;

  select * into req from section_requests where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already processed';
  end if;

  -- Upgrade requester to TA role
  update profiles set role = 'ta' where id = req.ta_id and role != 'ta';

  -- Find or create course
  select id into v_course_id from courses where code = upper(req.course_code);
  if not found then
    insert into courses (code, title, created_by)
      values (upper(req.course_code), req.course_name, auth.uid())
      returning id into v_course_id;
  end if;

  -- Create section
  insert into course_sections (course_id, section_code, semester, academic_year, status, created_by)
    values (v_course_id, req.section_code, req.semester, req.year::text, 'active', auth.uid())
    returning id into v_section_id;

  -- Assign TA
  insert into section_tas (ta_id, section_id, semester)
    values (req.ta_id, v_section_id, req.semester);

  -- Mark request approved
  update section_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
end;
$$;

grant execute on function public.approve_section_request(uuid) to authenticated;

-- ---------- 3. REVOKE TA FUNCTION ----------
create or replace function public.revoke_ta(p_ta_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can revoke TA role';
  end if;

  -- Null out FK references
  update enrollments set invited_by = null where invited_by = p_ta_id;
  update student_invites set accepted_by = null where accepted_by = p_ta_id;

  -- Clean up TA data
  delete from section_tas where ta_id = p_ta_id;
  delete from student_invites where created_by_ta = p_ta_id;
  delete from section_requests where ta_id = p_ta_id;
  delete from ta_applications where user_id = p_ta_id;

  update profiles set role = 'student' where id = p_ta_id;
end;
$$;

grant execute on function public.revoke_ta(uuid) to authenticated;

-- ---------- 4. DELETE ACCOUNT FUNCTION ----------
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

  -- Null out FK references that point to this profile
  update enrollments set invited_by = null where invited_by = uid;
  update student_invites set accepted_by = null where accepted_by = uid;

  -- Delete dependent data
  delete from marks where student_id = uid;
  delete from enrollments where student_id = uid;
  delete from bookings where student_id = uid;
  delete from user_notification_settings where user_id = uid;
  delete from notifications where user_id = uid;
  delete from push_subscriptions where user_id = uid;
  delete from section_tas where ta_id = uid;
  delete from student_invites where created_by_ta = uid;
  delete from section_requests where ta_id = uid;
  delete from ta_applications where user_id = uid;

  -- Delete profile
  delete from profiles where id = uid;
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- =========================================================
-- END v2.14
-- =========================================================
