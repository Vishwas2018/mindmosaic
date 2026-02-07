-- =============================================================================
-- MindMosaic Day 14 HARDENED: Scoring Engine Schema
-- Migration: 014_scoring_engine_hardened.sql
--
-- SECURITY FIXES:
-- 1. Removed student INSERT policy on exam_results
-- 2. All writes via SECURITY DEFINER functions only
-- 3. Correct answers fetched via SECURITY DEFINER (no service role)
-- 4. Attempt status changes via SECURITY DEFINER only
--
-- Prerequisites:
-- - 001_exam_schema.sql
-- - 013_exam_attempt_lifecycle.sql
-- - fix-rls-v3.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Add 'evaluated' to attempt_status enum (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'evaluated' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attempt_status')
  ) THEN
    ALTER TYPE attempt_status ADD VALUE 'evaluated';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Add 'multi' to response_type enum (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'multi' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'response_type')
  ) THEN
    ALTER TYPE response_type ADD VALUE 'multi';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Add evaluated_at column to exam_attempts (if not exists)
-- =============================================================================

ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;

COMMENT ON COLUMN exam_attempts.evaluated_at IS 'Timestamp when attempt was scored/evaluated';

-- =============================================================================
-- STEP 4: Add pass_mark_percentage to exam_packages (if not exists)
-- =============================================================================

ALTER TABLE exam_packages 
ADD COLUMN IF NOT EXISTS pass_mark_percentage SMALLINT DEFAULT 50;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'exam_packages_pass_mark_range'
  ) THEN
    ALTER TABLE exam_packages 
    ADD CONSTRAINT exam_packages_pass_mark_range 
    CHECK (pass_mark_percentage >= 0 AND pass_mark_percentage <= 100);
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Create exam_results table (if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  breakdown JSONB NOT NULL DEFAULT '[]'::JSONB,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exam_results_one_per_attempt UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS exam_results_attempt_idx ON exam_results (attempt_id);

-- =============================================================================
-- STEP 6: Enable RLS on exam_results
-- =============================================================================

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 7: RLS Policies for exam_results (SECURE - NO STUDENT INSERT)
-- =============================================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "exam_results_select_own" ON exam_results;
DROP POLICY IF EXISTS "exam_results_select_admin" ON exam_results;
DROP POLICY IF EXISTS "exam_results_insert_own" ON exam_results;
DROP POLICY IF EXISTS "exam_results_insert_authenticated" ON exam_results;
DROP POLICY IF EXISTS "exam_results_update_admin" ON exam_results;
DROP POLICY IF EXISTS "exam_results_delete_admin" ON exam_results;

-- Students can ONLY SELECT their own results (NO INSERT!)
CREATE POLICY "exam_results_select_own"
ON exam_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_attempts
    WHERE exam_attempts.id = exam_results.attempt_id
      AND exam_attempts.student_id = auth.uid()
  )
);

-- Admins can SELECT all results
CREATE POLICY "exam_results_select_admin"
ON exam_results FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can UPDATE results (manual review adjustments)
CREATE POLICY "exam_results_update_admin"
ON exam_results FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admins can DELETE results
CREATE POLICY "exam_results_delete_admin"
ON exam_results FOR DELETE
TO authenticated
USING (public.is_admin());

-- NOTE: NO INSERT POLICY FOR STUDENTS OR AUTHENTICATED USERS
-- All inserts MUST go through SECURITY DEFINER function

-- =============================================================================
-- STEP 8: SECURITY DEFINER Function - Get Correct Answers for Scoring
-- =============================================================================
-- This function returns correct answers ONLY if:
-- 1. The attempt exists
-- 2. The attempt belongs to the calling user
-- 3. The attempt status is 'submitted'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_correct_answers_for_scoring(p_attempt_id UUID)
RETURNS TABLE (
  question_id UUID,
  answer_type response_type,
  correct_option_id CHAR(1),
  accepted_answers JSONB,
  case_sensitive BOOLEAN,
  exact_value DOUBLE PRECISION,
  range_min DOUBLE PRECISION,
  range_max DOUBLE PRECISION,
  tolerance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_exam_package_id UUID;
  v_student_id UUID;
  v_status attempt_status;
BEGIN
  -- Fetch attempt details
  SELECT ea.exam_package_id, ea.student_id, ea.status
  INTO v_exam_package_id, v_student_id, v_status
  FROM exam_attempts ea
  WHERE ea.id = p_attempt_id;
  
  -- Validate attempt exists
  IF v_exam_package_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;
  
  -- Validate ownership
  IF v_student_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You do not own this attempt';
  END IF;
  
  -- Validate status is submitted (or evaluated for idempotent re-scoring)
  IF v_status NOT IN ('submitted', 'evaluated') THEN
    RAISE EXCEPTION 'Attempt has not been submitted yet';
  END IF;
  
  -- Return correct answers for this exam's questions
  RETURN QUERY
  SELECT 
    eca.question_id,
    eca.answer_type,
    eca.correct_option_id,
    eca.accepted_answers,
    eca.case_sensitive,
    eca.exact_value,
    eca.range_min,
    eca.range_max,
    eca.tolerance
  FROM exam_correct_answers eca
  INNER JOIN exam_questions eq ON eq.id = eca.question_id
  WHERE eq.exam_package_id = v_exam_package_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_correct_answers_for_scoring(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_correct_answers_for_scoring(UUID) IS 
'Securely returns correct answers for scoring. Validates ownership and submission status.';

-- =============================================================================
-- STEP 9: SECURITY DEFINER Function - Insert Exam Result
-- =============================================================================
-- This function inserts a result ONLY if:
-- 1. The attempt exists
-- 2. The attempt belongs to the calling user
-- 3. The attempt status is 'submitted'
-- 4. No result exists yet (or returns existing for idempotency)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_exam_result(
  p_attempt_id UUID,
  p_total_score INTEGER,
  p_max_score INTEGER,
  p_percentage NUMERIC(5,2),
  p_passed BOOLEAN,
  p_breakdown JSONB
)
RETURNS TABLE (
  result_id UUID,
  attempt_id UUID,
  total_score INTEGER,
  max_score INTEGER,
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  breakdown JSONB,
  evaluated_at TIMESTAMPTZ,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_status attempt_status;
  v_existing_result RECORD;
  v_new_result RECORD;
  v_evaluated_at TIMESTAMPTZ := now();
BEGIN
  -- Fetch attempt details
  SELECT ea.student_id, ea.status
  INTO v_student_id, v_status
  FROM exam_attempts ea
  WHERE ea.id = p_attempt_id;
  
  -- Validate attempt exists
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;
  
  -- Validate ownership
  IF v_student_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You do not own this attempt';
  END IF;
  
  -- Validate status
  IF v_status = 'started' THEN
    RAISE EXCEPTION 'Attempt has not been submitted yet';
  END IF;
  
  -- Check for existing result (idempotency)
  SELECT er.* INTO v_existing_result
  FROM exam_results er
  WHERE er.attempt_id = p_attempt_id;
  
  IF v_existing_result.id IS NOT NULL THEN
    -- Return existing result
    RETURN QUERY SELECT 
      v_existing_result.id,
      v_existing_result.attempt_id,
      v_existing_result.total_score,
      v_existing_result.max_score,
      v_existing_result.percentage,
      v_existing_result.passed,
      v_existing_result.breakdown,
      v_existing_result.evaluated_at,
      false AS is_new;
    RETURN;
  END IF;
  
  -- Insert new result
  INSERT INTO exam_results (
    attempt_id,
    total_score,
    max_score,
    percentage,
    passed,
    breakdown,
    evaluated_at
  ) VALUES (
    p_attempt_id,
    p_total_score,
    p_max_score,
    p_percentage,
    p_passed,
    p_breakdown,
    v_evaluated_at
  )
  RETURNING * INTO v_new_result;
  
  -- Return new result
  RETURN QUERY SELECT 
    v_new_result.id,
    v_new_result.attempt_id,
    v_new_result.total_score,
    v_new_result.max_score,
    v_new_result.percentage,
    v_new_result.passed,
    v_new_result.breakdown,
    v_new_result.evaluated_at,
    true AS is_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_exam_result(UUID, INTEGER, INTEGER, NUMERIC, BOOLEAN, JSONB) TO authenticated;

COMMENT ON FUNCTION public.insert_exam_result IS 
'Securely inserts exam result. Validates ownership and prevents duplicates (idempotent).';

-- =============================================================================
-- STEP 10: SECURITY DEFINER Function - Mark Attempt as Evaluated
-- =============================================================================
-- This function updates attempt status ONLY if:
-- 1. The attempt exists
-- 2. The attempt belongs to the calling user
-- 3. The attempt status is 'submitted'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_attempt_evaluated(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_status attempt_status;
BEGIN
  -- Fetch attempt details
  SELECT ea.student_id, ea.status
  INTO v_student_id, v_status
  FROM exam_attempts ea
  WHERE ea.id = p_attempt_id;
  
  -- Validate attempt exists
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;
  
  -- Validate ownership
  IF v_student_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You do not own this attempt';
  END IF;
  
  -- Skip if already evaluated
  IF v_status = 'evaluated' THEN
    RETURN true;
  END IF;
  
  -- Validate status is submitted
  IF v_status != 'submitted' THEN
    RAISE EXCEPTION 'Attempt has not been submitted yet';
  END IF;
  
  -- Update status
  UPDATE exam_attempts
  SET status = 'evaluated',
      evaluated_at = now()
  WHERE id = p_attempt_id;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_attempt_evaluated(UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_attempt_evaluated(UUID) IS 
'Securely marks attempt as evaluated. Validates ownership and submission status.';

-- =============================================================================
-- STEP 11: Helper function to check if result exists
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_attempt_evaluated(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM exam_results
    WHERE attempt_id = p_attempt_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_attempt_evaluated(UUID) TO authenticated;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify NO INSERT policy exists for students
SELECT 'RLS Policies on exam_results:' AS info;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'exam_results'
ORDER BY cmd;

-- Verify SECURITY DEFINER functions exist
SELECT 'SECURITY DEFINER functions:' AS info;
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN (
  'get_correct_answers_for_scoring',
  'insert_exam_result',
  'mark_attempt_evaluated',
  'is_attempt_evaluated'
);

-- Verify enum values
SELECT 'attempt_status values:' AS info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attempt_status');

SELECT 'response_type values:' AS info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'response_type');

SELECT '✅ Day 14 HARDENED schema applied successfully' AS status;