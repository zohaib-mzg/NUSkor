-- =========================================================
-- v2.7 — Web Push Notifications (replaces email mechanism)
--
-- 1. notifications: add type + related_id, relax the old
--    unique(user_id, announcement_id) to unique(user_id, type, related_id)
-- 2. new tables: push_subscriptions, user_notification_settings (+ RLS)
-- 3. new RPCs: resolve_notification_target (internal),
--    create_notifications, get_push_recipients
-- 4. drop email mechanism: prepare_email_deliveries,
--    mark_email_delivery, announcement_email_deliveries, its policy
-- =========================================================

-- ---- 1. notifications schema change ----
alter table public.notifications
  add column if not exists type text not null default 'announcement'
    check (type in (
      'announcement',
      'marks_released',
      'evaluation_created',
      'booking_confirmed',
      'booking_cancelled',
      'important_update'
    ));
alter table public.notifications
  add column if not exists related_id uuid;

update public.notifications set related_id = announcement_id
where related_id is null;

alter table public.notifications
  drop constraint if exists notifications_user_id_announcement_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_user_id_type_related_id_key'
  ) then
    alter table public.notifications
      add constraint notifications_user_id_type_related_id_key
      unique (user_id, type, related_id);
  end if;
end $$;

-- ---- 2a. push_subscriptions ----
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_select_own" on public.push_subscriptions;
create policy "push_subs_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());
drop policy if exists "push_subs_insert_own" on public.push_subscriptions;
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());
drop policy if exists "push_subs_update_own" on public.push_subscriptions;
create policy "push_subs_update_own" on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_subs_delete_own" on public.push_subscriptions;
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- ---- 2b. user_notification_settings ----
create table if not exists public.user_notification_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  announcements boolean not null default true,
  marks_released boolean not null default true,
  evaluation_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_settings enable row level security;

drop policy if exists "notif_settings_select_own" on public.user_notification_settings;
create policy "notif_settings_select_own" on public.user_notification_settings
  for select using (user_id = auth.uid());
drop policy if exists "notif_settings_insert_own" on public.user_notification_settings;
create policy "notif_settings_insert_own" on public.user_notification_settings
  for insert with check (user_id = auth.uid());
drop policy if exists "notif_settings_update_own" on public.user_notification_settings;
create policy "notif_settings_update_own" on public.user_notification_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);

-- ---- 3. RPCs ----
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

-- ---- 4. remove email mechanism ----
drop function if exists public.prepare_email_deliveries(uuid);
drop function if exists public.mark_email_delivery(uuid, text, text, text);
drop policy if exists "email_deliveries_select_ta_admin"
  on public.announcement_email_deliveries;
drop table if exists public.announcement_email_deliveries;

-- =========================================================
-- END v2.7
-- =========================================================