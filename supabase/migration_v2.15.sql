-- =========================================================
-- NUSkor — Migration v2.15
-- FIX: ambiguous is_ta_of_section() overloads breaking
-- notifications and TA-scoped RLS policies.
--
-- Root cause: v2.12 added is_ta_of_section(uuid, text DEFAULT NULL).
-- The DEFAULT made every existing 1-arg call ambiguous, so Postgres
-- raised "function is_ta_of_section(uuid) is not unique" (42725) at
-- runtime. This broke create_notifications (in-app + push) and every
-- RLS policy calling is_ta_of_section(section_id) for TAs.
--
-- Fix: drop the overload and recreate it WITHOUT a default so the
-- 1-arg form resolves unambiguously to is_ta_of_section(uuid).
-- =========================================================

drop function if exists public.is_ta_of_section(uuid, text);

create or replace function public.is_ta_of_section(p_section_id uuid, p_semester text)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from section_tas st
    where st.section_id = p_section_id
      and st.ta_id = auth.uid()
      and (p_semester is null or st.semester = p_semester)
  );
$$;

-- =========================================================
-- END v2.15
-- =========================================================
