-- =========================================================
-- NUSkor — Migration v2.13
-- Add course, semester, year fields to ta_applications.
-- =========================================================

alter table public.ta_applications
  add column if not exists course_code text;

alter table public.ta_applications
  add column if not exists semester text;

alter table public.ta_applications
  add column if not exists year integer;

alter table public.ta_applications
  add column if not exists notes text;

-- =========================================================
-- END v2.13
-- =========================================================
