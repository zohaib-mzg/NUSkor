-- =========================================================
-- NUSkor — Migration v2.2 (delta)
-- 1. Evaluation slot AUTO-GENERATION (generate_slots RPC)
-- 2. Email delivery pipeline for announcements
--    (prepare_email_deliveries / mark_email_delivery)
--
-- Run ONCE in the Supabase SQL Editor after migration_v2.1.sql.
-- Idempotent: safe to re-run.
-- =========================================================

-- Prevent exact-duplicate slots when auto-generation runs twice.
-- (If your existing test data has exact duplicates this will fail;
--  delete them first: select * from evaluation_slots group by
--  evaluation_period_id, slot_date, start_time, end_time having count(*)>1;)
drop index if exists idx_slots_unique;
create unique index idx_slots_unique
  on evaluation_slots(evaluation_period_id, slot_date, start_time, end_time);

-- Auto-generate slots for a period: for each date, walk start_time ->
-- end_time in p_duration_minutes steps, creating one slot per step.
-- Validates the caller is the section's TA or an admin, and that every
-- date falls inside the period's date range.
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

-- Create "pending" email delivery rows for an announcement's targets
-- (NULL section = every student). Returns newly created rows.
create or replace function public.prepare_email_deliveries(p_announcement_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_section uuid;
  v_count int;
begin
  select section_id into v_section from announcements where id = p_announcement_id;
  if v_section is null then
    raise exception 'Announcement not found';
  end if;
  if not (is_admin() or is_ta_of_section(v_section)) then
    raise exception 'You do not have access to this announcement';
  end if;

  if v_section is null then
    insert into announcement_email_deliveries (announcement_id, student_id)
    select p_announcement_id, s.id from students s
    on conflict (announcement_id, student_id) do nothing;
  else
    insert into announcement_email_deliveries (announcement_id, student_id)
    select p_announcement_id, e.student_id from enrollments e
    where e.section_id = v_section
    on conflict (announcement_id, student_id) do nothing;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Mark one delivery row sent/failed (caller must be the section's TA/admin).
create or replace function public.mark_email_delivery(
  p_delivery_id uuid,
  p_status text,
  p_message_id text default null,
  p_error text default null
) returns void
language plpgsql security definer as $$
declare
  v_ann announcements%rowtype;
begin
  select a.* into v_ann
  from announcements a
  join announcement_email_deliveries d on d.announcement_id = a.id
  where d.id = p_delivery_id;
  if v_ann.id is null then
    raise exception 'Delivery not found';
  end if;
  if not (is_admin() or is_ta_of_section(v_ann.section_id)) then
    raise exception 'You do not have access to this announcement';
  end if;

  update announcement_email_deliveries
  set status = p_status,
      resend_message_id = coalesce(p_message_id, resend_message_id),
      error_message = p_error,
      sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_delivery_id;
end;
$$;

-- =========================================================
-- END migration v2.2
-- =========================================================