-- =========================================================
-- NUSkor — Migration v2.16
-- Data-integrity fixes:
--   1. students.program / semester collected at first join
--      (join_section now accepts p_program / p_semester)
--   2. DB-level validation for section_requests.semester and
--      create_ta_section inputs
--   3. Cascading cleanup for TA revocation & account deletion;
--      profile-attribution FKs become ON DELETE SET NULL so a
--      profile delete can never fail on FK violation and content
--      survives with attribution dropped
--   4. marks.updated_by / updated_at are set by the app on every
--      mark upsert (frontend change, listed here for reference)
-- Idempotent — safe to re-run.
-- =========================================================

-- ---------- 1. PROFILE-ATTRIBUTION FKs -> ON DELETE SET NULL ----------
alter table public.announcements drop constraint if exists announcements_created_by_fkey;
alter table public.announcements
  add constraint announcements_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.assessments drop constraint if exists assessments_created_by_fkey;
alter table public.assessments
  add constraint assessments_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.enrollments drop constraint if exists enrollments_invited_by_fkey;
alter table public.enrollments
  add constraint enrollments_invited_by_fkey
  foreign key (invited_by) references public.profiles(id) on delete set null;

alter table public.student_invites drop constraint if exists student_invites_accepted_by_fkey;
alter table public.student_invites
  add constraint student_invites_accepted_by_fkey
  foreign key (accepted_by) references public.profiles(id) on delete set null;

alter table public.student_invites drop constraint if exists student_invites_created_by_ta_fkey;
alter table public.student_invites
  add constraint student_invites_created_by_ta_fkey
  foreign key (created_by_ta) references public.profiles(id) on delete set null;

alter table public.marks drop constraint if exists marks_updated_by_fkey;
alter table public.marks
  add constraint marks_updated_by_fkey
  foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.courses drop constraint if exists courses_created_by_fkey;
alter table public.courses
  add constraint courses_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.evaluation_periods drop constraint if exists evaluation_periods_created_by_fkey;
alter table public.evaluation_periods
  add constraint evaluation_periods_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.ta_applications drop constraint if exists ta_applications_reviewed_by_fkey;
alter table public.ta_applications
  add constraint ta_applications_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

-- ---------- 2. SECTION_REQUESTS VALIDATION ----------
-- The semester field previously accepted arbitrary text ("FALI",
-- "aaaaaaa", ...). Lock it to the three real terms. Existing rows
-- already use canonical values.
alter table public.section_requests
  drop constraint if exists section_requests_semester_check;
alter table public.section_requests
  add constraint section_requests_semester_check
  check (semester in ('Spring', 'Summer', 'Fall'));

-- Reject empty/one-character junk in the free-text fields.
alter table public.section_requests
  drop constraint if exists section_requests_course_code_check;
alter table public.section_requests
  add constraint section_requests_course_code_check
  check (btrim(course_code) <> '' and length(btrim(course_code)) between 2 and 12);

alter table public.section_requests
  drop constraint if exists section_requests_section_code_check;
alter table public.section_requests
  add constraint section_requests_section_code_check
  check (btrim(section_code) <> '' and length(btrim(section_code)) between 1 and 16);

alter table public.section_requests
  drop constraint if exists section_requests_course_name_check;
alter table public.section_requests
  add constraint section_requests_course_name_check
  check (btrim(course_name) <> '' and length(btrim(course_name)) >= 2);

alter table public.section_requests
  drop constraint if exists section_requests_year_check;
alter table public.section_requests
  add constraint section_requests_year_check
  check (year between 2020 and 2100);

-- ---------- 3. CREATE_TA_SECTION INPUT VALIDATION ----------
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

-- ---------- 4. JOIN_SECTION collects program/semester ----------
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

grant execute on function public.join_section(text, text, text) to authenticated;

-- ---------- 5. REVOKE_TA cascades TA-created content ----------
-- Removes the TA's assignments AND hard-deletes sections they
-- created (cascading to assessments, marks, enrollments, invites,
-- evaluation periods, bookings and section announcements), plus any
-- global announcements they authored. Sections created by others
-- survive — the TA is only unassigned from those.
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

-- ---------- 6. DELETE_ACCOUNT removes everything safely ----------
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
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- =========================================================
-- END v2.16
-- =========================================================
