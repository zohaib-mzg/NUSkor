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

-- ---------- 2b. CREATE TA SECTION RPC (bypasses all RLS) ----------
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
begin
  if not exists (select 1 from profiles where id = v_uid and role = 'ta') then
    raise exception 'Only TAs can create sections';
  end if;

  select id into v_course_id from courses where code = upper(p_course_code);
  if v_course_id is null then
    insert into courses (code, title, created_by)
    values (upper(p_course_code), p_course_name, v_uid)
    returning id into v_course_id;
  end if;

  insert into course_sections (course_id, section_code, semester, academic_year, status, created_by)
  values (v_course_id, p_section_code, p_semester, p_year, 'active', v_uid)
  returning id into v_section_id;

  insert into section_tas (ta_id, section_id, semester)
  values (v_uid, v_section_id, p_semester);

  return v_section_id;
end;
$$;

grant execute on function public.create_ta_section(text,text,text,text,text) to authenticated;

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
