-- v2.19 — Invite capacity fix + Leaderboard fix
-- =========================================================
-- BUG FIX: join_section set status='accepted' after the first
-- student joined, blocking all subsequent students even when
-- the invite had remaining capacity (e.g. max_uses=5).
--
-- FIX: Only mark as 'accepted' when the invite is fully
-- exhausted (used_count >= max_uses). For unlimited invites
-- (max_uses IS NULL), status stays 'active' forever.
-- =========================================================

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

grant execute on function public.join_section(text, text, text) to authenticated;

-- =========================================================
-- FIX: get_invite_details also blocked 'accepted' invites.
-- Allow 'accepted' invites to be previewed so the landing
-- page can show a "this invite is full" message instead of
-- a generic "no longer active" error.
-- =========================================================

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

grant execute on function public.get_invite_details(text) to anon, authenticated;
