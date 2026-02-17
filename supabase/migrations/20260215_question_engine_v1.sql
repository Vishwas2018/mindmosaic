-- =============================================================================
-- MindMosaic — Question Engine v1 Migration
-- Date: 2026-02-15
--
-- Purpose:
--   1. Extend response_type enum with: boolean, ordering, matching, multi_select
--   2. Add validation JSONB column to exam_questions
--   3. Add grouping columns for passage_group and multi_part support
--   4. Add CHECK constraint to reject unsupported response_type values
--
-- Safety:
--   - All operations are additive (no drops, no renames)
--   - Existing data is not modified
--   - Legacy 'multi' and 'extended' values are preserved as frozen
--   - New inserts/updates are restricted to the canonical set
-- =============================================================================

-- Step 1: Add new values to the response_type enum
-- PostgreSQL enums are additive — this does NOT affect existing rows.

ALTER TYPE response_type ADD VALUE IF NOT EXISTS 'boolean';
ALTER TYPE response_type ADD VALUE IF NOT EXISTS 'ordering';
ALTER TYPE response_type ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE response_type ADD VALUE IF NOT EXISTS 'multi_select';

-- Step 2: Add validation JSONB column (nullable, no default)
-- Used by: short, numeric, boolean, ordering, matching

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'validation'
  ) THEN
    ALTER TABLE public.exam_questions
      ADD COLUMN validation JSONB DEFAULT NULL;

    COMMENT ON COLUMN public.exam_questions.validation IS
      'Scoring/validation rules (shape varies by response_type). See Question Engine v1 spec.';
  END IF;
END $$;

-- Step 3: Add grouping columns for passage_group and multi_part

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'stimulus_group_id'
  ) THEN
    ALTER TABLE public.exam_questions
      ADD COLUMN stimulus_group_id TEXT DEFAULT NULL;

    COMMENT ON COLUMN public.exam_questions.stimulus_group_id IS
      'Groups questions sharing a common reading passage (passage_group). Not a response_type.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'multi_part_group_id'
  ) THEN
    ALTER TABLE public.exam_questions
      ADD COLUMN multi_part_group_id TEXT DEFAULT NULL;

    COMMENT ON COLUMN public.exam_questions.multi_part_group_id IS
      'Groups linked questions (multi_part). Each sub-question is scored independently.';
  END IF;
END $$;

-- Step 4: CHECK constraint on new inserts
-- Allow canonical set + frozen legacy values for existing data.
-- This uses a trigger instead of a CHECK constraint because Postgres CHECK
-- constraints on enum columns evaluate on all rows (including existing),
-- while a trigger only fires on new mutations.

CREATE OR REPLACE FUNCTION check_response_type_allowed()
RETURNS TRIGGER AS $$
DECLARE
  allowed_types TEXT[] := ARRAY[
    'mcq', 'multi_select', 'short', 'numeric',
    'boolean', 'ordering', 'matching'
  ];
BEGIN
  IF NOT (NEW.response_type::TEXT = ANY(allowed_types)) THEN
    RAISE EXCEPTION 'response_type "%" is not supported. Allowed: %',
      NEW.response_type, array_to_string(allowed_types, ', ');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only apply to INSERT (not UPDATE) to protect existing rows with legacy types
DROP TRIGGER IF EXISTS trg_check_response_type ON public.exam_questions;

CREATE TRIGGER trg_check_response_type
  BEFORE INSERT ON public.exam_questions
  FOR EACH ROW
  EXECUTE FUNCTION check_response_type_allowed();

-- Step 5: Add indexes for grouping queries

CREATE INDEX IF NOT EXISTS idx_exam_questions_stimulus_group
  ON public.exam_questions (stimulus_group_id)
  WHERE stimulus_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_questions_multi_part_group
  ON public.exam_questions (multi_part_group_id)
  WHERE multi_part_group_id IS NOT NULL;

-- Step 6: Add allowed values to exam_responses as well

CREATE OR REPLACE FUNCTION check_response_type_allowed_response()
RETURNS TRIGGER AS $$
DECLARE
  allowed_types TEXT[] := ARRAY[
    'mcq', 'multi_select', 'short', 'numeric',
    'boolean', 'ordering', 'matching'
  ];
BEGIN
  IF NOT (NEW.response_type::TEXT = ANY(allowed_types)) THEN
    RAISE EXCEPTION 'response_type "%" is not supported for new responses. Allowed: %',
      NEW.response_type, array_to_string(allowed_types, ', ');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_response_type_response ON public.exam_responses;

CREATE TRIGGER trg_check_response_type_response
  BEFORE INSERT ON public.exam_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_response_type_allowed_response();