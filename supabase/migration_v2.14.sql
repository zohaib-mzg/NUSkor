-- =========================================================
-- NUSkor — Migration v2.14 (idempotent — safe to re-run)
-- Admin login fix, TA revocation, profile deletion.
-- =========================================================

-- ---------- 1. FIX HANDLE_NEW_USER TRIGGER ----------
create or replace function public.handle_new_user()
returns trigger as $$
begin
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

-- ---------- 2. FIX is_admin() FUNCTION ----------
create or replace function public.is_admin()
returns boolean
language plpgsql security definer
stable
as $$
begin
  return (
    auth.email() = 'adminmzg@gmail.com'
    or exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );
end;
$$;

-- ---------- 2b. ALLOW TAs TO CREATE COURSES AND SECTIONS ----------
drop policy if exists "courses_ta_insert" on courses;
create policy "courses_ta_insert" on courses
  for insert with check (
    auth.email() = 'adminmzg@gmail.com'
    or exists (select 1 from profiles where id = auth.uid() and role = 'ta')
  );

drop policy if exists "course_sections_ta_insert" on course_sections;
create policy "course_sections_ta_insert" on course_sections
  for insert with check (
    auth.email() = 'adminmzg@gmail.com'
    or exists (select 1 from profiles where id = auth.uid() and role = 'ta')
  );

drop policy if exists "section_tas_ta_insert" on section_tas;
create policy "section_tas_ta_insert" on section_tas
  for insert with check (
    auth.email() = 'adminmzg@gmail.com'
    or ta_id = auth.uid()
  );

-- ---------- 3. SET ADMIN ROLE FUNCTION ----------
create or replace function public.set_admin_role()
returns void
language plpgsql security definer
as $$
begin
  insert into profiles (id, email, role) values (auth.uid(), auth.email(), 'admin')
    on conflict (id) do update set role = 'admin';
end;
$$;

grant execute on function public.set_admin_role() to authenticated;

-- ---------- 4. REVOKE TA FUNCTION ----------
create or replace function public.revoke_ta(p_ta_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can revoke TA role';
  end if;

  update enrollments set invited_by = null where invited_by = p_ta_id;
  update student_invites set accepted_by = null where accepted_by = p_ta_id;

  delete from section_tas where ta_id = p_ta_id;
  delete from student_invites where created_by_ta = p_ta_id;
  delete from ta_applications where user_id = p_ta_id;

  update profiles set role = 'student' where id = p_ta_id;
end;
$$;

grant execute on function public.revoke_ta(uuid) to authenticated;

-- ---------- 5. DELETE ACCOUNT FUNCTION ----------
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

  update enrollments set invited_by = null where invited_by = uid;
  update student_invites set accepted_by = null where accepted_by = uid;

  delete from marks where student_id = uid;
  delete from enrollments where student_id = uid;
  delete from bookings where student_id = uid;
  delete from user_notification_settings where user_id = uid;
  delete from notifications where user_id = uid;
  delete from push_subscriptions where user_id = uid;
  delete from section_tas where ta_id = uid;
  delete from student_invites where created_by_ta = uid;
  delete from ta_applications where user_id = uid;

  delete from profiles where id = uid;
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- =========================================================
-- END v2.14
-- =========================================================
