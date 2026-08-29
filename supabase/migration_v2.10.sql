-- =========================================================
-- NUSkor — Migration v2.10 (BUGFIX + FEATURE)
-- 1. FIX: students could not cancel bookings (client DELETE
--    is blocked by admin-only delete policy -> silent no-op).
-- 2. FEATURE: direct slot switch / rebook without cancelling
--    first (unique(student_id, evaluation_period_id) makes
--    plain INSERT fail on rebook; RPC upserts instead).
-- Both actions run as SECURITY DEFINER RPCs so table-policy
-- drift can never break them again. Capacity is enforced.
-- Idempotent: safe to run repeatedly in the SQL Editor.
-- =========================================================

-- ---------- 1. BOOK / SWITCH SLOT ----------
-- Books the caller into p_slot_id. If they already have a row
-- for the period (confirmed or cancelled) it is moved/reactivated,
-- so switching slots or rebooking after cancel needs no delete.
create or replace function public.book_evaluation_slot(
  p_period_id uuid,
  p_slot_id uuid
)
returns void
language plpgsql security definer as $$
declare
  v_slot evaluation_slots%rowtype;
  v_existing bookings%rowtype;
  v_count int;
begin
  select * into v_slot from evaluation_slots
  where id = p_slot_id and evaluation_period_id = p_period_id;
  if v_slot.id is null then
    raise exception 'Slot not found for this evaluation period';
  end if;
  if not v_slot.is_open then
    raise exception 'That slot is closed';
  end if;

  select * into v_existing from bookings
  where student_id = auth.uid() and evaluation_period_id = p_period_id;

  if v_existing.id is not null
     and v_existing.status = 'confirmed'
     and v_existing.slot_id = p_slot_id then
    raise exception 'You are already booked into this slot';
  end if;

  -- Capacity check excluding the caller's own current row.
  select count(*) into v_count from bookings
  where slot_id = p_slot_id
    and status = 'confirmed'
    and (v_existing.id is null or id <> v_existing.id);

  if v_count >= v_slot.capacity then
    raise exception 'This slot is full';
  end if;

  insert into bookings (student_id, evaluation_period_id, slot_id, status)
  values (auth.uid(), p_period_id, p_slot_id, 'confirmed')
  on conflict (student_id, evaluation_period_id) do update
    set slot_id = excluded.slot_id,
        status = 'confirmed';
end;
$$;

-- ---------- 2. CANCEL OWN BOOKING ----------
-- Sets status='cancelled' instead of deleting the row, so the
-- unique(student_id, period) rule keeps history intact.
create or replace function public.cancel_my_booking(p_booking_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from bookings
  where id = p_booking_id and student_id = auth.uid();

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.status = 'cancelled' then
    return;
  end if;

  update bookings set status = 'cancelled' where id = v_booking.id;
end;
$$;

revoke execute on function public.book_evaluation_slot(uuid, uuid)
  from public, anon;
revoke execute on function public.cancel_my_booking(uuid)
  from public, anon;
grant execute on function public.book_evaluation_slot(uuid, uuid)
  to authenticated;
grant execute on function public.cancel_my_booking(uuid)
  to authenticated;

-- =========================================================
-- END v2.10
-- =========================================================
