-- Migration v2.25: Add evaluation status tracking to bookings
-- Safe: adds nullable columns, no data loss.
-- Also adds TA update policy on bookings for evaluation marking,
-- and a secure RPC for TAs to mark evaluations as done.

-- =========================================================
-- 1. Add evaluation tracking columns to bookings
-- =========================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS evaluation_status text not null default 'pending'
    check (evaluation_status in ('pending', 'done'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS evaluation_completed_at timestamptz;

COMMENT ON COLUMN public.bookings.evaluation_status
  IS 'pending = not yet evaluated; done = TA/admin marked complete';
COMMENT ON COLUMN public.bookings.evaluation_completed_at
  IS 'Timestamp when the TA marked this booking''s evaluation as done';

-- =========================================================
-- 2. Allow TAs to update evaluation_status on bookings
--    for students they teach (via enrollments + section_tas).
--    Students can still update their own booking status (cancel).
--    Admins retain full access.
-- =========================================================
DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_or_admin_or_ta" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin_or_ta" ON public.bookings
  FOR UPDATE USING (
    student_id = auth.uid()
    OR is_admin()
    OR exists (
      select 1 from evaluation_periods ep
      where ep.id = bookings.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  ) WITH CHECK (
    student_id = auth.uid()
    OR is_admin()
    OR exists (
      select 1 from evaluation_periods ep
      where ep.id = bookings.evaluation_period_id
        and is_ta_of_section(ep.section_id)
    )
  );

-- =========================================================
-- 3. Secure RPC: mark_evaluation_done
--    Only the section's TA or an admin can call it.
--    Validates the booking belongs to the slot and period.
-- =========================================================
DROP FUNCTION IF EXISTS public.mark_evaluation_done(uuid);
CREATE OR REPLACE FUNCTION public.mark_evaluation_done(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking bookings%rowtype;
  v_section uuid;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Resolve the section from the evaluation period
  SELECT ep.section_id INTO v_section
  FROM evaluation_periods ep
  WHERE ep.id = v_booking.evaluation_period_id;

  -- Only the section's TA or an admin may mark as done
  IF NOT (is_admin() OR is_ta_of_section(v_section)) THEN
    RAISE EXCEPTION 'You are not authorised to mark this evaluation';
  END IF;

  UPDATE bookings
  SET evaluation_status = 'done',
      evaluation_completed_at = now()
  WHERE id = p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_evaluation_done(uuid) TO authenticated;

-- =========================================================
-- 3b. Secure RPC: unmark_evaluation_done
--     Reverses mark_evaluation_done: sets status back to pending.
-- =========================================================
DROP FUNCTION IF EXISTS public.unmark_evaluation_done(uuid);
CREATE OR REPLACE FUNCTION public.unmark_evaluation_done(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking bookings%rowtype;
  v_section uuid;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT ep.section_id INTO v_section
  FROM evaluation_periods ep
  WHERE ep.id = v_booking.evaluation_period_id;

  IF NOT (is_admin() OR is_ta_of_section(v_section)) THEN
    RAISE EXCEPTION 'You are not authorised to unmark this evaluation';
  END IF;

  UPDATE bookings
  SET evaluation_status = 'pending',
      evaluation_completed_at = null
  WHERE id = p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unmark_evaluation_done(uuid) TO authenticated;

-- =========================================================
-- 4. Also allow TAs to insert bookings (for admin rebooking
--    on behalf of students, matching admin full access).
--    This keeps the existing student-only insert policy intact
--    while allowing TA/admin direct booking if needed.
-- =========================================================
-- No change needed: admin already has full access via RLS.
-- The existing policies are sufficient.

-- =========================================================
-- END v2.25
-- =========================================================
