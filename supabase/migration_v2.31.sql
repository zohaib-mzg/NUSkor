-- =========================================================
-- migration_v2.31.sql
-- Store evaluator name directly in bookings so students can
-- see which TA marked their evaluation Done without needing
-- to read the profiles table (RLS blocks student -> TA reads).
-- =========================================================

-- 1. Add denormalized name column
alter table public.bookings
  add column if not exists evaluated_by_name text;

-- 2. Update mark_evaluation_done to capture TA name
create or replace function public.mark_evaluation_done(p_booking_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_booking bookings%rowtype;
  v_section uuid;
  v_ta_name text;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  select ep.section_id into v_section
  from evaluation_periods ep
  where ep.id = v_booking.evaluation_period_id;

  if not (is_admin() or is_ta_of_section(v_section)) then
    raise exception 'You are not authorised to mark this evaluation';
  end if;

  -- Resolve the TA's display name from profiles (security definer can read)
  select p.full_name into v_ta_name
  from profiles p
  where p.id = auth.uid();

  update bookings
  set evaluation_status = 'done',
      evaluation_completed_at = now(),
      evaluated_by = auth.uid(),
      evaluated_by_name = v_ta_name
  where id = p_booking_id;
end;
$$;

grant execute on function public.mark_evaluation_done(uuid) to authenticated;

-- 3. Update unmark_evaluation_done to clear name
create or replace function public.unmark_evaluation_done(p_booking_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_booking bookings%rowtype;
  v_section uuid;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  select ep.section_id into v_section
  from evaluation_periods ep
  where ep.id = v_booking.evaluation_period_id;

  if not (is_admin() or is_ta_of_section(v_section)) then
    raise exception 'You are not authorised to unmark this evaluation';
  end if;

  update bookings
  set evaluation_status = 'pending',
      evaluation_completed_at = null,
      evaluated_by = null,
      evaluated_by_name = null
  where id = p_booking_id;
end;
$$;

grant execute on function public.unmark_evaluation_done(uuid) to authenticated;

-- 4. Backfill existing completed evaluations with TA name
update public.bookings b
set evaluated_by_name = p.full_name
from public.evaluation_periods ep
join public.section_tas st on st.section_id = ep.section_id
join public.profiles p on p.id = st.ta_id
where b.evaluation_period_id = ep.id
  and b.evaluation_status = 'done'
  and (b.evaluated_by_name is null or b.evaluated_by_name = '');
