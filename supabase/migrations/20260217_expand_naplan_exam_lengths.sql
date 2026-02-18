-- =============================================================================
-- MindMosaic - Expand NAPLAN practice packages from 10 to 20 questions
-- Migration: 20260217_expand_naplan_exam_lengths.sql
--
-- Purpose:
--   Remove the practical 10-question cap in seeded NAPLAN practice packages by
--   cloning questions 1-10 to 11-20 for packages that currently have exactly
--   10 questions and no existing questions beyond sequence 10.
--
-- Safety:
--   - Idempotent: only clones where sequence 11-20 do not already exist.
--   - Does not modify existing question IDs.
--   - Recalculates total_marks from actual question rows after cloning.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'validation'
  ) THEN
    ALTER TABLE public.exam_questions ADD COLUMN validation JSONB DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'stimulus'
  ) THEN
    ALTER TABLE public.exam_questions ADD COLUMN stimulus JSONB DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'stimulus_group_id'
  ) THEN
    ALTER TABLE public.exam_questions ADD COLUMN stimulus_group_id TEXT DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'multi_part_group_id'
  ) THEN
    ALTER TABLE public.exam_questions ADD COLUMN multi_part_group_id TEXT DEFAULT NULL;
  END IF;
END $$;

CREATE TEMP TABLE tmp_clone_map (
  old_question_id UUID PRIMARY KEY,
  new_question_id UUID NOT NULL,
  exam_package_id UUID NOT NULL,
  new_sequence_number SMALLINT NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_clone_map (
  old_question_id,
  new_question_id,
  exam_package_id,
  new_sequence_number
)
SELECT
  q.id AS old_question_id,
  gen_random_uuid() AS new_question_id,
  q.exam_package_id,
  (q.sequence_number + 10)::SMALLINT AS new_sequence_number
FROM exam_questions q
INNER JOIN exam_packages p ON p.id = q.exam_package_id
WHERE
  p.assessment_type = 'naplan'
  AND p.title LIKE 'Year % NAPLAN Practice -- Exam %'
  AND q.sequence_number BETWEEN 1 AND 10
  AND (
    SELECT COUNT(*)
    FROM exam_questions q_count
    WHERE q_count.exam_package_id = q.exam_package_id
  ) = 10
  AND NOT EXISTS (
    SELECT 1
    FROM exam_questions q_existing
    WHERE
      q_existing.exam_package_id = q.exam_package_id
      AND q_existing.sequence_number = q.sequence_number + 10
  );

INSERT INTO exam_questions (
  id,
  exam_package_id,
  sequence_number,
  difficulty,
  response_type,
  marks,
  prompt_blocks,
  media_references,
  tags,
  hint,
  validation,
  stimulus,
  stimulus_group_id,
  multi_part_group_id
)
SELECT
  m.new_question_id,
  q.exam_package_id,
  m.new_sequence_number,
  q.difficulty,
  q.response_type,
  q.marks,
  q.prompt_blocks,
  q.media_references,
  q.tags,
  q.hint,
  q.validation,
  q.stimulus,
  q.stimulus_group_id,
  q.multi_part_group_id
FROM tmp_clone_map m
INNER JOIN exam_questions q ON q.id = m.old_question_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO exam_question_options (
  question_id,
  option_id,
  content,
  media_reference
)
SELECT
  m.new_question_id,
  o.option_id,
  o.content,
  o.media_reference
FROM tmp_clone_map m
INNER JOIN exam_question_options o ON o.question_id = m.old_question_id
ON CONFLICT (question_id, option_id) DO NOTHING;

INSERT INTO exam_correct_answers (
  question_id,
  answer_type,
  correct_option_id,
  accepted_answers,
  case_sensitive,
  exact_value,
  range_min,
  range_max,
  tolerance,
  unit,
  rubric,
  sample_response
)
SELECT
  m.new_question_id,
  a.answer_type,
  a.correct_option_id,
  a.accepted_answers,
  a.case_sensitive,
  a.exact_value,
  a.range_min,
  a.range_max,
  a.tolerance,
  a.unit,
  a.rubric,
  a.sample_response
FROM tmp_clone_map m
INNER JOIN exam_correct_answers a ON a.question_id = m.old_question_id
ON CONFLICT (question_id) DO NOTHING;

UPDATE exam_packages p
SET total_marks = totals.total_marks
FROM (
  SELECT
    q.exam_package_id,
    COALESCE(SUM(q.marks), 0)::SMALLINT AS total_marks
  FROM exam_questions q
  GROUP BY q.exam_package_id
) totals
WHERE
  p.id = totals.exam_package_id
  AND p.id IN (SELECT DISTINCT exam_package_id FROM tmp_clone_map);

COMMIT;
