-- =========================================================
-- NUSkor — Migration v2.4 (BUGFIX)
-- v2.3 added archived_by / deleted_by columns with FK
-- references to profiles. That created a SECOND relationship
-- between students->profiles and announcements->profiles,
-- which makes PostgREST embeds ambiguous:
--   "Could not embed because more than one relationship was
--    found for 'students' and 'profiles'"
-- This broke marks, bookings, exports and the email function.
-- Fix: drop the FK constraints (audit columns keep their
-- plain uuid values; integrity is enforced by the app).
-- Idempotent. Run in the Supabase SQL Editor.
-- =========================================================

alter table students
  drop constraint if exists students_archived_by_fkey;

alter table announcements
  drop constraint if exists announcements_deleted_by_fkey;

-- =========================================================
-- END v2.4
-- =========================================================