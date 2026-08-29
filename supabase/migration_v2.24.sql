-- Migration v2.24: Add leaderboard_visible toggle to course_sections
-- TA can show/hide leaderboard for students per section.

ALTER TABLE public.course_sections
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.course_sections.leaderboard_visible
  IS 'When false, students in this section cannot see the leaderboard or per-assessment rankings.';
