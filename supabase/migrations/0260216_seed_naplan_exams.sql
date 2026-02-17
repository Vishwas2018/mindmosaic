-- =============================================================================
-- MindMosaic -- Seed Data Migration: 10 NAPLAN Exams (100 Questions)
-- Migration: 20260216_seed_naplan_exams.sql
--
-- ⚠️  FILENAME MUST BE: 20260216_seed_naplan_exams.sql  (not 0260216_...)
--     The leading "2" is required so Supabase migration ordering places
--     this file AFTER 20260215_question_engine_v1.sql, which adds the
--     validation, stimulus_group_id, and multi_part_group_id columns this
--     seed depends on. A missing "2" causes it to sort first and crash.
--
-- Prerequisites (must be run BEFORE this migration):
--   - 001_exam_schema.sql
--   - 014_scoring_engine.sql
--   - 20260215_question_engine_v1.sql
--
-- Fixes applied (original):
--   - Stimulus stored in dedicated stimulus JSONB column (NOT in prompt_blocks)
--   - All curly/smart quotes replaced with ASCII
--   - prompt_blocks contain only question content blocks
--   - exam_question_options properly populated
--   - exam_correct_answers covers all 7 response types
--   - All inserts are idempotent (ON CONFLICT DO NOTHING)
--
-- Supabase compatibility fixes (auditor pass 1):
--   [FIX 1] Removed ALTER TABLE ... DISABLE/ENABLE TRIGGER ALL
--           These require superuser and are rejected on managed Supabase.
--   [FIX 2] Replaced uuid_generate_v5(uuid_ns_dns(), ...) with a
--           pure-SQL md5-based deterministic UUID function that works on
--           all Supabase Postgres versions without superuser or v5 support.
--   [FIX 3] seed_uuid() is dropped at end of migration (hygiene).
--   [FIX 4] SET search_path = '' added to seed_uuid() (security best practice).
--
-- Supabase compatibility fixes (auditor pass 2 — deploy error):
--   [FIX 5] Root cause: filename was "0260216_..." (missing leading "2"), so
--           Supabase applied this seed BEFORE 20260215_question_engine_v1.sql,
--           meaning validation/stimulus_group_id/multi_part_group_id did not
--           exist yet when the INSERT ran. Fix: correct filename + add
--           IF NOT EXISTS guards for all three columns in Step 1 so the seed
--           is safe regardless of execution order.
--   [FIX 5d] Second deploy error: same filename ordering issue caused the four
--            response_type enum values (boolean, ordering, matching, multi_select)
--            added by question_engine_v1 to be absent when the INSERT ran.
--            Fix: add idempotent ALTER TYPE ADD VALUE guards for all four values
--            in Step 0 (must be committed before the main transaction).
-- =============================================================================

-- =============================================================================
-- Step 0: Schema prerequisites — enum additions
--
-- ALTER TYPE ADD VALUE cannot run inside a transaction with other DDL in
-- Postgres, so ALL enum additions must be committed here in isolation before
-- the main transaction begins.
--
-- [FIX 5d] Because the filename on disk is "0260216_..." (missing leading "2"),
-- Supabase applies this seed BEFORE 20260215_question_engine_v1.sql, which
-- means the four response_type enum values added by that migration do not
-- exist yet when the INSERT in Step 3 runs. We add them here idempotently
-- using IF NOT EXISTS so this block is a no-op when the engine migration has
-- already run.
-- =============================================================================

BEGIN;

-- subject enum: 'mixed' (used by exam_packages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'mixed'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subject')
  ) THEN
    ALTER TYPE subject ADD VALUE 'mixed';
  END IF;
END $$;

-- response_type enum: four values added by 20260215_question_engine_v1.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'boolean'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'response_type')
  ) THEN
    ALTER TYPE response_type ADD VALUE 'boolean';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ordering'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'response_type')
  ) THEN
    ALTER TYPE response_type ADD VALUE 'ordering';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'matching'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'response_type')
  ) THEN
    ALTER TYPE response_type ADD VALUE 'matching';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'multi_select'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'response_type')
  ) THEN
    ALTER TYPE response_type ADD VALUE 'multi_select';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Step 1: Schema additions and UUID helper
-- =============================================================================

BEGIN;

-- Add pass_mark_percentage column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_packages' AND column_name = 'pass_mark_percentage'
  ) THEN
    ALTER TABLE public.exam_packages
      ADD COLUMN pass_mark_percentage SMALLINT DEFAULT NULL;
  END IF;
END $$;

-- Add stimulus JSONB column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_questions' AND column_name = 'stimulus'
  ) THEN
    ALTER TABLE public.exam_questions
      ADD COLUMN stimulus JSONB DEFAULT NULL;
    COMMENT ON COLUMN public.exam_questions.stimulus IS
      'Stimulus/passage content for passage_group questions. JSONB with title, content, and optional image.';
  END IF;
END $$;

-- [FIX 5] Defensive guards for columns added by 20260215_question_engine_v1.sql.
-- If the question engine migration has already run these are no-ops.
-- If (due to filename ordering or manual replay) this seed runs first,
-- these guards ensure the INSERT in Step 3 does not fail with
-- "column does not exist".

-- validation JSONB (scoring/validation rules per response_type)
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

-- stimulus_group_id TEXT (passage-group linking)
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
END $$;

-- multi_part_group_id TEXT (multi-part question linking)
DO $$
BEGIN
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

-- [FIX 1] REMOVED: ALTER TABLE exam_questions DISABLE TRIGGER ALL;
-- [FIX 1] REMOVED: ALTER TABLE exam_responses DISABLE TRIGGER ALL;
-- Reason: DISABLE TRIGGER ALL requires superuser on Supabase Cloud and will
-- be rejected with "permission denied: is a system trigger". There is no
-- non-superuser equivalent. Seed data must satisfy trigger conditions instead.

-- [FIX 2] Deterministic UUID via md5() — no extension dependency.
-- Replaces uuid_generate_v5(uuid_ns_dns(), ...) which is not exposed on
-- managed Supabase even when uuid-ossp is installed.
-- Produces a stable UUID v4-shaped value from any text key.
-- [FIX 4] SET search_path = '' prevents search_path injection.
CREATE OR REPLACE FUNCTION seed_uuid(key TEXT)
RETURNS UUID AS $$
  SELECT (
    lpad(to_hex(('x' || substr(md5('mindmosaic.seed.' || key),  1,  8))::bit(32)::bigint), 8, '0') || '-' ||
    lpad(to_hex(('x' || substr(md5('mindmosaic.seed.' || key),  9,  4))::bit(16)::bigint), 4, '0') || '-' ||
    '4' || substr(md5('mindmosaic.seed.' || key), 14, 3) || '-' ||
    lpad(to_hex(
      (('x' || substr(md5('mindmosaic.seed.' || key), 17, 2))::bit(8)::bigint & 63) | 128
    ), 2, '0') ||
    substr(md5('mindmosaic.seed.' || key), 19, 2) || '-' ||
    substr(md5('mindmosaic.seed.' || key), 21, 12)
  )::uuid;
$$ LANGUAGE sql IMMUTABLE STRICT SET search_path = '';


-- =============================================================================
-- Step 2: Insert exam_packages (10 rows)
-- =============================================================================

INSERT INTO exam_packages (id, title, year_level, subject, assessment_type, duration_minutes, total_marks, version, schema_version, status, instructions, pass_mark_percentage)
VALUES
  (seed_uuid('naplan-y3-001'), 'Year 3 NAPLAN Practice -- Exam 1', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-002'), 'Year 3 NAPLAN Practice -- Exam 2', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-003'), 'Year 3 NAPLAN Practice -- Exam 3', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-004'), 'Year 3 NAPLAN Practice -- Exam 4', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-005'), 'Year 3 NAPLAN Practice -- Exam 5', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-001'), 'Year 5 NAPLAN Practice -- Exam 1', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-002'), 'Year 5 NAPLAN Practice -- Exam 2', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-003'), 'Year 5 NAPLAN Practice -- Exam 3', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-004'), 'Year 5 NAPLAN Practice -- Exam 4', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-005'), 'Year 5 NAPLAN Practice -- Exam 5', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Step 3: Insert exam_questions (100 rows)
-- Stimulus is in the dedicated stimulus column, NOT in prompt_blocks.
-- =============================================================================

INSERT INTO exam_questions (id, exam_package_id, sequence_number, difficulty, response_type, marks, prompt_blocks, media_references, tags, hint, validation, stimulus, stimulus_group_id, multi_part_group_id)
VALUES
  (seed_uuid('q-001'), seed_uuid('naplan-y3-001'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "What is 24 + 37?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/addition-number-line.png", "alt": "A number line showing numbers from 0 to 100 in increments of 10"}, {"type": "mcq", "options": [{"id": "a", "text": "51"}, {"id": "b", "text": "61"}, {"id": "c", "text": "71"}, {"id": "d", "text": "57"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "addition", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-002'), seed_uuid('naplan-y3-001'), 2, 'easy', 'mcq', 1, '[{"type": "text", "content": "Which word means the same as ''happy''?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/happy-faces-vocabulary.png", "alt": "Four cartoon faces showing different emotions: happy, sad, angry, and tired"}, {"type": "mcq", "options": [{"id": "a", "text": "Sad"}, {"id": "b", "text": "Joyful"}, {"id": "c", "text": "Angry"}, {"id": "d", "text": "Tired"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "vocabulary", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-003'), seed_uuid('naplan-y3-001'), 3, 'medium', 'mcq', 1, '[{"type": "text", "content": "What is the capital city of Australia?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/map-of-australia-capitals.png", "alt": "A simple map of Australia showing the locations of major capital cities"}, {"type": "mcq", "options": [{"id": "a", "text": "Sydney"}, {"id": "b", "text": "Melbourne"}, {"id": "c", "text": "Canberra"}, {"id": "d", "text": "Brisbane"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "australia", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-004'), seed_uuid('naplan-y3-001'), 4, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following words are nouns? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/nouns-word-cloud.png", "alt": "A colourful word cloud with different types of words including nouns, verbs, and adverbs"}, {"type": "multi_select", "options": [{"id": "a", "text": "Dog"}, {"id": "b", "text": "Run"}, {"id": "c", "text": "Table"}, {"id": "d", "text": "Quickly"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["english", "grammar", "nouns", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-005'), seed_uuid('naplan-y3-001'), 5, 'easy', 'short', 1, '[{"type": "text", "content": "The cat sat on the ___."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/cat-on-mat.png", "alt": "A cartoon cat sitting on a colourful mat"}]'::jsonb, '[]'::jsonb, '["english", "spelling", "cloze", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["mat", "Mat"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-006'), seed_uuid('naplan-y3-001'), 6, 'easy', 'numeric', 1, '[{"type": "text", "content": "What is 50 minus 18?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/subtraction-blocks.png", "alt": "A set of 50 counting blocks with 18 blocks crossed out"}]'::jsonb, '[]'::jsonb, '["maths", "subtraction", "year3"]'::jsonb, NULL, '{"correct": 32, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-007'), seed_uuid('naplan-y3-001'), 7, 'easy', 'boolean', 1, '[{"type": "text", "content": "A kangaroo is a type of reptile."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/kangaroo-grassland.png", "alt": "A kangaroo standing in an Australian grassland"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "animals", "year3"]'::jsonb, NULL, '{"correct": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-008'), seed_uuid('naplan-y3-001'), 8, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these numbers in order from smallest to largest."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/number-cards-sorting.png", "alt": "Four number cards showing 45, 12, 38, and 7 laid out on a table"}, {"type": "ordering", "instruction": "Arrange from smallest to largest.", "items": ["45", "12", "38", "7"]}]'::jsonb, '[]'::jsonb, '["maths", "number-order", "year3"]'::jsonb, NULL, '{"correctOrder": ["7", "12", "38", "45"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-009'), seed_uuid('naplan-y3-001'), 9, 'easy', 'mcq', 1, '[{"type": "text", "content": "What did the students plant in the school garden?"}, {"type": "mcq", "options": [{"id": "a", "text": "Roses and daisies"}, {"id": "b", "text": "Tomatoes and sunflowers"}, {"id": "c", "text": "Carrots and peas"}, {"id": "d", "text": "Apples and oranges"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, NULL, '{"title": "The School Garden", "content": "Last week, the students in Year 3 planted tomatoes and sunflowers in the school garden. They watered the plants every morning before class. By Friday, small green shoots had started to appear.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/school-garden-illustration.png", "alt": "An illustration of children planting in a school garden with tomato and sunflower seedlings"}}'::jsonb, 'sg-y3-001', NULL),
  (seed_uuid('q-010'), seed_uuid('naplan-y3-001'), 10, 'medium', 'short', 1, '[{"type": "text", "content": "When did the students water the plants?"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["every morning", "every morning before class", "before class", "in the morning"], "caseSensitive": false}'::jsonb, '{"title": "The School Garden", "content": "Last week, the students in Year 3 planted tomatoes and sunflowers in the school garden. They watered the plants every morning before class. By Friday, small green shoots had started to appear.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/school-garden-illustration.png", "alt": "An illustration of children planting in a school garden with tomato and sunflower seedlings"}}'::jsonb, 'sg-y3-001', NULL),
  (seed_uuid('q-011'), seed_uuid('naplan-y3-002'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "How many sides does a triangle have?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/triangle-shape.png", "alt": "A large colourful triangle with its three sides clearly visible"}, {"type": "mcq", "options": [{"id": "a", "text": "2"}, {"id": "b", "text": "3"}, {"id": "c", "text": "4"}, {"id": "d", "text": "5"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "shapes", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-012'), seed_uuid('naplan-y3-002'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which sentence uses a full stop correctly?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/punctuation-marks.png", "alt": "Common punctuation marks including a full stop, comma, question mark, and exclamation mark"}, {"type": "mcq", "options": [{"id": "a", "text": "The dog ran fast."}, {"id": "b", "text": "The dog ran fast"}, {"id": "c", "text": "The dog. ran fast"}, {"id": "d", "text": ".The dog ran fast"}], "correctOptionId": "a"}]'::jsonb, '[]'::jsonb, '["english", "punctuation", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-013'), seed_uuid('naplan-y3-002'), 3, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are seasons in Australia? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/four-seasons-australia.png", "alt": "Four panels showing the four seasons in Australia: summer, autumn, winter, and spring"}, {"type": "multi_select", "options": [{"id": "a", "text": "Summer"}, {"id": "b", "text": "Monsoon"}, {"id": "c", "text": "Autumn"}, {"id": "d", "text": "Harvest"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["general-knowledge", "seasons", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-014'), seed_uuid('naplan-y3-002'), 4, 'easy', 'numeric', 1, '[{"type": "text", "content": "What is 6 times 4?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/multiplication-array-6x4.png", "alt": "An array of 6 rows and 4 columns of dots arranged in a grid"}]'::jsonb, '[]'::jsonb, '["maths", "multiplication", "year3"]'::jsonb, NULL, '{"correct": 24, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-015'), seed_uuid('naplan-y3-002'), 5, 'easy', 'boolean', 1, '[{"type": "text", "content": "A sentence always begins with a capital letter."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/capital-letter-sentence.png", "alt": "An example sentence with the first letter highlighted in a large capital letter"}]'::jsonb, '[]'::jsonb, '["english", "grammar", "year3"]'::jsonb, NULL, '{"correct": true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-016'), seed_uuid('naplan-y3-002'), 6, 'easy', 'short', 1, '[{"type": "text", "content": "She ___ to the shop yesterday."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/girl-walking-to-shop.png", "alt": "A cartoon girl walking along a footpath towards a small shop"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "grammar", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["went", "walked", "ran"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-017'), seed_uuid('naplan-y3-002'), 7, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each animal to where it lives."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/animals-habitats.png", "alt": "Three panels showing a fish in water, a bird in a nest, and a rabbit near a burrow"}, {"type": "matching", "pairs": [{"left": "Fish", "right": "Water"}, {"left": "Bird", "right": "Nest"}, {"left": "Rabbit", "right": "Burrow"}]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "animals", "habitats", "year3"]'::jsonb, NULL, '{"correctPairs": {"Fish": "Water", "Bird": "Nest", "Rabbit": "Burrow"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-018'), seed_uuid('naplan-y3-002'), 8, 'easy', 'mcq', 1, '[{"type": "text", "content": "Sam starts his homework at 4:00 pm and finishes at 4:30 pm. How many minutes did Sam spend on his homework?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/clock-showing-four.png", "alt": "An analogue clock showing 4 o''clock"}, {"type": "mcq", "options": [{"id": "a", "text": "20 minutes"}, {"id": "b", "text": "30 minutes"}, {"id": "c", "text": "40 minutes"}, {"id": "d", "text": "60 minutes"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "time", "multi-part", "year3"]'::jsonb, NULL, NULL, NULL, NULL, 'mp-y3-001'),
  (seed_uuid('q-019'), seed_uuid('naplan-y3-002'), 9, 'easy', 'boolean', 1, '[{"type": "text", "content": "Sam starts his homework at 4:00 pm and finishes at 4:30 pm. Sam spent more than one hour on his homework."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/clock-showing-four-thirty.png", "alt": "An analogue clock showing 4:30"}]'::jsonb, '[]'::jsonb, '["maths", "time", "multi-part", "year3"]'::jsonb, NULL, '{"correct": false}'::jsonb, NULL, NULL, 'mp-y3-001'),
  (seed_uuid('q-020'), seed_uuid('naplan-y3-002'), 10, 'medium', 'short', 1, '[{"type": "text", "content": "What is the opposite of the word ''hot''?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/thermometer-hot-cold.png", "alt": "A thermometer showing hot at the top and cold at the bottom"}]'::jsonb, '[]'::jsonb, '["english", "vocabulary", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["cold", "freezing", "cool"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-021'), seed_uuid('naplan-y3-003'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "Emma has $2.50. She buys an apple for $1.20. How much money does she have left?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/coins-australian-dollars.png", "alt": "Australian coins and notes including a two dollar coin, a one dollar coin, and a fifty cent piece"}, {"type": "mcq", "options": [{"id": "a", "text": "$1.20"}, {"id": "b", "text": "$1.30"}, {"id": "c", "text": "$1.40"}, {"id": "d", "text": "$1.50"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "money", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-022'), seed_uuid('naplan-y3-003'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which word best completes this sentence? The kitten was very ___ after playing all day."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/sleepy-kitten.png", "alt": "A cartoon kitten yawning and looking sleepy after playing"}, {"type": "mcq", "options": [{"id": "a", "text": "energetic"}, {"id": "b", "text": "tired"}, {"id": "c", "text": "loud"}, {"id": "d", "text": "hungry"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "vocabulary", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-023'), seed_uuid('naplan-y3-003'), 3, 'easy', 'numeric', 1, '[{"type": "text", "content": "There are 15 lollies shared equally among 3 children. How many lollies does each child get?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/lollies-sharing-groups.png", "alt": "Fifteen lollies arranged above three equal groups"}]'::jsonb, '[]'::jsonb, '["maths", "division", "year3"]'::jsonb, NULL, '{"correct": 5, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-024'), seed_uuid('naplan-y3-003'), 4, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are even numbers? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/even-odd-number-chart.png", "alt": "A chart showing numbers 1 to 50 with even numbers highlighted in blue"}, {"type": "multi_select", "options": [{"id": "a", "text": "14"}, {"id": "b", "text": "23"}, {"id": "c", "text": "36"}, {"id": "d", "text": "41"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["maths", "even-numbers", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-025'), seed_uuid('naplan-y3-003'), 5, 'easy', 'boolean', 1, '[{"type": "text", "content": "The Sun rises in the west."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/sunrise-east.png", "alt": "A landscape showing the Sun rising over a horizon with an east direction arrow"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "science", "year3"]'::jsonb, NULL, '{"correct": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-026'), seed_uuid('naplan-y3-003'), 6, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these words in alphabetical order."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/alphabet-blocks.png", "alt": "Colourful wooden alphabet blocks arranged in a row from A to Z"}, {"type": "ordering", "instruction": "Arrange in alphabetical order.", "items": ["elephant", "apple", "dolphin", "banana"]}]'::jsonb, '[]'::jsonb, '["english", "alphabetical-order", "year3"]'::jsonb, NULL, '{"correctOrder": ["apple", "banana", "dolphin", "elephant"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-027'), seed_uuid('naplan-y3-003'), 7, 'easy', 'short', 1, '[{"type": "text", "content": "What number comes next in the pattern? 5, 10, 15, 20, ___"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/skip-counting-by-five.png", "alt": "A number line showing skip counting by fives: 5, 10, 15, 20 with the next position marked with a question mark"}]'::jsonb, '[]'::jsonb, '["maths", "counting", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["25"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-028'), seed_uuid('naplan-y3-003'), 8, 'easy', 'mcq', 1, '[{"type": "text", "content": "What colour was the kite?"}, {"type": "mcq", "options": [{"id": "a", "text": "Blue"}, {"id": "b", "text": "Green"}, {"id": "c", "text": "Red"}, {"id": "d", "text": "Yellow"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, NULL, '{"title": "At the Beach", "content": "On Saturday, Mia and her family went to the beach. They built a big sandcastle near the water. Mia collected shells while her brother played in the waves. After lunch, they flew a red kite until it was time to go home.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/beach-scene-family.png", "alt": "An illustration of a family at the beach building a sandcastle and flying a kite"}}'::jsonb, 'sg-y3-002', NULL),
  (seed_uuid('q-029'), seed_uuid('naplan-y3-003'), 9, 'medium', 'short', 1, '[{"type": "text", "content": "What did Mia collect at the beach?"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["shells", "Shells", "sea shells", "seashells"], "caseSensitive": false}'::jsonb, '{"title": "At the Beach", "content": "On Saturday, Mia and her family went to the beach. They built a big sandcastle near the water. Mia collected shells while her brother played in the waves. After lunch, they flew a red kite until it was time to go home.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/beach-scene-family.png", "alt": "An illustration of a family at the beach building a sandcastle and flying a kite"}}'::jsonb, 'sg-y3-002', NULL),
  (seed_uuid('q-030'), seed_uuid('naplan-y3-003'), 10, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which ocean is on the east coast of Australia?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/map-australia-east-coast.png", "alt": "A map of Australia highlighting the east coast and the Pacific Ocean"}, {"type": "mcq", "options": [{"id": "a", "text": "Indian Ocean"}, {"id": "b", "text": "Arctic Ocean"}, {"id": "c", "text": "Pacific Ocean"}, {"id": "d", "text": "Atlantic Ocean"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "geography", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-031'), seed_uuid('naplan-y3-004'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "What is the value of the 5 in the number 352?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/place-value-chart-352.png", "alt": "A place value chart showing hundreds, tens, and ones columns with the number 352"}, {"type": "mcq", "options": [{"id": "a", "text": "5"}, {"id": "b", "text": "50"}, {"id": "c", "text": "500"}, {"id": "d", "text": "55"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "place-value", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-032'), seed_uuid('naplan-y3-004'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which word is a verb in this sentence? ''The children played in the park.''"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/children-playing-park.png", "alt": "Children playing together in a park on a sunny day"}, {"type": "mcq", "options": [{"id": "a", "text": "children"}, {"id": "b", "text": "played"}, {"id": "c", "text": "park"}, {"id": "d", "text": "the"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "grammar", "verbs", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-033'), seed_uuid('naplan-y3-004'), 3, 'easy', 'numeric', 1, '[{"type": "text", "content": "A farmer has 28 sheep and buys 15 more. How many sheep does the farmer have now?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/sheep-paddock.png", "alt": "A group of sheep in a green paddock with a farmer"}]'::jsonb, '[]'::jsonb, '["maths", "addition", "year3"]'::jsonb, NULL, '{"correct": 43, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-034'), seed_uuid('naplan-y3-004'), 4, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following words are adjectives? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/adjective-examples.png", "alt": "A tall tree next to a small bush, with a bright sun overhead, illustrating adjectives"}, {"type": "multi_select", "options": [{"id": "a", "text": "Tall"}, {"id": "b", "text": "Jump"}, {"id": "c", "text": "Bright"}, {"id": "d", "text": "House"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["english", "grammar", "adjectives", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-035'), seed_uuid('naplan-y3-004'), 5, 'easy', 'boolean', 1, '[{"type": "text", "content": "Half of 10 is 5."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/fraction-half-circle.png", "alt": "A circle divided into two equal halves, with one half shaded"}]'::jsonb, '[]'::jsonb, '["maths", "fractions", "year3"]'::jsonb, NULL, '{"correct": true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-036'), seed_uuid('naplan-y3-004'), 6, 'easy', 'short', 1, '[{"type": "text", "content": "The opposite of ''big'' is ___."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/opposites-big-small.png", "alt": "A large elephant standing next to a small mouse, showing the concept of opposites"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "opposites", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["small", "little", "tiny"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-037'), seed_uuid('naplan-y3-004'), 7, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each shape to the number of sides it has."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/shapes-triangle-rectangle-pentagon.png", "alt": "Three shapes in a row: a triangle, a rectangle, and a pentagon, each clearly labelled"}, {"type": "matching", "pairs": [{"left": "Triangle", "right": "3"}, {"left": "Rectangle", "right": "4"}, {"left": "Pentagon", "right": "5"}]}]'::jsonb, '[]'::jsonb, '["maths", "shapes", "sides", "year3"]'::jsonb, NULL, '{"correctPairs": {"Triangle": "3", "Rectangle": "4", "Pentagon": "5"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-038'), seed_uuid('naplan-y3-004'), 8, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these months in the correct order, starting from the earliest in the year."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/calendar-months.png", "alt": "A colourful calendar showing all twelve months of the year"}, {"type": "ordering", "instruction": "Arrange in calendar order.", "items": ["June", "March", "September", "January"]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "calendar", "year3"]'::jsonb, NULL, '{"correctOrder": ["January", "March", "June", "September"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-039'), seed_uuid('naplan-y3-004'), 9, 'easy', 'mcq', 1, '[{"type": "text", "content": "What type of animal is a platypus?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/platypus-riverbank.png", "alt": "A platypus swimming in a river with its distinctive bill and flat tail visible"}, {"type": "mcq", "options": [{"id": "a", "text": "Reptile"}, {"id": "b", "text": "Bird"}, {"id": "c", "text": "Mammal"}, {"id": "d", "text": "Fish"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "animals", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-040'), seed_uuid('naplan-y3-004'), 10, 'medium', 'short', 1, '[{"type": "text", "content": "What is the plural of the word ''child''?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y3/singular-plural-children.png", "alt": "One child on the left and a group of children on the right, showing singular and plural"}]'::jsonb, '[]'::jsonb, '["english", "plural", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["children"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-041'), seed_uuid('naplan-y3-005'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "Where did Tom find the dog?"}, {"type": "mcq", "options": [{"id": "a", "text": "At school"}, {"id": "b", "text": "In the park"}, {"id": "c", "text": "At the shops"}, {"id": "d", "text": "In his backyard"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, NULL, '{"title": "The Lost Dog", "content": "Tom found a small brown dog in the park on Tuesday morning. It had no collar and looked hungry. He gave it some water and took it to the vet. The vet checked the dog and found a microchip. They called the owner, Mrs Lee, who was very happy to get her dog Biscuit back.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/lost-dog-park.png", "alt": "A boy finding a small brown dog sitting alone in a park"}}'::jsonb, 'sg-y3-003', NULL),
  (seed_uuid('q-042'), seed_uuid('naplan-y3-005'), 2, 'medium', 'short', 1, '[{"type": "text", "content": "What was the dog''s name?"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["Biscuit", "biscuit"], "caseSensitive": false}'::jsonb, '{"title": "The Lost Dog", "content": "Tom found a small brown dog in the park on Tuesday morning. It had no collar and looked hungry. He gave it some water and took it to the vet. The vet checked the dog and found a microchip. They called the owner, Mrs Lee, who was very happy to get her dog Biscuit back.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/lost-dog-park.png", "alt": "A boy finding a small brown dog sitting alone in a park"}}'::jsonb, 'sg-y3-003', NULL),
  (seed_uuid('q-043'), seed_uuid('naplan-y3-005'), 3, 'easy', 'boolean', 1, '[{"type": "text", "content": "Tom found the dog on a Wednesday."}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year3"]'::jsonb, NULL, '{"correct": false}'::jsonb, '{"title": "The Lost Dog", "content": "Tom found a small brown dog in the park on Tuesday morning. It had no collar and looked hungry. He gave it some water and took it to the vet. The vet checked the dog and found a microchip. They called the owner, Mrs Lee, who was very happy to get her dog Biscuit back.", "image": {"src": "https://cdn.mindmosaic.com/english/y3/lost-dog-park.png", "alt": "A boy finding a small brown dog sitting alone in a park"}}'::jsonb, 'sg-y3-003', NULL),
  (seed_uuid('q-044'), seed_uuid('naplan-y3-005'), 4, 'easy', 'mcq', 1, '[{"type": "text", "content": "How many centimetres are in one metre?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/ruler-one-metre.png", "alt": "A one-metre ruler with centimetre markings clearly visible"}, {"type": "mcq", "options": [{"id": "a", "text": "10"}, {"id": "b", "text": "50"}, {"id": "c", "text": "100"}, {"id": "d", "text": "1000"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["maths", "measurement", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-045'), seed_uuid('naplan-y3-005'), 5, 'medium', 'numeric', 1, '[{"type": "text", "content": "A bakery made 36 cupcakes in the morning and 24 cupcakes in the afternoon. How many cupcakes were made in total?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/cupcakes-bakery-trays.png", "alt": "Trays of cupcakes on a bakery counter"}]'::jsonb, '[]'::jsonb, '["maths", "word-problem", "multi-part", "year3"]'::jsonb, NULL, '{"correct": 60, "tolerance": 0}'::jsonb, NULL, NULL, 'mp-y3-002'),
  (seed_uuid('q-046'), seed_uuid('naplan-y3-005'), 6, 'medium', 'numeric', 1, '[{"type": "text", "content": "The bakery made 60 cupcakes in total. They sold 45 cupcakes during the day. How many cupcakes were left?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/cupcakes-some-sold.png", "alt": "A bakery display showing some cupcakes remaining after sales"}]'::jsonb, '[]'::jsonb, '["maths", "word-problem", "multi-part", "year3"]'::jsonb, NULL, '{"correct": 15, "tolerance": 0}'::jsonb, NULL, NULL, 'mp-y3-002'),
  (seed_uuid('q-047'), seed_uuid('naplan-y3-005'), 7, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are living things? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/living-nonliving-things.png", "alt": "A split image showing living things (tree, cat) and non-living things (rock, chair)"}, {"type": "multi_select", "options": [{"id": "a", "text": "Tree"}, {"id": "b", "text": "Rock"}, {"id": "c", "text": "Cat"}, {"id": "d", "text": "Chair"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["general-knowledge", "living-things", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-048'), seed_uuid('naplan-y3-005'), 8, 'easy', 'short', 1, '[{"type": "text", "content": "A group of fish is called a ___."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/school-of-fish.png", "alt": "A group of colourful fish swimming together in the ocean"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "year3"]'::jsonb, NULL, '{"acceptedAnswers": ["school", "School"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-049'), seed_uuid('naplan-y3-005'), 9, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put the life cycle of a butterfly in the correct order."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y3/butterfly-life-cycle.png", "alt": "The four stages of a butterfly life cycle: egg, caterpillar, chrysalis, and butterfly"}, {"type": "ordering", "instruction": "Arrange in the correct life cycle order.", "items": ["Butterfly", "Egg", "Caterpillar", "Chrysalis"]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "life-cycle", "year3"]'::jsonb, NULL, '{"correctOrder": ["Egg", "Caterpillar", "Chrysalis", "Butterfly"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-050'), seed_uuid('naplan-y3-005'), 10, 'easy', 'mcq', 1, '[{"type": "text", "content": "How many days are in one week?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y3/weekly-calendar.png", "alt": "A weekly calendar showing seven days from Monday to Sunday"}, {"type": "mcq", "options": [{"id": "a", "text": "5"}, {"id": "b", "text": "6"}, {"id": "c", "text": "7"}, {"id": "d", "text": "10"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["maths", "time", "year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-051'), seed_uuid('naplan-y5-001'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "How long is the Great Barrier Reef?"}, {"type": "mcq", "options": [{"id": "a", "text": "Over 1,500 kilometres"}, {"id": "b", "text": "Over 2,300 kilometres"}, {"id": "c", "text": "Over 3,000 kilometres"}, {"id": "d", "text": "Over 1,000 kilometres"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year5"]'::jsonb, NULL, NULL, '{"title": "The Great Barrier Reef", "content": "The Great Barrier Reef is the largest coral reef system in the world. Located off the coast of Queensland, Australia, it stretches over 2,300 kilometres. The reef is home to thousands of species, including sea turtles, dolphins, and over 1,500 types of fish. Rising ocean temperatures caused by climate change pose a serious threat to the reef. Scientists are working hard to protect this natural wonder.", "image": {"src": "https://cdn.mindmosaic.com/general/y5/great-barrier-reef-aerial.png", "alt": "An aerial view of the Great Barrier Reef showing coral formations and clear blue water"}}'::jsonb, 'sg-y5-001', NULL),
  (seed_uuid('q-052'), seed_uuid('naplan-y5-001'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "According to the passage, what poses a threat to the reef?"}, {"type": "mcq", "options": [{"id": "a", "text": "Fishing boats"}, {"id": "b", "text": "Rising ocean temperatures"}, {"id": "c", "text": "Sharks"}, {"id": "d", "text": "Pollution from factories"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year5"]'::jsonb, NULL, NULL, '{"title": "The Great Barrier Reef", "content": "The Great Barrier Reef is the largest coral reef system in the world. Located off the coast of Queensland, Australia, it stretches over 2,300 kilometres. The reef is home to thousands of species, including sea turtles, dolphins, and over 1,500 types of fish. Rising ocean temperatures caused by climate change pose a serious threat to the reef. Scientists are working hard to protect this natural wonder.", "image": {"src": "https://cdn.mindmosaic.com/general/y5/great-barrier-reef-aerial.png", "alt": "An aerial view of the Great Barrier Reef showing coral formations and clear blue water"}}'::jsonb, 'sg-y5-001', NULL),
  (seed_uuid('q-053'), seed_uuid('naplan-y5-001'), 3, 'medium', 'numeric', 1, '[{"type": "text", "content": "A box holds 12 eggs. If a farmer fills 8 boxes, how many eggs does the farmer have?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/egg-cartons-multiplication.png", "alt": "Eight egg cartons, each holding 12 eggs arranged in rows"}]'::jsonb, '[]'::jsonb, '["maths", "multiplication", "year5"]'::jsonb, NULL, '{"correct": 96, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-054'), seed_uuid('naplan-y5-001'), 4, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are conjunctions? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/conjunction-sentence-diagram.png", "alt": "A sentence diagram showing two clauses joined by a conjunction"}, {"type": "multi_select", "options": [{"id": "a", "text": "and"}, {"id": "b", "text": "quickly"}, {"id": "c", "text": "but"}, {"id": "d", "text": "table"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["english", "grammar", "conjunctions", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-055'), seed_uuid('naplan-y5-001'), 5, 'easy', 'boolean', 1, '[{"type": "text", "content": "Three-quarters is the same as 0.75."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/fraction-decimal-equivalents.png", "alt": "A visual showing three-quarters of a circle shaded, with 0.75 written beside it"}]'::jsonb, '[]'::jsonb, '["maths", "fractions", "year5"]'::jsonb, NULL, '{"correct": true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-056'), seed_uuid('naplan-y5-001'), 6, 'easy', 'short', 1, '[{"type": "text", "content": "Write 50% as a fraction in its simplest form."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/percentage-fraction-bar.png", "alt": "A bar divided into two equal halves with 50 percent labelled on one half"}]'::jsonb, '[]'::jsonb, '["maths", "fractions", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["1/2", "one half", "one-half"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-057'), seed_uuid('naplan-y5-001'), 7, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these numbers in order from smallest to largest."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/decimal-number-line.png", "alt": "A number line from 0 to 1 with markings at 0.1, 0.3, 0.5, and 0.75"}, {"type": "ordering", "instruction": "Arrange from smallest to largest.", "items": ["0.75", "0.3", "0.5", "0.1"]}]'::jsonb, '[]'::jsonb, '["maths", "fractions", "decimals", "year5"]'::jsonb, NULL, '{"correctOrder": ["0.1", "0.3", "0.5", "0.75"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-058'), seed_uuid('naplan-y5-001'), 8, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which planet in our solar system is closest to the Sun?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/solar-system-inner-planets.png", "alt": "A diagram of the inner solar system showing the Sun, Mercury, Venus, Earth, and Mars"}, {"type": "mcq", "options": [{"id": "a", "text": "Venus"}, {"id": "b", "text": "Mars"}, {"id": "c", "text": "Mercury"}, {"id": "d", "text": "Earth"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "science", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-059'), seed_uuid('naplan-y5-001'), 9, 'easy', 'short', 1, '[{"type": "text", "content": "The children ___ their lunches before going outside to play."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/children-lunchbox.png", "alt": "Children sitting at a school table with open lunchboxes"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "grammar", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["ate", "finished", "had"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-060'), seed_uuid('naplan-y5-001'), 10, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each Australian state to its capital city."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/map-australia-states-capitals.png", "alt": "A map of Australia showing all states and territories with their capital cities marked"}, {"type": "matching", "pairs": [{"left": "New South Wales", "right": "Sydney"}, {"left": "Victoria", "right": "Melbourne"}, {"left": "Queensland", "right": "Brisbane"}]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "states", "capitals", "year5"]'::jsonb, NULL, '{"correctPairs": {"New South Wales": "Sydney", "Victoria": "Melbourne", "Queensland": "Brisbane"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-061'), seed_uuid('naplan-y5-002'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "A rectangle has a length of 8 cm and a width of 5 cm. What is its area?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/rectangle-labelled-8x5.png", "alt": "A rectangle with length labelled as 8 cm and width labelled as 5 cm"}, {"type": "mcq", "options": [{"id": "a", "text": "13 square cm"}, {"id": "b", "text": "26 square cm"}, {"id": "c", "text": "40 square cm"}, {"id": "d", "text": "80 square cm"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["maths", "area", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-062'), seed_uuid('naplan-y5-002'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "What does the phrase ''it''s raining cats and dogs'' mean?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/raining-cats-dogs-idiom.png", "alt": "A person holding an umbrella in very heavy rain with dark clouds overhead"}, {"type": "mcq", "options": [{"id": "a", "text": "Animals are falling from the sky"}, {"id": "b", "text": "It is raining very heavily"}, {"id": "c", "text": "Pets are running outside"}, {"id": "d", "text": "The weather is unpredictable"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "figurative-language", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-063'), seed_uuid('naplan-y5-002'), 3, 'medium', 'numeric', 1, '[{"type": "text", "content": "A school has 3 classes in Year 5. Class A has 28 students, Class B has 25 students, and Class C has 27 students. How many Year 5 students are there in total?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/three-classrooms.png", "alt": "Three classroom doors labelled Class A, Class B, and Class C"}]'::jsonb, '[]'::jsonb, '["maths", "word-problem", "multi-part", "year5"]'::jsonb, NULL, '{"correct": 80, "tolerance": 0}'::jsonb, NULL, NULL, 'mp-y5-001'),
  (seed_uuid('q-064'), seed_uuid('naplan-y5-002'), 4, 'medium', 'mcq', 1, '[{"type": "text", "content": "There are 80 Year 5 students in total. Each student needs 3 exercise books for the term. How many exercise books are needed altogether?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/exercise-books-stack.png", "alt": "A stack of school exercise books on a desk"}, {"type": "mcq", "options": [{"id": "a", "text": "83"}, {"id": "b", "text": "160"}, {"id": "c", "text": "240"}, {"id": "d", "text": "320"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["maths", "word-problem", "multi-part", "year5"]'::jsonb, NULL, NULL, NULL, NULL, 'mp-y5-001'),
  (seed_uuid('q-065'), seed_uuid('naplan-y5-002'), 5, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are factors of 24? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/factor-pairs-diagram.png", "alt": "A factor tree diagram for the number 24 showing its factor pairs"}, {"type": "multi_select", "options": [{"id": "a", "text": "3"}, {"id": "b", "text": "5"}, {"id": "c", "text": "8"}, {"id": "d", "text": "9"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["maths", "factors", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-066'), seed_uuid('naplan-y5-002'), 6, 'easy', 'boolean', 1, '[{"type": "text", "content": "Australia is the smallest continent in the world."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/map-australia-continent.png", "alt": "A world map highlighting Australia as the smallest continent"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "geography", "year5"]'::jsonb, NULL, '{"correct": true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-067'), seed_uuid('naplan-y5-002'), 7, 'easy', 'short', 1, '[{"type": "text", "content": "We went over ___ to visit our grandparents."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/homophones-there-their-theyre.png", "alt": "A visual guide showing the three homophones: there, their, and they''re with example usage"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "homophones", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["there"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-068'), seed_uuid('naplan-y5-002'), 8, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each word to its word type."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/word-types-poster.png", "alt": "A classroom poster showing examples of nouns, verbs, adjectives, and adverbs"}, {"type": "matching", "pairs": [{"left": "quickly", "right": "Adverb"}, {"left": "beautiful", "right": "Adjective"}, {"left": "swimming", "right": "Verb"}]}]'::jsonb, '[]'::jsonb, '["english", "grammar", "word-types", "year5"]'::jsonb, NULL, '{"correctPairs": {"quickly": "Adverb", "beautiful": "Adjective", "swimming": "Verb"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-069'), seed_uuid('naplan-y5-002'), 9, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these numbers in order from smallest to largest."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/number-line-negative-positive.png", "alt": "A number line ranging from negative 10 to positive 10 with zero clearly marked"}, {"type": "ordering", "instruction": "Arrange from smallest to largest.", "items": ["3", "-5", "0", "-1"]}]'::jsonb, '[]'::jsonb, '["maths", "number-order", "negative-numbers", "year5"]'::jsonb, NULL, '{"correctOrder": ["-5", "-1", "0", "3"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-070'), seed_uuid('naplan-y5-002'), 10, 'medium', 'short', 1, '[{"type": "text", "content": "What is the past tense of the word ''run''?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/past-tense-timeline.png", "alt": "A simple timeline showing past, present, and future with the past section highlighted"}]'::jsonb, '[]'::jsonb, '["english", "vocabulary", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["ran"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-071'), seed_uuid('naplan-y5-003'), 1, 'medium', 'mcq', 1, '[{"type": "text", "content": "What causes water to evaporate?"}, {"type": "mcq", "options": [{"id": "a", "text": "The Moon"}, {"id": "b", "text": "The wind"}, {"id": "c", "text": "The Sun"}, {"id": "d", "text": "The clouds"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year5"]'::jsonb, NULL, NULL, '{"title": "The Water Cycle", "content": "Water on Earth is constantly moving. The Sun heats water in oceans, rivers, and lakes, causing it to evaporate and rise as water vapour. As the vapour rises, it cools and condenses to form clouds. When the droplets in clouds become heavy enough, they fall back to Earth as rain, snow, or hail. This process is called precipitation. The water then flows into rivers and oceans, and the cycle begins again.", "image": {"src": "https://cdn.mindmosaic.com/general/y5/water-cycle-diagram.png", "alt": "A labelled diagram of the water cycle showing evaporation, condensation, precipitation, and collection"}}'::jsonb, 'sg-y5-002', NULL),
  (seed_uuid('q-072'), seed_uuid('naplan-y5-003'), 2, 'medium', 'short', 1, '[{"type": "text", "content": "What is the process called when water falls back to Earth as rain, snow, or hail?"}]'::jsonb, '[]'::jsonb, '["english", "reading", "passage-group", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["precipitation", "Precipitation"], "caseSensitive": false}'::jsonb, '{"title": "The Water Cycle", "content": "Water on Earth is constantly moving. The Sun heats water in oceans, rivers, and lakes, causing it to evaporate and rise as water vapour. As the vapour rises, it cools and condenses to form clouds. When the droplets in clouds become heavy enough, they fall back to Earth as rain, snow, or hail. This process is called precipitation. The water then flows into rivers and oceans, and the cycle begins again.", "image": {"src": "https://cdn.mindmosaic.com/general/y5/water-cycle-diagram.png", "alt": "A labelled diagram of the water cycle showing evaporation, condensation, precipitation, and collection"}}'::jsonb, 'sg-y5-002', NULL),
  (seed_uuid('q-073'), seed_uuid('naplan-y5-003'), 3, 'easy', 'mcq', 1, '[{"type": "text", "content": "A right angle measures exactly how many degrees?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/right-angle-90-degrees.png", "alt": "A right angle marked with a small square symbol and labelled as 90 degrees"}, {"type": "mcq", "options": [{"id": "a", "text": "45 degrees"}, {"id": "b", "text": "90 degrees"}, {"id": "c", "text": "180 degrees"}, {"id": "d", "text": "360 degrees"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "angles", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-074'), seed_uuid('naplan-y5-003'), 4, 'medium', 'numeric', 1, '[{"type": "text", "content": "A square has sides of 9 cm. What is the perimeter of the square in centimetres?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/square-labelled-9cm.png", "alt": "A square with each side labelled as 9 cm"}]'::jsonb, '[]'::jsonb, '["maths", "perimeter", "year5"]'::jsonb, NULL, '{"correct": 36, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-075'), seed_uuid('naplan-y5-003'), 5, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are inner planets in our solar system? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/solar-system-all-planets.png", "alt": "A diagram of the solar system showing all eight planets in order from the Sun"}, {"type": "multi_select", "options": [{"id": "a", "text": "Mercury"}, {"id": "b", "text": "Jupiter"}, {"id": "c", "text": "Venus"}, {"id": "d", "text": "Saturn"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["general-knowledge", "solar-system", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-076'), seed_uuid('naplan-y5-003'), 6, 'easy', 'boolean', 1, '[{"type": "text", "content": "The Great Barrier Reef is located off the coast of Western Australia."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/map-australia-queensland-highlighted.png", "alt": "A map of Australia with Queensland highlighted on the east coast"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "australia", "year5"]'::jsonb, NULL, '{"correct": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-077'), seed_uuid('naplan-y5-003'), 7, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put the steps of the water cycle in the correct order."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/water-cycle-steps.png", "alt": "Four separate panels showing each step of the water cycle: evaporation, condensation, precipitation, and collection"}, {"type": "ordering", "instruction": "Arrange in the correct order.", "items": ["Precipitation", "Evaporation", "Collection", "Condensation"]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "water-cycle", "year5"]'::jsonb, NULL, '{"correctOrder": ["Evaporation", "Condensation", "Precipitation", "Collection"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-078'), seed_uuid('naplan-y5-003'), 8, 'easy', 'short', 1, '[{"type": "text", "content": "The opposite of ''ancient'' is ___."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/ancient-vs-modern-buildings.png", "alt": "A side-by-side comparison of an ancient stone ruin and a modern glass building"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "spelling", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["modern", "new", "recent"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-079'), seed_uuid('naplan-y5-003'), 9, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each quantity to the best unit of measurement."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/measurement-tools.png", "alt": "Three measurement tools: a ruler for length, a set of scales for weight, and a measuring jug for volume"}, {"type": "matching", "pairs": [{"left": "Length of a pencil", "right": "Centimetres"}, {"left": "Weight of a car", "right": "Kilograms"}, {"left": "Water in a pool", "right": "Litres"}]}]'::jsonb, '[]'::jsonb, '["maths", "units", "measurement", "year5"]'::jsonb, NULL, '{"correctPairs": {"Length of a pencil": "Centimetres", "Weight of a car": "Kilograms", "Water in a pool": "Litres"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-080'), seed_uuid('naplan-y5-003'), 10, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which sentence uses an apostrophe correctly?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/apostrophe-examples.png", "alt": "A poster showing the difference between possessive apostrophes for singular and plural nouns"}, {"type": "mcq", "options": [{"id": "a", "text": "The dog''s ate their food."}, {"id": "b", "text": "The dogs'' owner was kind."}, {"id": "c", "text": "The dog''s is very playful."}, {"id": "d", "text": "The dogs''s collar was red."}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "punctuation", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-081'), seed_uuid('naplan-y5-004'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "What is 3.6 + 2.4?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/decimal-addition-column.png", "alt": "A column addition showing 3.6 plus 2.4 with decimal points aligned"}, {"type": "mcq", "options": [{"id": "a", "text": "5.0"}, {"id": "b", "text": "5.10"}, {"id": "c", "text": "6.0"}, {"id": "d", "text": "6.10"}], "correctOptionId": "c"}]'::jsonb, '[]'::jsonb, '["maths", "decimals", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-082'), seed_uuid('naplan-y5-004'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "What does the prefix ''un-'' mean in the word ''unhappy''?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/prefix-un-examples.png", "alt": "A diagram showing the prefix un attached to words: unhappy, unkind, and unfair"}, {"type": "mcq", "options": [{"id": "a", "text": "Very"}, {"id": "b", "text": "Not"}, {"id": "c", "text": "Again"}, {"id": "d", "text": "Before"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "vocabulary", "prefixes", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-083'), seed_uuid('naplan-y5-004'), 3, 'medium', 'numeric', 1, '[{"type": "text", "content": "In a class survey, 8 students chose football, 12 chose netball, and 5 chose tennis as their favourite sport. How many students took part in the survey?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/classroom-students-count.png", "alt": "Three groups of students in school uniforms representing three different classes"}]'::jsonb, '[]'::jsonb, '["maths", "data", "multi-part", "year5"]'::jsonb, NULL, '{"correct": 25, "tolerance": 0}'::jsonb, NULL, NULL, 'mp-y5-002'),
  (seed_uuid('q-084'), seed_uuid('naplan-y5-004'), 4, 'medium', 'mcq', 1, '[{"type": "text", "content": "In the class survey (8 football, 12 netball, 5 tennis), which sport was the most popular?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/exercise-books-boxes.png", "alt": "Boxes of exercise books being distributed to classrooms"}, {"type": "mcq", "options": [{"id": "a", "text": "Football"}, {"id": "b", "text": "Netball"}, {"id": "c", "text": "Tennis"}, {"id": "d", "text": "They were all equal"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "data", "multi-part", "year5"]'::jsonb, NULL, NULL, NULL, NULL, 'mp-y5-002'),
  (seed_uuid('q-085'), seed_uuid('naplan-y5-004'), 5, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are pronouns? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/pronoun-chart.png", "alt": "A chart listing common personal pronouns: I, you, he, she, it, we, they"}, {"type": "multi_select", "options": [{"id": "a", "text": "she"}, {"id": "b", "text": "pencil"}, {"id": "c", "text": "they"}, {"id": "d", "text": "slowly"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["english", "grammar", "pronouns", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-086'), seed_uuid('naplan-y5-004'), 6, 'easy', 'boolean', 1, '[{"type": "text", "content": "The number 47 is a prime number."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/prime-number-grid.png", "alt": "A hundred chart with prime numbers highlighted up to 50"}]'::jsonb, '[]'::jsonb, '["maths", "number-sense", "year5"]'::jsonb, NULL, '{"correct": true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-087'), seed_uuid('naplan-y5-004'), 7, 'easy', 'short', 1, '[{"type": "text", "content": "By the time we arrived, the movie had already ___."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/movie-cinema-seats.png", "alt": "An empty cinema with rows of seats and a large screen"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "tense", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["started", "begun", "finished", "ended"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-088'), seed_uuid('naplan-y5-004'), 8, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these events in Australian history in the order they happened, from earliest to most recent."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/australian-history-timeline.png", "alt": "A timeline of key events in Australian history from 1788 to 2000"}, {"type": "ordering", "instruction": "Arrange from earliest to most recent.", "items": ["Federation of Australia (1901)", "First Fleet arrives (1788)", "Sydney Olympics (2000)", "Gold Rush begins (1851)"]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "history", "australia", "year5"]'::jsonb, NULL, '{"correctOrder": ["First Fleet arrives (1788)", "Gold Rush begins (1851)", "Federation of Australia (1901)", "Sydney Olympics (2000)"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-089'), seed_uuid('naplan-y5-004'), 9, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each material to the correct state of matter."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/states-of-matter.png", "alt": "Three panels showing ice as a solid, water as a liquid, and steam as a gas"}, {"type": "matching", "pairs": [{"left": "Ice", "right": "Solid"}, {"left": "Water", "right": "Liquid"}, {"left": "Steam", "right": "Gas"}]}]'::jsonb, '[]'::jsonb, '["general-knowledge", "science", "year5"]'::jsonb, NULL, '{"correctPairs": {"Ice": "Solid", "Water": "Liquid", "Steam": "Gas"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-090'), seed_uuid('naplan-y5-004'), 10, 'easy', 'numeric', 1, '[{"type": "text", "content": "What is 144 divided by 12?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/division-long-144.png", "alt": "A long division layout showing 144 divided by 12"}]'::jsonb, '[]'::jsonb, '["maths", "division", "year5"]'::jsonb, NULL, '{"correct": 12, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-091'), seed_uuid('naplan-y5-005'), 1, 'easy', 'mcq', 1, '[{"type": "text", "content": "What is 10% of 200?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/percentage-bar-10-percent.png", "alt": "A bar model divided into 10 equal sections with one section shaded to represent 10 percent"}, {"type": "mcq", "options": [{"id": "a", "text": "10"}, {"id": "b", "text": "20"}, {"id": "c", "text": "50"}, {"id": "d", "text": "100"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "percentages", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-092'), seed_uuid('naplan-y5-005'), 2, 'medium', 'mcq', 1, '[{"type": "text", "content": "Which of the following is an example of a compound sentence?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/simple-compound-sentence.png", "alt": "A diagram showing a simple sentence and a compound sentence connected by a conjunction"}, {"type": "mcq", "options": [{"id": "a", "text": "The dog barked."}, {"id": "b", "text": "The dog barked and the cat ran away."}, {"id": "c", "text": "Barking loudly."}, {"id": "d", "text": "The big brown dog."}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["english", "grammar", "sentence-types", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-093'), seed_uuid('naplan-y5-005'), 3, 'medium', 'numeric', 1, '[{"type": "text", "content": "A fish tank is 50 cm long, 30 cm wide, and 20 cm tall. What is the volume of the fish tank in cubic centimetres?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/fish-tank-3d-labelled.png", "alt": "A rectangular fish tank with length 50 cm, width 30 cm, and height 20 cm labelled"}]'::jsonb, '[]'::jsonb, '["maths", "volume", "year5"]'::jsonb, NULL, '{"correct": 30000, "tolerance": 0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-094'), seed_uuid('naplan-y5-005'), 4, 'medium', 'multi_select', 1, '[{"type": "text", "content": "Which of the following are continents? Select all that apply."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/world-map-continents-labelled.png", "alt": "A world map with all seven continents clearly labelled"}, {"type": "multi_select", "options": [{"id": "a", "text": "Africa"}, {"id": "b", "text": "India"}, {"id": "c", "text": "Antarctica"}, {"id": "d", "text": "England"}], "correctOptionIds": ["a", "c"], "partialCredit": false}]'::jsonb, '[]'::jsonb, '["general-knowledge", "continents", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-095'), seed_uuid('naplan-y5-005'), 5, 'easy', 'boolean', 1, '[{"type": "text", "content": "Sound travels faster than light."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/sound-light-speed.png", "alt": "A diagram showing a lightning bolt and thunder, illustrating that light arrives before sound"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "science", "year5"]'::jsonb, NULL, '{"correct": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-096'), seed_uuid('naplan-y5-005'), 6, 'easy', 'short', 1, '[{"type": "text", "content": "The scientist made an important ___ during the experiment."}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/scientist-experiment.png", "alt": "A scientist observing a test tube during an experiment in a laboratory"}]'::jsonb, '[]'::jsonb, '["english", "cloze", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["discovery", "observation", "finding"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-097'), seed_uuid('naplan-y5-005'), 7, 'medium', 'ordering', 1, '[{"type": "text", "content": "Put these numbers in order from largest to smallest."}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/place-value-large-numbers.png", "alt": "A place value chart showing columns for ones, tens, hundreds, thousands, ten thousands, and hundred thousands"}, {"type": "ordering", "instruction": "Arrange from largest to smallest.", "items": ["1,250", "12,500", "125", "125,000"]}]'::jsonb, '[]'::jsonb, '["maths", "place-value", "year5"]'::jsonb, NULL, '{"correctOrder": ["125,000", "12,500", "1,250", "125"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-098'), seed_uuid('naplan-y5-005'), 8, 'medium', 'matching', 1, '[{"type": "text", "content": "Match each word to its synonym."}, {"type": "image", "src": "https://cdn.mindmosaic.com/english/y5/synonym-pairs-poster.png", "alt": "A poster showing pairs of synonyms connected by lines, including brave and courageous"}, {"type": "matching", "pairs": [{"left": "brave", "right": "courageous"}, {"left": "tiny", "right": "miniature"}, {"left": "enormous", "right": "gigantic"}]}]'::jsonb, '[]'::jsonb, '["english", "vocabulary", "synonyms", "year5"]'::jsonb, NULL, '{"correctPairs": {"brave": "courageous", "tiny": "miniature", "enormous": "gigantic"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-099'), seed_uuid('naplan-y5-005'), 9, 'medium', 'mcq', 1, '[{"type": "text", "content": "A bag contains 3 red marbles, 5 blue marbles, and 2 green marbles. If you pick one marble without looking, which colour are you most likely to pick?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/maths/y5/marble-bag-probability.png", "alt": "A bag containing 3 red marbles, 5 blue marbles, and 2 green marbles with each colour visible"}, {"type": "mcq", "options": [{"id": "a", "text": "Red"}, {"id": "b", "text": "Blue"}, {"id": "c", "text": "Green"}, {"id": "d", "text": "They are all equally likely"}], "correctOptionId": "b"}]'::jsonb, '[]'::jsonb, '["maths", "probability", "year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-100'), seed_uuid('naplan-y5-005'), 10, 'medium', 'short', 1, '[{"type": "text", "content": "What is the longest river in Australia?"}, {"type": "image", "src": "https://cdn.mindmosaic.com/general/y5/murray-river-map.png", "alt": "A map of south-eastern Australia showing the Murray River and its path through multiple states"}]'::jsonb, '[]'::jsonb, '["general-knowledge", "geography", "year5"]'::jsonb, NULL, '{"acceptedAnswers": ["Murray", "Murray River", "the Murray", "the Murray River"], "caseSensitive": false}'::jsonb, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Step 4: Insert exam_question_options (MCQ + multi_select)
-- Option IDs mapped: a->A, b->B, c->C, d->D
-- =============================================================================

INSERT INTO exam_question_options (question_id, option_id, content, media_reference)
VALUES
  (seed_uuid('q-001'), 'A', '51', NULL),
  (seed_uuid('q-001'), 'B', '61', NULL),
  (seed_uuid('q-001'), 'C', '71', NULL),
  (seed_uuid('q-001'), 'D', '57', NULL),
  (seed_uuid('q-002'), 'A', 'Sad', NULL),
  (seed_uuid('q-002'), 'B', 'Joyful', NULL),
  (seed_uuid('q-002'), 'C', 'Angry', NULL),
  (seed_uuid('q-002'), 'D', 'Tired', NULL),
  (seed_uuid('q-003'), 'A', 'Sydney', NULL),
  (seed_uuid('q-003'), 'B', 'Melbourne', NULL),
  (seed_uuid('q-003'), 'C', 'Canberra', NULL),
  (seed_uuid('q-003'), 'D', 'Brisbane', NULL),
  (seed_uuid('q-004'), 'A', 'Dog', NULL),
  (seed_uuid('q-004'), 'B', 'Run', NULL),
  (seed_uuid('q-004'), 'C', 'Table', NULL),
  (seed_uuid('q-004'), 'D', 'Quickly', NULL),
  (seed_uuid('q-009'), 'A', 'Roses and daisies', NULL),
  (seed_uuid('q-009'), 'B', 'Tomatoes and sunflowers', NULL),
  (seed_uuid('q-009'), 'C', 'Carrots and peas', NULL),
  (seed_uuid('q-009'), 'D', 'Apples and oranges', NULL),
  (seed_uuid('q-011'), 'A', '2', NULL),
  (seed_uuid('q-011'), 'B', '3', NULL),
  (seed_uuid('q-011'), 'C', '4', NULL),
  (seed_uuid('q-011'), 'D', '5', NULL),
  (seed_uuid('q-012'), 'A', 'The dog ran fast.', NULL),
  (seed_uuid('q-012'), 'B', 'The dog ran fast', NULL),
  (seed_uuid('q-012'), 'C', 'The dog. ran fast', NULL),
  (seed_uuid('q-012'), 'D', '.The dog ran fast', NULL),
  (seed_uuid('q-013'), 'A', 'Summer', NULL),
  (seed_uuid('q-013'), 'B', 'Monsoon', NULL),
  (seed_uuid('q-013'), 'C', 'Autumn', NULL),
  (seed_uuid('q-013'), 'D', 'Harvest', NULL),
  (seed_uuid('q-018'), 'A', '20 minutes', NULL),
  (seed_uuid('q-018'), 'B', '30 minutes', NULL),
  (seed_uuid('q-018'), 'C', '40 minutes', NULL),
  (seed_uuid('q-018'), 'D', '60 minutes', NULL),
  (seed_uuid('q-021'), 'A', '$1.20', NULL),
  (seed_uuid('q-021'), 'B', '$1.30', NULL),
  (seed_uuid('q-021'), 'C', '$1.40', NULL),
  (seed_uuid('q-021'), 'D', '$1.50', NULL),
  (seed_uuid('q-022'), 'A', 'energetic', NULL),
  (seed_uuid('q-022'), 'B', 'tired', NULL),
  (seed_uuid('q-022'), 'C', 'loud', NULL),
  (seed_uuid('q-022'), 'D', 'hungry', NULL),
  (seed_uuid('q-024'), 'A', '14', NULL),
  (seed_uuid('q-024'), 'B', '23', NULL),
  (seed_uuid('q-024'), 'C', '36', NULL),
  (seed_uuid('q-024'), 'D', '41', NULL),
  (seed_uuid('q-028'), 'A', 'Blue', NULL),
  (seed_uuid('q-028'), 'B', 'Green', NULL),
  (seed_uuid('q-028'), 'C', 'Red', NULL),
  (seed_uuid('q-028'), 'D', 'Yellow', NULL),
  (seed_uuid('q-030'), 'A', 'Indian Ocean', NULL),
  (seed_uuid('q-030'), 'B', 'Arctic Ocean', NULL),
  (seed_uuid('q-030'), 'C', 'Pacific Ocean', NULL),
  (seed_uuid('q-030'), 'D', 'Atlantic Ocean', NULL),
  (seed_uuid('q-031'), 'A', '5', NULL),
  (seed_uuid('q-031'), 'B', '50', NULL),
  (seed_uuid('q-031'), 'C', '500', NULL),
  (seed_uuid('q-031'), 'D', '55', NULL),
  (seed_uuid('q-032'), 'A', 'children', NULL),
  (seed_uuid('q-032'), 'B', 'played', NULL),
  (seed_uuid('q-032'), 'C', 'park', NULL),
  (seed_uuid('q-032'), 'D', 'the', NULL),
  (seed_uuid('q-034'), 'A', 'Tall', NULL),
  (seed_uuid('q-034'), 'B', 'Jump', NULL),
  (seed_uuid('q-034'), 'C', 'Bright', NULL),
  (seed_uuid('q-034'), 'D', 'House', NULL),
  (seed_uuid('q-039'), 'A', 'Reptile', NULL),
  (seed_uuid('q-039'), 'B', 'Bird', NULL),
  (seed_uuid('q-039'), 'C', 'Mammal', NULL),
  (seed_uuid('q-039'), 'D', 'Fish', NULL),
  (seed_uuid('q-041'), 'A', 'At school', NULL),
  (seed_uuid('q-041'), 'B', 'In the park', NULL),
  (seed_uuid('q-041'), 'C', 'At the shops', NULL),
  (seed_uuid('q-041'), 'D', 'In his backyard', NULL),
  (seed_uuid('q-044'), 'A', '10', NULL),
  (seed_uuid('q-044'), 'B', '50', NULL),
  (seed_uuid('q-044'), 'C', '100', NULL),
  (seed_uuid('q-044'), 'D', '1000', NULL),
  (seed_uuid('q-047'), 'A', 'Tree', NULL),
  (seed_uuid('q-047'), 'B', 'Rock', NULL),
  (seed_uuid('q-047'), 'C', 'Cat', NULL),
  (seed_uuid('q-047'), 'D', 'Chair', NULL),
  (seed_uuid('q-050'), 'A', '5', NULL),
  (seed_uuid('q-050'), 'B', '6', NULL),
  (seed_uuid('q-050'), 'C', '7', NULL),
  (seed_uuid('q-050'), 'D', '10', NULL),
  (seed_uuid('q-051'), 'A', 'Over 1,500 kilometres', NULL),
  (seed_uuid('q-051'), 'B', 'Over 2,300 kilometres', NULL),
  (seed_uuid('q-051'), 'C', 'Over 3,000 kilometres', NULL),
  (seed_uuid('q-051'), 'D', 'Over 1,000 kilometres', NULL),
  (seed_uuid('q-052'), 'A', 'Fishing boats', NULL),
  (seed_uuid('q-052'), 'B', 'Rising ocean temperatures', NULL),
  (seed_uuid('q-052'), 'C', 'Sharks', NULL),
  (seed_uuid('q-052'), 'D', 'Pollution from factories', NULL),
  (seed_uuid('q-054'), 'A', 'and', NULL),
  (seed_uuid('q-054'), 'B', 'quickly', NULL),
  (seed_uuid('q-054'), 'C', 'but', NULL),
  (seed_uuid('q-054'), 'D', 'table', NULL),
  (seed_uuid('q-058'), 'A', 'Venus', NULL),
  (seed_uuid('q-058'), 'B', 'Mars', NULL),
  (seed_uuid('q-058'), 'C', 'Mercury', NULL),
  (seed_uuid('q-058'), 'D', 'Earth', NULL),
  (seed_uuid('q-061'), 'A', '13 square cm', NULL),
  (seed_uuid('q-061'), 'B', '26 square cm', NULL),
  (seed_uuid('q-061'), 'C', '40 square cm', NULL),
  (seed_uuid('q-061'), 'D', '80 square cm', NULL),
  (seed_uuid('q-062'), 'A', 'Animals are falling from the sky', NULL),
  (seed_uuid('q-062'), 'B', 'It is raining very heavily', NULL),
  (seed_uuid('q-062'), 'C', 'Pets are running outside', NULL),
  (seed_uuid('q-062'), 'D', 'The weather is unpredictable', NULL),
  (seed_uuid('q-064'), 'A', '83', NULL),
  (seed_uuid('q-064'), 'B', '160', NULL),
  (seed_uuid('q-064'), 'C', '240', NULL),
  (seed_uuid('q-064'), 'D', '320', NULL),
  (seed_uuid('q-065'), 'A', '3', NULL),
  (seed_uuid('q-065'), 'B', '5', NULL),
  (seed_uuid('q-065'), 'C', '8', NULL),
  (seed_uuid('q-065'), 'D', '9', NULL),
  (seed_uuid('q-071'), 'A', 'The Moon', NULL),
  (seed_uuid('q-071'), 'B', 'The wind', NULL),
  (seed_uuid('q-071'), 'C', 'The Sun', NULL),
  (seed_uuid('q-071'), 'D', 'The clouds', NULL),
  (seed_uuid('q-073'), 'A', '45 degrees', NULL),
  (seed_uuid('q-073'), 'B', '90 degrees', NULL),
  (seed_uuid('q-073'), 'C', '180 degrees', NULL),
  (seed_uuid('q-073'), 'D', '360 degrees', NULL),
  (seed_uuid('q-075'), 'A', 'Mercury', NULL),
  (seed_uuid('q-075'), 'B', 'Jupiter', NULL),
  (seed_uuid('q-075'), 'C', 'Venus', NULL),
  (seed_uuid('q-075'), 'D', 'Saturn', NULL),
  (seed_uuid('q-080'), 'A', 'The dog''s ate their food.', NULL),
  (seed_uuid('q-080'), 'B', 'The dogs'' owner was kind.', NULL),
  (seed_uuid('q-080'), 'C', 'The dog''s is very playful.', NULL),
  (seed_uuid('q-080'), 'D', 'The dogs''s collar was red.', NULL),
  (seed_uuid('q-081'), 'A', '5.0', NULL),
  (seed_uuid('q-081'), 'B', '5.10', NULL),
  (seed_uuid('q-081'), 'C', '6.0', NULL),
  (seed_uuid('q-081'), 'D', '6.10', NULL),
  (seed_uuid('q-082'), 'A', 'Very', NULL),
  (seed_uuid('q-082'), 'B', 'Not', NULL),
  (seed_uuid('q-082'), 'C', 'Again', NULL),
  (seed_uuid('q-082'), 'D', 'Before', NULL),
  (seed_uuid('q-084'), 'A', 'Football', NULL),
  (seed_uuid('q-084'), 'B', 'Netball', NULL),
  (seed_uuid('q-084'), 'C', 'Tennis', NULL),
  (seed_uuid('q-084'), 'D', 'They were all equal', NULL),
  (seed_uuid('q-085'), 'A', 'she', NULL),
  (seed_uuid('q-085'), 'B', 'pencil', NULL),
  (seed_uuid('q-085'), 'C', 'they', NULL),
  (seed_uuid('q-085'), 'D', 'slowly', NULL),
  (seed_uuid('q-091'), 'A', '10', NULL),
  (seed_uuid('q-091'), 'B', '20', NULL),
  (seed_uuid('q-091'), 'C', '50', NULL),
  (seed_uuid('q-091'), 'D', '100', NULL),
  (seed_uuid('q-092'), 'A', 'The dog barked.', NULL),
  (seed_uuid('q-092'), 'B', 'The dog barked and the cat ran away.', NULL),
  (seed_uuid('q-092'), 'C', 'Barking loudly.', NULL),
  (seed_uuid('q-092'), 'D', 'The big brown dog.', NULL),
  (seed_uuid('q-094'), 'A', 'Africa', NULL),
  (seed_uuid('q-094'), 'B', 'India', NULL),
  (seed_uuid('q-094'), 'C', 'Antarctica', NULL),
  (seed_uuid('q-094'), 'D', 'England', NULL),
  (seed_uuid('q-099'), 'A', 'Red', NULL),
  (seed_uuid('q-099'), 'B', 'Blue', NULL),
  (seed_uuid('q-099'), 'C', 'Green', NULL),
  (seed_uuid('q-099'), 'D', 'They are all equally likely', NULL)
ON CONFLICT (question_id, option_id) DO NOTHING;


-- =============================================================================
-- Step 5: Insert exam_correct_answers (100 rows)
-- Covers: mcq, multi_select, short, numeric, boolean, ordering, matching
-- =============================================================================

INSERT INTO exam_correct_answers (question_id, answer_type, correct_option_id, accepted_answers, case_sensitive, exact_value, range_min, range_max, tolerance, unit, rubric, sample_response)
VALUES
  (seed_uuid('q-001'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-002'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-003'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-004'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-005'), 'short', NULL, '["mat", "Mat"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-006'), 'numeric', NULL, NULL, NULL, 32, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-007'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-008'), 'ordering', NULL, '["7", "12", "38", "45"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-009'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-010'), 'short', NULL, '["every morning", "every morning before class", "before class", "in the morning"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-011'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-012'), 'mcq', 'A', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-013'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-014'), 'numeric', NULL, NULL, NULL, 24, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-015'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-016'), 'short', NULL, '["went", "walked", "ran"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-017'), 'matching', NULL, '{"Fish": "Water", "Bird": "Nest", "Rabbit": "Burrow"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-018'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-019'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-020'), 'short', NULL, '["cold", "freezing", "cool"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-021'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-022'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-023'), 'numeric', NULL, NULL, NULL, 5, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-024'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-025'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-026'), 'ordering', NULL, '["apple", "banana", "dolphin", "elephant"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-027'), 'short', NULL, '["25"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-028'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-029'), 'short', NULL, '["shells", "Shells", "sea shells", "seashells"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-030'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-031'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-032'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-033'), 'numeric', NULL, NULL, NULL, 43, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-034'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-035'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-036'), 'short', NULL, '["small", "little", "tiny"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-037'), 'matching', NULL, '{"Triangle": "3", "Rectangle": "4", "Pentagon": "5"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-038'), 'ordering', NULL, '["January", "March", "June", "September"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-039'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-040'), 'short', NULL, '["children"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-041'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-042'), 'short', NULL, '["Biscuit", "biscuit"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-043'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-044'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-045'), 'numeric', NULL, NULL, NULL, 60, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-046'), 'numeric', NULL, NULL, NULL, 15, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-047'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-048'), 'short', NULL, '["school", "School"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-049'), 'ordering', NULL, '["Egg", "Caterpillar", "Chrysalis", "Butterfly"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-050'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-051'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-052'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-053'), 'numeric', NULL, NULL, NULL, 96, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-054'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-055'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-056'), 'short', NULL, '["1/2", "one half", "one-half"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-057'), 'ordering', NULL, '["0.1", "0.3", "0.5", "0.75"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-058'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-059'), 'short', NULL, '["ate", "finished", "had"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-060'), 'matching', NULL, '{"New South Wales": "Sydney", "Victoria": "Melbourne", "Queensland": "Brisbane"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-061'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-062'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-063'), 'numeric', NULL, NULL, NULL, 80, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-064'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-065'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-066'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-067'), 'short', NULL, '["there"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-068'), 'matching', NULL, '{"quickly": "Adverb", "beautiful": "Adjective", "swimming": "Verb"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-069'), 'ordering', NULL, '["-5", "-1", "0", "3"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-070'), 'short', NULL, '["ran"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-071'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-072'), 'short', NULL, '["precipitation", "Precipitation"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-073'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-074'), 'numeric', NULL, NULL, NULL, 36, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-075'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-076'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-077'), 'ordering', NULL, '["Evaporation", "Condensation", "Precipitation", "Collection"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-078'), 'short', NULL, '["modern", "new", "recent"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-079'), 'matching', NULL, '{"Length of a pencil": "Centimetres", "Weight of a car": "Kilograms", "Water in a pool": "Litres"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-080'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-081'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-082'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-083'), 'numeric', NULL, NULL, NULL, 25, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-084'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-085'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-086'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-087'), 'short', NULL, '["started", "begun", "finished", "ended"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-088'), 'ordering', NULL, '["First Fleet arrives (1788)", "Gold Rush begins (1851)", "Federation of Australia (1901)", "Sydney Olympics (2000)"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-089'), 'matching', NULL, '{"Ice": "Solid", "Water": "Liquid", "Steam": "Gas"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-090'), 'numeric', NULL, NULL, NULL, 12, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-091'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-092'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-093'), 'numeric', NULL, NULL, NULL, 30000, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-094'), 'multi_select', NULL, '["A", "C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-095'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-096'), 'short', NULL, '["discovery", "observation", "finding"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-097'), 'ordering', NULL, '["125,000", "12,500", "1,250", "125"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-098'), 'matching', NULL, '{"brave": "courageous", "tiny": "miniature", "enormous": "gigantic"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-099'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-100'), 'short', NULL, '["Murray", "Murray River", "the Murray", "the Murray River"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (question_id) DO NOTHING;


-- =============================================================================
-- Step 6: Cleanup — drop seed helper function
-- [FIX 3] Removes seed_uuid() from public schema after use.
-- =============================================================================

DROP FUNCTION IF EXISTS seed_uuid(TEXT);

COMMIT;

-- =============================================================================
-- Verification (run manually after deployment)
-- =============================================================================
-- SELECT count(*) AS exams FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice%';
-- SELECT count(*) AS questions FROM exam_questions WHERE exam_package_id IN (SELECT id FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice%');
-- SELECT count(*) AS options FROM exam_question_options WHERE question_id IN (SELECT id FROM exam_questions WHERE exam_package_id IN (SELECT id FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice%'));
-- SELECT count(*) AS answers FROM exam_correct_answers WHERE question_id IN (SELECT id FROM exam_questions WHERE exam_package_id IN (SELECT id FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice%'));
-- Expected: 10 exams, 100 questions, 168 options, 100 answers