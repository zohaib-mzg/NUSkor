-- Migration v2.26: Fix slot capacity race condition
-- 1. Adds SELECT ... FOR UPDATE on the slot row in book_evaluation_slot
--    to prevent two concurrent bookings from exceeding capacity.
-- 2. Ensures the check_slot_capacity trigger exists (from schema.sql,
--    but never applied to existing databases via migration).
-- Safe to run repeatedly (CREATE OR REPLACE / IF EXISTS).

-- ---------- 1. BOOK / SWITCH SLOT (fixed) ----------
DROP FUNCTION IF EXISTS public.book_evaluation_slot(uuid, uuid);
CREATE OR REPLACE FUNCTION public.book_evaluation_slot(
  p_period_id uuid,
  p_slot_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_slot evaluation_slots%rowtype;
  v_existing bookings%rowtype;
  v_count int;
BEGIN
  SELECT * INTO v_slot FROM evaluation_slots
  WHERE id = p_slot_id AND evaluation_period_id = p_period_id;
  IF v_slot.id IS NULL THEN
    RAISE EXCEPTION 'Slot not found for this evaluation period';
  END IF;
  IF NOT v_slot.is_open THEN
    RAISE EXCEPTION 'That slot is closed';
  END IF;

  -- Lock the slot row to prevent concurrent booking race conditions
  PERFORM 1 FROM evaluation_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  SELECT * INTO v_existing FROM bookings
  WHERE student_id = auth.uid() AND evaluation_period_id = p_period_id;

  IF v_existing.id IS NOT NULL
     AND v_existing.status = 'confirmed'
     AND v_existing.slot_id = p_slot_id THEN
    RAISE EXCEPTION 'You are already booked into this slot';
  END IF;

  -- Capacity check excluding the caller's own current row.
  SELECT count(*) INTO v_count FROM bookings
  WHERE slot_id = p_slot_id
    AND status = 'confirmed'
    AND (v_existing.id IS NULL OR id <> v_existing.id);

  IF v_count >= v_slot.capacity THEN
    RAISE EXCEPTION 'This slot is full';
  END IF;

  INSERT INTO bookings (student_id, evaluation_period_id, slot_id, status)
  VALUES (auth.uid(), p_period_id, p_slot_id, 'confirmed')
  ON CONFLICT (student_id, evaluation_period_id) DO UPDATE
    SET slot_id = excluded.slot_id,
        status = 'confirmed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.book_evaluation_slot(uuid, uuid)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.book_evaluation_slot(uuid, uuid)
  TO authenticated;

-- ---------- 2. Capacity check trigger (safety net) ----------
DROP FUNCTION IF EXISTS public.check_slot_capacity();
CREATE OR REPLACE FUNCTION public.check_slot_capacity()
RETURNS trigger AS $$
DECLARE
  current_count int;
  slot_cap int;
BEGIN
  SELECT capacity INTO slot_cap FROM evaluation_slots WHERE id = NEW.slot_id;
  SELECT count(*) INTO current_count FROM bookings
    WHERE slot_id = NEW.slot_id AND status = 'confirmed';

  IF current_count >= slot_cap THEN
    RAISE EXCEPTION 'This slot is full';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_slot_capacity ON bookings;
CREATE TRIGGER trg_check_slot_capacity
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE PROCEDURE public.check_slot_capacity();

-- =========================================================
-- END v2.26
-- =========================================================
