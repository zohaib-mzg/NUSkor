-- =========================================================
-- v2.6 — Student invitation & join flow (NUSKOR FINAL)
--
-- 1) One TA per section (unique constraint + clean duplicates)
-- 2) student_invites: accepted_at / accepted_by + statuses
-- 3) enrollments: invited_by (for the TA "Invited By" column)
-- 4) handle_new_user: stop auto-registering students
-- 5) join_section: invitation-only student registration, returns jsonb
-- 6) get_invite_details: public preview for /invite/{token}
-- =========================================================

-- ---------- 1. ONE TA PER SECTION ----------
-- Remove duplicate TA assignments (keep the earliest assigned TA per section).
delete from section_tas a
using section_tas b
where a.section_id = b.section_id
  and a.assigned_at > b.assigned_at;

-- Drop the old (section_id, ta_id) unique and enforce section_id only.
alter table public.section_tas
  drop constraint if exists section_tas_section_id_ta_id_key;
alter table public.section_tas
  drop constraint if exists section_tas_section_id_key;
alter table public.section_tas
  add constraint section_tas_section_id_key unique (section_id);

-- ---------- 2. ENROLLMENTS: invited_by ----------
alter table public.enrollments
  add column if not exists invited_by uuid references public.profiles(id);

-- ---------- 3. STUDENT INVITES: accepted tracking ----------
alter table public.student_invites
  add column if not exists accepted_at timestamptz;
alter table public.student_invites
  add column if not exists accepted_by uuid references public.profiles(id);

alter table public.student_invites
  drop constraint if exists student_invites_status_check;
alter table public.student_invites
  add constraint student_invites_status_check
  check (status in ('active', 'inactive', 'accepted', 'revoked'));

-- ---------- 4. STOP AUTO-REGISTERING STUDENTS ----------
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

-- ---------- 5. JOIN_SECTION (invitation-only registration) ----------
drop function if exists public.join_section(text);
create or replace function public.join_section(p_token text)
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
  if not exists (select 1 from students where id = auth.uid()) then
    if public.my_role() in ('ta', 'admin') then
      raise exception 'Only student accounts can join a section';
    end if;
    insert into students (id) values (auth.uid());
  end if;

  insert into enrollments (student_id, section_id, invited_by)
  values (auth.uid(), v_invite.section_id, v_invite.created_by_ta)
  on conflict (student_id, section_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update student_invites
    set used_count = used_count + 1,
        status = 'accepted',
        accepted_at = now(),
        accepted_by = auth.uid()
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

-- ---------- 6. PUBLIC INVITE PREVIEW ----------
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
  elsif v_invite.status <> 'active' then
    raise exception 'This invitation is no longer active';
  elsif v_invite.expires_at < now() then
    raise exception 'This invitation has expired';
  elsif v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    raise exception 'This invitation has reached its usage limit';
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

grant execute on function public.join_section(text) to anon, authenticated;
grant execute on function public.get_invite_details(text) to anon, authenticated;