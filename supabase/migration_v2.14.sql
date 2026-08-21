-- =========================================================
-- NUSkor — Migration v2.14
-- Section requests: TAs can request new sections.
-- Profile deletion: users can delete their accounts.
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

alter table public.section_requests enable row level security;

-- TA can read their own requests
create policy "section_requests_select_own" on public.section_requests
  for select using (auth.uid() = ta_id);

-- TA can insert their own requests
create policy "section_requests_insert_own" on public.section_requests
  for insert with check (auth.uid() = ta_id);

-- Admin can do everything
create policy "section_requests_admin_all" on public.section_requests
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- 2. DELETE ACCOUNT FUNCTION ----------
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
  delete from section_requests where ta_id = uid;
  delete from ta_applications where user_id = uid;

  -- Delete profile
  delete from profiles where id = uid;

  -- Note: auth user deletion requires service_role.
  -- Profile deletion is sufficient for practical purposes.
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- =========================================================
-- END v2.14
-- =========================================================
