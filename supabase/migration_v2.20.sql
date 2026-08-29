-- ============================================================
-- MIGRATION v2.20 — Assessment Status Controls Mark Visibility
-- ============================================================
-- Students can only see marks for assessments with status = 'published'.
-- Draft and Archived marks are hidden from students at the DB/RLS level.
-- TAs and Admins retain full access to all marks regardless of status.
-- ============================================================

-- ============================================================
-- 1. MARKS RLS — Restrict student SELECT to published assessments
-- ============================================================
-- Students see marks only when the parent assessment is published.
-- TAs and Admins continue to see all marks (is_admin / is_ta_of_student).

DROP POLICY IF EXISTS "marks_select_own_admin_or_ta" ON marks;
CREATE POLICY "marks_select_own_admin_or_ta" ON marks
  FOR SELECT USING (
    is_admin()
    OR is_ta_of_student(student_id)
    OR (
      student_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM assessments a
        WHERE a.id = marks.assessment_id
          AND a.status = 'published'
      )
    )
  );

-- ============================================================
-- 2. get_assessment_leaderboard — non SECURITY DEFINER
--    RLS applies: students only see marks for published assessments.
--    TAs/admins bypass RLS so they see everything.
-- ============================================================
DROP FUNCTION IF EXISTS public.get_assessment_leaderboard(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_assessment_leaderboard(
  p_assessment_id uuid,
  p_section_id uuid
)
RETURNS TABLE (
  registration_no text,
  obtained numeric,
  total_marks numeric,
  percent numeric,
  rank bigint
)
LANGUAGE sql STABLE
AS $$
  WITH scored AS (
    SELECT s.id, s.registration_no,
           COALESCE(m.obtained, 0) AS obtained,
           a.total_marks,
           CASE WHEN a.total_marks > 0
             THEN ROUND((COALESCE(m.obtained, 0) / a.total_marks) * 100, 1)
             ELSE 0
           END AS pct
    FROM students s
    JOIN enrollments e ON e.student_id = s.id AND e.section_id = p_section_id
    LEFT JOIN marks m ON m.student_id = s.id AND m.assessment_id = p_assessment_id
    JOIN assessments a ON a.id = p_assessment_id
    WHERE s.archived_at IS NULL
  ),
  ranked AS (
    SELECT registration_no, obtained, total_marks, pct,
           RANK() OVER (ORDER BY obtained DESC, registration_no) AS rank
    FROM scored
  )
  SELECT registration_no, obtained, total_marks, pct, rank
  FROM ranked
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.get_assessment_leaderboard(uuid, uuid)
  TO authenticated;

-- ============================================================
-- 3. get_leaderboard (overall section) — non SECURITY DEFINER
--    Includes only marks from published assessments in totals.
-- ============================================================
DROP FUNCTION IF EXISTS public.get_leaderboard(uuid);
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_section_id uuid)
RETURNS TABLE (registration_no text, total numeric, percent numeric, rank bigint)
LANGUAGE sql STABLE
AS $$
  WITH scored AS (
    SELECT s.id, s.registration_no,
           COALESCE(SUM(m.obtained), 0) AS total,
           COALESCE(SUM(a.total_marks), 0) AS possible
    FROM students s
    JOIN enrollments e ON e.student_id = s.id AND e.section_id = p_section_id
    LEFT JOIN marks m ON m.student_id = s.id
    LEFT JOIN assessments a ON a.id = m.assessment_id
      AND a.section_id = p_section_id
      AND a.status = 'published'
    WHERE s.archived_at IS NULL
    GROUP BY s.id, s.registration_no
  ),
  ranked AS (
    SELECT registration_no,
           total,
           CASE WHEN possible > 0 THEN ROUND((total / possible) * 100, 1) ELSE 0 END AS percent,
           RANK() OVER (ORDER BY total DESC, registration_no) AS rank
    FROM scored
  )
  SELECT registration_no, total, percent, rank
  FROM ranked
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid)
  TO authenticated;

-- ============================================================
-- 4. get_assessment_stats — non SECURITY DEFINER, published only
-- ============================================================
DROP FUNCTION IF EXISTS public.get_assessment_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_assessment_stats(p_assessment_id uuid)
RETURNS TABLE (avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    ROUND(AVG(m.obtained)::NUMERIC, 2),
    MIN(m.obtained),
    MAX(m.obtained),
    COUNT(*)
  FROM marks m
  JOIN students s ON s.id = m.student_id AND s.archived_at IS NULL
  JOIN assessments a ON a.id = m.assessment_id
  WHERE m.assessment_id = p_assessment_id
    AND a.status = 'published';
$$;

-- ============================================================
-- 5. get_assessment_stats_many — non SECURITY DEFNER, published only
-- ============================================================
DROP FUNCTION IF EXISTS public.get_assessment_stats_many(uuid[]);
CREATE OR REPLACE FUNCTION public.get_assessment_stats_many(p_assessment_ids uuid[])
RETURNS TABLE (assessment_id uuid, avg_marks numeric, min_marks numeric, max_marks numeric, total_students bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.assessment_id,
    ROUND(AVG(m.obtained)::NUMERIC, 2),
    MIN(m.obtained),
    MAX(m.obtained),
    COUNT(*)
  FROM marks m
  JOIN students s ON s.id = m.student_id AND s.archived_at IS NULL
  JOIN assessments a ON a.id = m.assessment_id
  WHERE m.assessment_id = ANY(p_assessment_ids)
    AND a.status = 'published'
  GROUP BY m.assessment_id;
$$;

-- ============================================================
-- 6. Trigger: Auto-notify students when assessment goes draft → published
-- ============================================================
-- When a TA or admin changes an assessment status to 'published',
-- automatically create in-app + push notifications for enrolled students.

CREATE OR REPLACE FUNCTION public.on_assessment_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published'
     AND (OLD.status IS NULL OR OLD.status <> 'published') THEN
    -- Only notify if marks exist for this assessment
    IF EXISTS (SELECT 1 FROM marks m WHERE m.assessment_id = NEW.id) THEN
      PERFORM create_notifications('marks_released', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assessment_published ON assessments;
CREATE TRIGGER trg_assessment_published
  AFTER UPDATE OF status ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION on_assessment_published();

-- ============================================================
-- Done. Student-facing mark visibility now follows:
--   draft    → hidden
--   published → visible
--   archived  → hidden
-- ============================================================
