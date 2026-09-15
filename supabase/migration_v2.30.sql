-- =========================================================
-- migration_v2.30.sql
-- Add evaluated_by to bookings so students can see which
-- TA marked their evaluation as Done.
-- =========================================================

-- 1. Add column
alter table public.bookings
  add column if not exists evaluated_by uuid references profiles(id) on delete set null;

-- 2. Update mark_evaluation_done to record the TA
create or replace function public.mark_evaluation_done(p_booking_id uuid)
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
    raise exception 'You are not authorised to mark this evaluation';
  end if;

  update bookings
  set evaluation_status = 'done',
      evaluation_completed_at = now(),
      evaluated_by = auth.uid()
  where id = p_booking_id;
end;
$$;

grant execute on function public.mark_evaluation_done(uuid) to authenticated;

-- 3. Update unmark_evaluation_done to clear evaluated_by
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
      evaluated_by = null
  where id = p_booking_id;
end;
$$;

grant execute on function public.unmark_evaluation_done(uuid) to authenticated;

-- 4. Backfill existing completed evaluations via section_tas
update public.bookings b
set evaluated_by = st.ta_id
from public.evaluation_periods ep
join public.section_tas st on st.section_id = ep.section_id
where b.evaluation_period_id = ep.id
  and b.evaluation_status = 'done'
  and b.evaluated_by is null;
