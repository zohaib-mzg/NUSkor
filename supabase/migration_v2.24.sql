-- Migration v2.24: Add leaderboard_visible toggle to course_sections
-- TA can show/hide leaderboard for students per section.

ALTER TABLE public.course_sections
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.course_sections.leaderboard_visible
  IS 'When false, students in this section cannot see the leaderboard or per-assessment rankings.';

-- Allow TAs to update leaderboard_visible on their own sections
DROP POLICY IF EXISTS "sections_ta_update_leaderboard" ON public.course_sections;
CREATE POLICY "sections_ta_update_leaderboard" ON public.course_sections
  FOR UPDATE USING (is_ta_of_section(id))
  WITH CHECK (is_ta_of_section(id));
