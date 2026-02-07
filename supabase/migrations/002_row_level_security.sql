-- =============================================================================
-- MindMosaic Row Level Security Policies
-- Migration: 002_row_level_security.sql
--
-- This migration defines RLS policies for the 7 exam-related tables
-- defined in 001_exam_schema.sql.
--
-- SCOPE: This migration covers ONLY the Day 8 tables. Identity tables
-- (profiles, parent_student) belong to a future Auth/User Model phase.
--
-- ROLE SOURCE: Roles are read from JWT claims via auth.jwt() ->> 'role'.
-- The application must set custom claims during authentication.
--
-- CORRECT ANSWER VISIBILITY: Option A — Strict Assessment Integrity
-- Students and parents have NO access to exam_correct_answers.
-- Answers are exposed only via controlled application endpoints after submission.
--
-- =============================================================================

-- =============================================================================
-- Helper Functions (JWT-based, no table dependencies)
-- =============================================================================

-- Get current user's role from JWT claims
-- Returns NULL if no role claim exists
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'role';
$$;

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt() ->> 'role', '') = 'admin';
$$;

-- Check if current user is a student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt() ->> 'role', '') = 'student';
$$;

-- Check if current user is a parent
CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt() ->> 'role', '') = 'parent';
$$;

-- =============================================================================
-- Enable RLS on All Day 8 Tables
-- =============================================================================

ALTER TABLE exam_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_correct_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- EXAM_PACKAGES TABLE POLICIES
-- =============================================================================
-- Students: SELECT published only
-- Parents: SELECT published only
-- Admins: ALL (full CRUD)
-- =============================================================================

-- Students and parents can read published packages only
CREATE POLICY exam_packages_select_published ON exam_packages
  FOR SELECT
  USING (
    status = 'published'
    AND (public.is_student() OR public.is_parent())
  );

-- Admins can read all packages (including drafts)
CREATE POLICY exam_packages_select_admin ON exam_packages
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert packages
CREATE POLICY exam_packages_insert_admin ON exam_packages
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update packages
CREATE POLICY exam_packages_update_admin ON exam_packages
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete packages
CREATE POLICY exam_packages_delete_admin ON exam_packages
  FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- EXAM_MEDIA_ASSETS TABLE POLICIES
-- =============================================================================
-- Students: SELECT where parent package is published
-- Parents: SELECT where parent package is published
-- Admins: ALL (full CRUD)
-- =============================================================================

-- Students and parents can read assets for published packages only
CREATE POLICY exam_media_assets_select_published ON exam_media_assets
  FOR SELECT
  USING (
    (public.is_student() OR public.is_parent())
    AND EXISTS (
      SELECT 1 FROM exam_packages
      WHERE exam_packages.id = exam_media_assets.exam_package_id
        AND exam_packages.status = 'published'
    )
  );

-- Admins can read all assets
CREATE POLICY exam_media_assets_select_admin ON exam_media_assets
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert assets
CREATE POLICY exam_media_assets_insert_admin ON exam_media_assets
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update assets
CREATE POLICY exam_media_assets_update_admin ON exam_media_assets
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete assets
CREATE POLICY exam_media_assets_delete_admin ON exam_media_assets
  FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- EXAM_QUESTIONS TABLE POLICIES
-- =============================================================================
-- Students: SELECT where parent package is published
-- Parents: SELECT where parent package is published
-- Admins: ALL (full CRUD)
-- =============================================================================

-- Students and parents can read questions for published packages only
CREATE POLICY exam_questions_select_published ON exam_questions
  FOR SELECT
  USING (
    (public.is_student() OR public.is_parent())
    AND EXISTS (
      SELECT 1 FROM exam_packages
      WHERE exam_packages.id = exam_questions.exam_package_id
        AND exam_packages.status = 'published'
    )
  );

-- Admins can read all questions
CREATE POLICY exam_questions_select_admin ON exam_questions
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert questions
CREATE POLICY exam_questions_insert_admin ON exam_questions
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update questions
CREATE POLICY exam_questions_update_admin ON exam_questions
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete questions
CREATE POLICY exam_questions_delete_admin ON exam_questions
  FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- EXAM_QUESTION_OPTIONS TABLE POLICIES
-- =============================================================================
-- Students: SELECT where parent question's package is published
-- Parents: SELECT where parent question's package is published
-- Admins: ALL (full CRUD)
-- =============================================================================

-- Students and parents can read options for published packages only
CREATE POLICY exam_question_options_select_published ON exam_question_options
  FOR SELECT
  USING (
    (public.is_student() OR public.is_parent())
    AND EXISTS (
      SELECT 1 FROM exam_questions
      JOIN exam_packages ON exam_packages.id = exam_questions.exam_package_id
      WHERE exam_questions.id = exam_question_options.question_id
        AND exam_packages.status = 'published'
    )
  );

-- Admins can read all options
CREATE POLICY exam_question_options_select_admin ON exam_question_options
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert options
CREATE POLICY exam_question_options_insert_admin ON exam_question_options
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update options
CREATE POLICY exam_question_options_update_admin ON exam_question_options
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete options
CREATE POLICY exam_question_options_delete_admin ON exam_question_options
  FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- EXAM_CORRECT_ANSWERS TABLE POLICIES
-- =============================================================================
-- STRICT ASSESSMENT INTEGRITY MODEL (Option A)
--
-- Students: NO ACCESS
-- Parents: NO ACCESS
-- Admins: ALL (full CRUD)
--
-- Rationale: Correct answers must not be exposed to students or parents
-- at the database level. Answer visibility after submission must be
-- controlled via application endpoints (edge functions) that can enforce
-- submission status checks.
-- =============================================================================

-- Admins can read all answers
CREATE POLICY exam_correct_answers_select_admin ON exam_correct_answers
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert answers
CREATE POLICY exam_correct_answers_insert_admin ON exam_correct_answers
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update answers
CREATE POLICY exam_correct_answers_update_admin ON exam_correct_answers
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete answers
CREATE POLICY exam_correct_answers_delete_admin ON exam_correct_answers
  FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- EXAM_ATTEMPTS TABLE POLICIES
-- =============================================================================
-- Students: SELECT own attempts, INSERT own attempts, UPDATE own attempts
-- Parents: NO ACCESS (requires identity linking, deferred to Auth phase)
-- Admins: SELECT all attempts (read-only)
--
-- NOTE: Parent access to student attempts requires a parent_student
-- relationship table, which is out of scope for Day 9. This will be
-- implemented in the Auth/User Model phase.
-- =============================================================================

-- Students can read their own attempts
CREATE POLICY exam_attempts_select_own ON exam_attempts
  FOR SELECT
  USING (
    public.is_student()
    AND student_id = auth.uid()
  );

-- Admins can read all attempts
CREATE POLICY exam_attempts_select_admin ON exam_attempts
  FOR SELECT
  USING (public.is_admin());

-- Students can create their own attempts only
CREATE POLICY exam_attempts_insert_own ON exam_attempts
  FOR INSERT
  WITH CHECK (
    public.is_student()
    AND student_id = auth.uid()
  );

-- Students can update their own attempts only (e.g., submit)
CREATE POLICY exam_attempts_update_own ON exam_attempts
  FOR UPDATE
  USING (
    public.is_student()
    AND student_id = auth.uid()
  )
  WITH CHECK (
    public.is_student()
    AND student_id = auth.uid()
  );

-- NO DELETE POLICY: Attempts are permanent audit records

-- =============================================================================
-- EXAM_RESPONSES TABLE POLICIES
-- =============================================================================
-- Students: SELECT own responses, INSERT own responses, UPDATE own responses
-- Parents: NO ACCESS
-- Admins: SELECT all responses (read-only)
--
-- Ownership is determined via the parent exam_attempts record.
-- =============================================================================

-- Students can read their own responses (via attempt ownership)
CREATE POLICY exam_responses_select_own ON exam_responses
  FOR SELECT
  USING (
    public.is_student()
    AND EXISTS (
      SELECT 1 FROM exam_attempts
      WHERE exam_attempts.id = exam_responses.attempt_id
        AND exam_attempts.student_id = auth.uid()
    )
  );

-- Admins can read all responses
CREATE POLICY exam_responses_select_admin ON exam_responses
  FOR SELECT
  USING (public.is_admin());

-- Students can insert responses for their own attempts only
CREATE POLICY exam_responses_insert_own ON exam_responses
  FOR INSERT
  WITH CHECK (
    public.is_student()
    AND EXISTS (
      SELECT 1 FROM exam_attempts
      WHERE exam_attempts.id = exam_responses.attempt_id
        AND exam_attempts.student_id = auth.uid()
    )
  );

-- Students can update responses for their own attempts only
CREATE POLICY exam_responses_update_own ON exam_responses
  FOR UPDATE
  USING (
    public.is_student()
    AND EXISTS (
      SELECT 1 FROM exam_attempts
      WHERE exam_attempts.id = exam_responses.attempt_id
        AND exam_attempts.student_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_student()
    AND EXISTS (
      SELECT 1 FROM exam_attempts
      WHERE exam_attempts.id = exam_responses.attempt_id
        AND exam_attempts.student_id = auth.uid()
    )
  );

-- NO DELETE POLICY: Responses are permanent audit records
-- NO PARENT ACCESS: Parents cannot view individual responses

-- =============================================================================
-- Documentation Comments
-- =============================================================================

COMMENT ON FUNCTION public.get_user_role() IS 'Returns the role from JWT claims. Returns NULL if not set.';
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if JWT role claim is admin.';
COMMENT ON FUNCTION public.is_student() IS 'Returns true if JWT role claim is student.';
COMMENT ON FUNCTION public.is_parent() IS 'Returns true if JWT role claim is parent.';
