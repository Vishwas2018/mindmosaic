-- =============================================================================
-- MindMosaic Day 13: Exam Attempt Lifecycle - Schema Enhancements
-- Migration: 013_exam_attempt_lifecycle.sql
--
-- This migration adds:
-- 1. Unique constraint to prevent multiple active attempts per student/package
-- 2. Verifies RLS policies are in place
--
-- Prerequisites:
-- - 001_exam_schema.sql (exam_attempts, exam_responses tables)
-- - fix-rls-v3.sql (RLS policies with SECURITY DEFINER functions)
-- =============================================================================

-- =============================================================================
-- SCHEMA VERIFICATION (Already exists from Day 8)
-- =============================================================================
-- 
-- exam_attempts:
--   - id UUID PRIMARY KEY
--   - exam_package_id UUID NOT NULL REFERENCES exam_packages(id)
--   - student_id UUID NOT NULL
--   - status attempt_status ('started', 'submitted')
--   - started_at TIMESTAMPTZ
--   - submitted_at TIMESTAMPTZ (only when status = 'submitted')
--
-- exam_responses:
--   - id UUID PRIMARY KEY
--   - attempt_id UUID NOT NULL REFERENCES exam_attempts(id)
--   - question_id UUID NOT NULL REFERENCES exam_questions(id)
--   - response_type response_type
--   - response_data JSONB
--   - responded_at TIMESTAMPTZ
--   - UNIQUE (attempt_id, question_id)
-- =============================================================================

-- =============================================================================
-- ENHANCEMENT 1: Prevent multiple ACTIVE attempts per student/package
-- =============================================================================
-- A student can only have ONE 'started' attempt per exam package at a time.
-- They can have multiple 'submitted' attempts (for retakes).
-- =============================================================================

-- Create a partial unique index (only for 'started' status)
-- This allows: 1 started + N submitted attempts per student/package
DROP INDEX IF EXISTS exam_attempts_one_active_per_student_package;

CREATE UNIQUE INDEX exam_attempts_one_active_per_student_package
ON exam_attempts (student_id, exam_package_id)
WHERE status = 'started';

COMMENT ON INDEX exam_attempts_one_active_per_student_package IS 
'Ensures only one active (started) attempt per student per exam package. Submitted attempts are unlimited.';

-- =============================================================================
-- ENHANCEMENT 2: Add index for finding active attempts quickly
-- =============================================================================

DROP INDEX IF EXISTS exam_attempts_active_lookup;

CREATE INDEX exam_attempts_active_lookup
ON exam_attempts (student_id, exam_package_id, status)
WHERE status = 'started';

-- =============================================================================
-- VERIFICATION: Ensure RLS is enabled
-- =============================================================================

ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFICATION: List current policies (for manual verification)
-- =============================================================================

-- Run this to verify policies exist:
-- SELECT tablename, policyname, cmd FROM pg_policies 
-- WHERE tablename IN ('exam_attempts', 'exam_responses')
-- ORDER BY tablename, cmd;

-- Expected policies (from fix-rls-v3.sql):
-- exam_attempts:
--   - exam_attempts_select_own (SELECT for students)
--   - exam_attempts_select_admin (SELECT for admins)
--   - exam_attempts_insert_own (INSERT for students)
--   - exam_attempts_update_own (UPDATE for students)
--   - exam_attempts_delete_admin (DELETE for admins only)
--
-- exam_responses:
--   - exam_responses_select_own (SELECT for students via attempt ownership)
--   - exam_responses_select_admin (SELECT for admins)
--   - exam_responses_insert_own (INSERT for students via attempt ownership)
--   - exam_responses_update_own (UPDATE for students via attempt ownership)
--   - exam_responses_delete_admin (DELETE for admins only)

-- =============================================================================
-- HELPER FUNCTION: Check if attempt is still active (not submitted)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_attempt_active(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM exam_attempts
    WHERE id = p_attempt_id
      AND status = 'started'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_attempt_active(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_attempt_active(UUID) IS 
'Returns true if the attempt exists and has not been submitted yet.';

-- =============================================================================
-- HELPER FUNCTION: Check if user owns the attempt
-- =============================================================================

CREATE OR REPLACE FUNCTION public.owns_attempt(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM exam_attempts
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.owns_attempt(UUID) TO authenticated;

COMMENT ON FUNCTION public.owns_attempt(UUID) IS 
'Returns true if the current user owns the specified attempt.';

-- =============================================================================
-- HELPER FUNCTION: Get question's response type
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_question_response_type(p_question_id UUID)
RETURNS response_type
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT response_type FROM exam_questions WHERE id = p_question_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_response_type(UUID) TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================

SELECT 'Day 13 schema enhancements applied successfully' AS status;