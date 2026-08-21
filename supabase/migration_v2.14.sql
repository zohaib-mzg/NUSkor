-- =========================================================
-- NUSkor — Migration v2.14 (idempotent — safe to re-run)
-- Section requests: TAs can request new sections.
-- Profile deletion: users can delete their accounts.
-- TA revocation: admin can revoke TA role.
-- =========================================================

-- ---------- 1. SECTION REQUESTS ----------
create table if not exists public.section_requests (
  id uuid default gen_random_uuid() primary key,
  ta_id uuid not null references auth.users(id) on delete cascade,
  course_name text not null,
  semester text not null,
  year integer not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'section_requests' and column_name = 'course_code')
     and not exists (select 1 from information_schema.columns where table_name = 'section_requests' and column_name = 'course_name') then
    alter table public.section_requests rename column course_code to course_name;
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

-- ---------- 2. REVOKE TA FUNCTION ----------
-- Admin revokes a TA: removes all section assignments, invites, and downgrades role.
-- SECURITY DEFINER bypasses RLS so the admin can update another user's profile.
create or replace function public.revoke_ta(p_ta_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can revoke TA role';
  end if;

  -- Clean up TA's data
  delete from section_tas where ta_id = p_ta_id;
  delete from student_invites where created_by_ta = p_ta_id;
  delete from section_requests where ta_id = p_ta_id;
  delete from ta_applications where user_id = p_ta_id;

  -- Downgrade role
  update profiles set role = 'student' where id = p_ta_id;
end;
$$;

grant execute on function public.revoke_ta(uuid) to authenticated;

-- ---------- 3. DELETE ACCOUNT FUNCTION ----------
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
