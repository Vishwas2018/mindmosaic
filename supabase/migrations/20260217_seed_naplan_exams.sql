-- =============================================================================
-- MindMosaic -- Seed Data Migration: 10 Additional NAPLAN Exams (100 Questions)
-- Migration: 20260217_seed_naplan_exams_batch2.sql
--
-- This migration is self-contained and idempotent.
-- It adds questions q-101 to q-200, 10 new exam_packages, and all
-- associated options and correct answers.
--
-- Prerequisites:
--   - 001_exam_schema.sql
--   - 014_scoring_engine.sql
--   - 20260215_question_engine_v1.sql  (or guards below will add the columns)
--
-- Safety:
--   - All enum additions are idempotent (pg_enum existence check)
--   - All column additions are idempotent (IF NOT EXISTS)
--   - All INSERTs use ON CONFLICT DO NOTHING
--   - seed_uuid() uses md5() — no extension required
--   - seed_uuid() is dropped at end of migration
-- =============================================================================

-- =============================================================================
-- Step 0: Enum prerequisites (committed in isolation — ADD VALUE restriction)
-- =============================================================================

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='mixed'
    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='subject'))
  THEN ALTER TYPE subject ADD VALUE 'mixed'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='boolean'
    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='response_type'))
  THEN ALTER TYPE response_type ADD VALUE 'boolean'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='ordering'
    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='response_type'))
  THEN ALTER TYPE response_type ADD VALUE 'ordering'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='matching'
    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='response_type'))
  THEN ALTER TYPE response_type ADD VALUE 'matching'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='multi_select'
    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='response_type'))
  THEN ALTER TYPE response_type ADD VALUE 'multi_select'; END IF;
END $$;

COMMIT;

-- =============================================================================
-- Step 1: Column guards and UUID helper
-- =============================================================================

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='exam_packages' AND column_name='pass_mark_percentage')
  THEN ALTER TABLE public.exam_packages ADD COLUMN pass_mark_percentage SMALLINT DEFAULT NULL; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='exam_questions' AND column_name='stimulus')
  THEN
    ALTER TABLE public.exam_questions ADD COLUMN stimulus JSONB DEFAULT NULL;
    COMMENT ON COLUMN public.exam_questions.stimulus IS
      'Stimulus/passage content for passage_group questions.';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='exam_questions' AND column_name='validation')
  THEN
    ALTER TABLE public.exam_questions ADD COLUMN validation JSONB DEFAULT NULL;
    COMMENT ON COLUMN public.exam_questions.validation IS
      'Scoring/validation rules per response_type.';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='exam_questions' AND column_name='stimulus_group_id')
  THEN
    ALTER TABLE public.exam_questions ADD COLUMN stimulus_group_id TEXT DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='exam_questions' AND column_name='multi_part_group_id')
  THEN
    ALTER TABLE public.exam_questions ADD COLUMN multi_part_group_id TEXT DEFAULT NULL;
  END IF;
END $$;

-- Deterministic UUID from md5 — no extension dependency
CREATE OR REPLACE FUNCTION seed_uuid(key TEXT)
RETURNS UUID AS $$
  SELECT (
    lpad(to_hex(('x'||substr(md5('mindmosaic.seed.'||key), 1, 8))::bit(32)::bigint),8,'0')||'-'||
    lpad(to_hex(('x'||substr(md5('mindmosaic.seed.'||key), 9, 4))::bit(16)::bigint),4,'0')||'-'||
    '4'||substr(md5('mindmosaic.seed.'||key),14,3)||'-'||
    lpad(to_hex((('x'||substr(md5('mindmosaic.seed.'||key),17,2))::bit(8)::bigint & 63)|128),2,'0')||
    substr(md5('mindmosaic.seed.'||key),19,2)||'-'||
    substr(md5('mindmosaic.seed.'||key),21,12)
  )::uuid;
$$ LANGUAGE sql IMMUTABLE STRICT SET search_path = '';

-- =============================================================================
-- Step 2: Insert exam_packages (10 rows — Exams 6-10 for Year 3 and Year 5)
-- =============================================================================

INSERT INTO exam_packages (id, title, year_level, subject, assessment_type,
  duration_minutes, total_marks, version, schema_version, status,
  instructions, pass_mark_percentage)
VALUES
  (seed_uuid('naplan-y3-006'), 'Year 3 NAPLAN Practice -- Exam 6', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-007'), 'Year 3 NAPLAN Practice -- Exam 7', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-008'), 'Year 3 NAPLAN Practice -- Exam 8', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-009'), 'Year 3 NAPLAN Practice -- Exam 9', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y3-010'), 'Year 3 NAPLAN Practice -- Exam 10', 3, 'mixed', 'naplan', 30, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 30 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-006'), 'Year 5 NAPLAN Practice -- Exam 6', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-007'), 'Year 5 NAPLAN Practice -- Exam 7', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-008'), 'Year 5 NAPLAN Practice -- Exam 8', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-009'), 'Year 5 NAPLAN Practice -- Exam 9', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50),
  (seed_uuid('naplan-y5-010'), 'Year 5 NAPLAN Practice -- Exam 10', 5, 'mixed', 'naplan', 45, 10, '1.0.0', '1.0.0', 'published', '["Read each question carefully before answering.", "You have 45 minutes to complete this exam.", "Each question is worth 1 mark."]'::jsonb, 50)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Step 3: Insert exam_questions (100 rows — q-101 to q-200)
-- =============================================================================

INSERT INTO exam_questions (id, exam_package_id, sequence_number, difficulty,
  response_type, marks, prompt_blocks, media_references, tags, hint,
  validation, stimulus, stimulus_group_id, multi_part_group_id)
VALUES
  (seed_uuid('q-101'), seed_uuid('naplan-y3-006'), 1, 'easy', 'mcq', 1, '[{"type":"text","content":"What is 24 + 37?"},{"type":"image","src":"https://cdn.mindmosaic.com/maths/y3/addition-number-line.png","alt":"A number line showing numbers from 0 to 100 in increments of 10"},{"type":"mcq","options":[{"id":"a","text":"51"},{"id":"b","text":"61"},{"id":"c","text":"71"},{"id":"d","text":"57"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","addition","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-102'), seed_uuid('naplan-y3-006'), 2, 'easy', 'mcq', 1, '[{"type":"text","content":"Which word means the same as ''happy''?"},{"type":"image","src":"https://cdn.mindmosaic.com/english/y3/happy-faces-vocabulary.png","alt":"Four cartoon faces showing different emotions: happy, sad, angry, and tired"},{"type":"mcq","options":[{"id":"a","text":"Sad"},{"id":"b","text":"Joyful"},{"id":"c","text":"Angry"},{"id":"d","text":"Tired"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["english","vocabulary","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-103'), seed_uuid('naplan-y3-006'), 3, 'medium', 'mcq', 1, '[{"type":"text","content":"What is the capital city of Australia?"},{"type":"image","src":"https://cdn.mindmosaic.com/gk/y3/map-of-australia-capitals.png","alt":"A simple map of Australia showing the locations of major capital cities"},{"type":"mcq","options":[{"id":"a","text":"Sydney"},{"id":"b","text":"Melbourne"},{"id":"c","text":"Canberra"},{"id":"d","text":"Brisbane"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["general-knowledge","australia","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-104'), seed_uuid('naplan-y3-006'), 4, 'medium', 'multi_select', 1, '[{"type":"text","content":"Which TWO words are nouns? Select both."},{"type":"multi_select","options":[{"id":"a","text":"Dog"},{"id":"b","text":"Run"},{"id":"c","text":"Table"},{"id":"d","text":"Quickly"}],"correctOptionIds":["a","c"],"partialCredit":false}]'::jsonb, '[]'::jsonb, '["english","grammar","nouns","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-105'), seed_uuid('naplan-y3-006'), 5, 'easy', 'short', 1, '[{"type":"text","content":"The cat sat on the ___."},{"type":"image","src":"https://cdn.mindmosaic.com/english/y3/cat-on-mat.png","alt":"A cartoon cat sitting on a colourful mat"}]'::jsonb, '[]'::jsonb, '["english","spelling","cloze","year3"]'::jsonb, NULL, '{"acceptedAnswers":["mat"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-106'), seed_uuid('naplan-y3-006'), 6, 'easy', 'numeric', 1, '[{"type":"text","content":"What is 50 minus 18?"},{"type":"image","src":"https://cdn.mindmosaic.com/maths/y3/subtraction-blocks.png","alt":"A set of 50 counting blocks with 18 blocks crossed out"}]'::jsonb, '[]'::jsonb, '["maths","subtraction","year3"]'::jsonb, NULL, '{"correct":32,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-107'), seed_uuid('naplan-y3-006'), 7, 'easy', 'boolean', 1, '[{"type":"text","content":"A kangaroo is a type of reptile."},{"type":"image","src":"https://cdn.mindmosaic.com/gk/y3/kangaroo-grassland.png","alt":"A kangaroo standing in an Australian grassland"}]'::jsonb, '[]'::jsonb, '["general-knowledge","animals","year3"]'::jsonb, NULL, '{"correct":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-108'), seed_uuid('naplan-y3-006'), 8, 'medium', 'ordering', 1, '[{"type":"text","content":"Put the parts of a persuasive text in the correct order from first to last."},{"type":"ordering","instruction":"Order from first to last.","items":["Conclusion","Reasons and evidence","Opening statement of opinion"]}]'::jsonb, '[]'::jsonb, '["english","writing","persuasive","year3"]'::jsonb, NULL, '{"correctOrder":["Opening statement of opinion","Reasons and evidence","Conclusion"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-109'), seed_uuid('naplan-y3-006'), 9, 'easy', 'mcq', 1, '[{"type":"text","content":"Which of the following is a living thing?"},{"type":"mcq","options":[{"id":"a","text":"Rock"},{"id":"b","text":"Water"},{"id":"c","text":"Fern"},{"id":"d","text":"Cloud"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["science","living-things","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-110'), seed_uuid('naplan-y3-006'), 10, 'easy', 'mcq', 1, '[{"type":"text","content":"Which of the following is spelt correctly?"},{"type":"mcq","options":[{"id":"a","text":"becuase"},{"id":"b","text":"becouse"},{"id":"c","text":"because"},{"id":"d","text":"beacuse"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["spelling","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-111'), seed_uuid('naplan-y3-007'), 1, 'easy', 'short', 1, '[{"type":"text","content":"Spell the word that means a place where books are kept and borrowed."}]'::jsonb, '[]'::jsonb, '["spelling","year3"]'::jsonb, NULL, '{"acceptedAnswers":["library"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-112'), seed_uuid('naplan-y3-007'), 2, 'medium', 'matching', 1, '[{"type":"text","content":"Match each animal to where it lives."},{"type":"matching","pairs":[{"left":"Dolphin","right":"Ocean"},{"left":"Koala","right":"Eucalyptus tree"},{"left":"Earthworm","right":"Soil"}]}]'::jsonb, '[]'::jsonb, '["science","living-things","year3"]'::jsonb, NULL, '{"correctPairs":{"Dolphin":"Ocean","Koala":"Eucalyptus tree","Earthworm":"Soil"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-113'), seed_uuid('naplan-y3-007'), 3, 'medium', 'mcq', 1, '[{"type":"text","content":"What is the value of the digit 6 in the number 364?"},{"type":"mcq","options":[{"id":"a","text":"6"},{"id":"b","text":"60"},{"id":"c","text":"600"},{"id":"d","text":"6000"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","place-value","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-114'), seed_uuid('naplan-y3-007'), 4, 'easy', 'boolean', 1, '[{"type":"text","content":"The Sun is a star."}]'::jsonb, '[]'::jsonb, '["science","weather","year3"]'::jsonb, NULL, '{"correct":true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-115'), seed_uuid('naplan-y3-007'), 5, 'easy', 'mcq', 1, '[{"type":"text","content":"Which word is a verb in the sentence below?\n\n''The dog barked loudly at the gate.''"},{"type":"mcq","options":[{"id":"a","text":"dog"},{"id":"b","text":"loudly"},{"id":"c","text":"barked"},{"id":"d","text":"gate"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["english","grammar","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-116'), seed_uuid('naplan-y3-007'), 6, 'medium', 'numeric', 1, '[{"type":"text","content":"A box holds 6 eggs. How many eggs are in 7 boxes?"}]'::jsonb, '[]'::jsonb, '["maths","multiplication","year3"]'::jsonb, NULL, '{"correct":42,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-117'), seed_uuid('naplan-y3-007'), 7, 'medium', 'mcq', 1, '[{"type":"text","content":"Which fraction is equal to one half?"},{"type":"image","src":"https://cdn.mindmosaic.com/maths/y3/fractions-halves-quarters.png","alt":"Diagrams showing fractions including halves, quarters and thirds"},{"type":"mcq","options":[{"id":"a","text":"1/3"},{"id":"b","text":"2/6"},{"id":"c","text":"3/4"},{"id":"d","text":"1/4"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","fractions","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-118'), seed_uuid('naplan-y3-007'), 8, 'medium', 'ordering', 1, '[{"type":"text","content":"Put the parts of a narrative text in the correct order from first to last."},{"type":"ordering","instruction":"Order from first to last.","items":["Resolution","Complication","Orientation"]}]'::jsonb, '[]'::jsonb, '["english","writing","narrative","year3"]'::jsonb, NULL, '{"correctOrder":["Orientation","Complication","Resolution"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-119'), seed_uuid('naplan-y3-007'), 9, 'easy', 'mcq', 1, '[{"type":"text","content":"Which Australian animal carries its baby in a pouch?"},{"type":"mcq","options":[{"id":"a","text":"Platypus"},{"id":"b","text":"Crocodile"},{"id":"c","text":"Kangaroo"},{"id":"d","text":"Echidna"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["general-knowledge","australia","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-120'), seed_uuid('naplan-y3-007'), 10, 'medium', 'short', 1, '[{"type":"text","content":"Spell the word that describes the season when trees lose their leaves."}]'::jsonb, '[]'::jsonb, '["spelling","year3"]'::jsonb, NULL, '{"acceptedAnswers":["autumn"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-121'), seed_uuid('naplan-y3-008'), 1, 'easy', 'mcq', 1, '[{"type":"text","content":"How many days are in one week?"},{"type":"mcq","options":[{"id":"a","text":"5"},{"id":"b","text":"6"},{"id":"c","text":"7"},{"id":"d","text":"8"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["maths","time","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-122'), seed_uuid('naplan-y3-008'), 2, 'easy', 'matching', 1, '[{"type":"text","content":"Match each word to its word type."},{"type":"matching","pairs":[{"left":"quickly","right":"adverb"},{"left":"jump","right":"verb"},{"left":"shiny","right":"adjective"}]}]'::jsonb, '[]'::jsonb, '["english","grammar","year3"]'::jsonb, NULL, '{"correctPairs":{"quickly":"adverb","jump":"verb","shiny":"adjective"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-123'), seed_uuid('naplan-y3-008'), 3, 'medium', 'boolean', 1, '[{"type":"text","content":"A square has four equal sides and four right angles."}]'::jsonb, '[]'::jsonb, '["maths","geometry","year3"]'::jsonb, NULL, '{"correct":true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-124'), seed_uuid('naplan-y3-008'), 4, 'medium', 'mcq', 1, '[{"type":"text","content":"Which material would be best to make a raincoat?"},{"type":"mcq","options":[{"id":"a","text":"Paper"},{"id":"b","text":"Wool"},{"id":"c","text":"Waterproof plastic"},{"id":"d","text":"Cotton fabric"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["science","materials","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-125'), seed_uuid('naplan-y3-008'), 5, 'easy', 'mcq', 1, '[{"type":"text","content":"Which of the following is spelt correctly?"},{"type":"mcq","options":[{"id":"a","text":"wensday"},{"id":"b","text":"Wednesday"},{"id":"c","text":"Wendesday"},{"id":"d","text":"Wendsday"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["spelling","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-126'), seed_uuid('naplan-y3-008'), 6, 'easy', 'numeric', 1, '[{"type":"text","content":"Mia has 15 stickers. Her friend gives her 28 more. How many stickers does Mia have now?"}]'::jsonb, '[]'::jsonb, '["maths","addition","year3"]'::jsonb, NULL, '{"correct":43,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-127'), seed_uuid('naplan-y3-008'), 7, 'medium', 'mcq', 1, '[{"type":"text","content":"Where did Sam find the puppy?"},{"type":"mcq","options":[{"id":"a","text":"In the park"},{"id":"b","text":"Outside the school gate"},{"id":"c","text":"At the shops"},{"id":"d","text":"In the playground"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["literacy","comprehension","year3"]'::jsonb, NULL, NULL, '{"title":"The Lost Puppy","content":"One rainy afternoon, Sam found a small brown puppy sitting outside the school gate. It had no collar and looked very hungry. Sam brought it inside and gave it some water. The next day, a girl named Lily came to the school looking for her lost puppy, Max.","image":null}'::jsonb, 'sg-y3-001', NULL),
  (seed_uuid('q-128'), seed_uuid('naplan-y3-008'), 8, 'easy', 'boolean', 1, '[{"type":"text","content":"Did the puppy have a collar when Sam found it?"}]'::jsonb, '[]'::jsonb, '["literacy","comprehension","year3"]'::jsonb, NULL, '{"correct":false}'::jsonb, '{"title":"The Lost Puppy","content":"One rainy afternoon, Sam found a small brown puppy sitting outside the school gate. It had no collar and looked very hungry. Sam brought it inside and gave it some water. The next day, a girl named Lily came to the school looking for her lost puppy, Max.","image":null}'::jsonb, 'sg-y3-001', NULL),
  (seed_uuid('q-129'), seed_uuid('naplan-y3-008'), 9, 'medium', 'short', 1, '[{"type":"text","content":"What was the name of the lost puppy?"}]'::jsonb, '[]'::jsonb, '["literacy","comprehension","year3"]'::jsonb, NULL, '{"acceptedAnswers":["Max","max"],"caseSensitive":false}'::jsonb, '{"title":"The Lost Puppy","content":"One rainy afternoon, Sam found a small brown puppy sitting outside the school gate. It had no collar and looked very hungry. Sam brought it inside and gave it some water. The next day, a girl named Lily came to the school looking for her lost puppy, Max.","image":null}'::jsonb, 'sg-y3-001', NULL),
  (seed_uuid('q-130'), seed_uuid('naplan-y3-008'), 10, 'easy', 'mcq', 1, '[{"type":"text","content":"How many sides does a hexagon have?"},{"type":"image","src":"https://cdn.mindmosaic.com/maths/y3/hexagon-shape.png","alt":"A regular hexagon with six equal sides"},{"type":"mcq","options":[{"id":"a","text":"4"},{"id":"b","text":"5"},{"id":"c","text":"6"},{"id":"d","text":"8"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["maths","shapes","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-131'), seed_uuid('naplan-y3-009'), 1, 'medium', 'multi_select', 1, '[{"type":"text","content":"Which TWO things do plants need to grow? Select both."},{"type":"multi_select","options":[{"id":"a","text":"Sunlight"},{"id":"b","text":"Music"},{"id":"c","text":"Water"},{"id":"d","text":"Plastic"}],"correctOptionIds":["a","c"],"partialCredit":false}]'::jsonb, '[]'::jsonb, '["science","living-things","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-132'), seed_uuid('naplan-y3-009'), 2, 'medium', 'mcq', 1, '[{"type":"text","content":"Tom buys a book for $3.50 and a pencil for $1.20. How much does he spend altogether?"},{"type":"mcq","options":[{"id":"a","text":"$4.50"},{"id":"b","text":"$4.60"},{"id":"c","text":"$4.70"},{"id":"d","text":"$5.00"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["maths","money","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-133'), seed_uuid('naplan-y3-009'), 3, 'easy', 'mcq', 1, '[{"type":"text","content":"Which sentence uses a question mark correctly?"},{"type":"mcq","options":[{"id":"a","text":"Where are you going."},{"id":"b","text":"Where are you going?"},{"id":"c","text":"Where are you going!"},{"id":"d","text":"where are you going?"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["english","grammar","punctuation","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-134'), seed_uuid('naplan-y3-009'), 4, 'medium', 'numeric', 1, '[{"type":"text","content":"24 students are put into groups of 4. How many groups are there?"}]'::jsonb, '[]'::jsonb, '["maths","division","year3"]'::jsonb, NULL, '{"correct":6,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-135'), seed_uuid('naplan-y3-009'), 5, 'medium', 'matching', 1, '[{"type":"text","content":"Match each object to the material it is made from."},{"type":"matching","pairs":[{"left":"Window","right":"Glass"},{"left":"Jumper","right":"Wool"},{"left":"Spoon","right":"Metal"}]}]'::jsonb, '[]'::jsonb, '["science","materials","year3"]'::jsonb, NULL, '{"correctPairs":{"Window":"Glass","Jumper":"Wool","Spoon":"Metal"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-136'), seed_uuid('naplan-y3-009'), 6, 'easy', 'mcq', 1, '[{"type":"text","content":"What colour is the circle on the Australian flag?"},{"type":"image","src":"https://cdn.mindmosaic.com/gk/y3/australian-flag.png","alt":"The Australian flag showing the Union Jack, Commonwealth Star and Southern Cross"},{"type":"mcq","options":[{"id":"a","text":"Red"},{"id":"b","text":"Green"},{"id":"c","text":"Gold"},{"id":"d","text":"There is no circle"}],"correctOptionId":"d"}]'::jsonb, '[]'::jsonb, '["general-knowledge","australia","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-137'), seed_uuid('naplan-y3-009'), 7, 'easy', 'short', 1, '[{"type":"text","content":"Spell the word for the large body of salt water that covers most of the Earth."}]'::jsonb, '[]'::jsonb, '["spelling","year3"]'::jsonb, NULL, '{"acceptedAnswers":["ocean"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-138'), seed_uuid('naplan-y3-009'), 8, 'easy', 'ordering', 1, '[{"type":"text","content":"Put these numbers in order from smallest to largest."},{"type":"ordering","instruction":"Order from smallest to largest.","items":["412","98","305","1000"]}]'::jsonb, '[]'::jsonb, '["maths","number","year3"]'::jsonb, NULL, '{"correctOrder":["98","305","412","1000"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-139'), seed_uuid('naplan-y3-009'), 9, 'medium', 'mcq', 1, '[{"type":"text","content":"Which word correctly completes the sentence?\n\n''She ___ to school every day.''"},{"type":"mcq","options":[{"id":"a","text":"walk"},{"id":"b","text":"walks"},{"id":"c","text":"walking"},{"id":"d","text":"walked"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["english","grammar","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-140'), seed_uuid('naplan-y3-009'), 10, 'easy', 'boolean', 1, '[{"type":"text","content":"The Earth travels around the Sun once every year."}]'::jsonb, '[]'::jsonb, '["science","earth","year3"]'::jsonb, NULL, '{"correct":true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-141'), seed_uuid('naplan-y3-010'), 1, 'easy', 'mcq', 1, '[{"type":"text","content":"What is 468 + 375?"},{"type":"mcq","options":[{"id":"a","text":"833"},{"id":"b","text":"843"},{"id":"c","text":"853"},{"id":"d","text":"863"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","addition","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-142'), seed_uuid('naplan-y3-010'), 2, 'medium', 'numeric', 1, '[{"type":"text","content":"What is 24 × 15?"}]'::jsonb, '[]'::jsonb, '["maths","multiplication","year5"]'::jsonb, NULL, '{"correct":360,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-143'), seed_uuid('naplan-y3-010'), 3, 'medium', 'mcq', 1, '[{"type":"text","content":"Which fraction is equivalent to 3/4?"},{"type":"mcq","options":[{"id":"a","text":"6/10"},{"id":"b","text":"9/12"},{"id":"c","text":"4/6"},{"id":"d","text":"6/8"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","fractions","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-144'), seed_uuid('naplan-y3-010'), 4, 'easy', 'mcq', 1, '[{"type":"text","content":"What does the word ''nocturnal'' mean?"},{"type":"mcq","options":[{"id":"a","text":"Active during the day"},{"id":"b","text":"Active during the night"},{"id":"c","text":"Living underground"},{"id":"d","text":"Living in trees"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["english","vocabulary","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-145'), seed_uuid('naplan-y3-010'), 5, 'medium', 'multi_select', 1, '[{"type":"text","content":"Which TWO words are pronouns? Select both."},{"type":"multi_select","options":[{"id":"a","text":"she"},{"id":"b","text":"running"},{"id":"c","text":"them"},{"id":"d","text":"beautiful"}],"correctOptionIds":["a","c"],"partialCredit":false}]'::jsonb, '[]'::jsonb, '["english","grammar","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-146'), seed_uuid('naplan-y3-010'), 6, 'medium', 'mcq', 1, '[{"type":"text","content":"Which layer of the Earth is the outermost?"},{"type":"image","src":"https://cdn.mindmosaic.com/science/y5/earth-layers-diagram.png","alt":"A cross-section diagram of Earth showing the crust, mantle, outer core and inner core"},{"type":"mcq","options":[{"id":"a","text":"Mantle"},{"id":"b","text":"Inner core"},{"id":"c","text":"Outer core"},{"id":"d","text":"Crust"}],"correctOptionId":"d"}]'::jsonb, '[]'::jsonb, '["science","earth","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-147'), seed_uuid('naplan-y3-010'), 7, 'easy', 'boolean', 1, '[{"type":"text","content":"0.5 is equal to one half."}]'::jsonb, '[]'::jsonb, '["maths","decimals","year5"]'::jsonb, NULL, '{"correct":true}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-148'), seed_uuid('naplan-y3-010'), 8, 'medium', 'short', 1, '[{"type":"text","content":"Spell the word that means to keep something safe from harm."}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, '{"acceptedAnswers":["protect"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-149'), seed_uuid('naplan-y3-010'), 9, 'easy', 'mcq', 1, '[{"type":"text","content":"Which of the following is spelt correctly?"},{"type":"mcq","options":[{"id":"a","text":"neccessary"},{"id":"b","text":"necesary"},{"id":"c","text":"necessary"},{"id":"d","text":"nessecary"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-150'), seed_uuid('naplan-y3-010'), 10, 'medium', 'ordering', 1, '[{"type":"text","content":"Put the features of a persuasive essay in the correct order from first to last."},{"type":"ordering","instruction":"Order from first to last.","items":["Call to action","Rebuttal of opposing view","Topic sentence with clear position","Supporting arguments with evidence"]}]'::jsonb, '[]'::jsonb, '["english","writing","persuasive","year5"]'::jsonb, NULL, '{"correctOrder":["Topic sentence with clear position","Supporting arguments with evidence","Rebuttal of opposing view","Call to action"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-151'), seed_uuid('naplan-y5-006'), 1, 'medium', 'mcq', 1, '[{"type":"text","content":"What is 50% of 120?"},{"type":"mcq","options":[{"id":"a","text":"50"},{"id":"b","text":"60"},{"id":"c","text":"70"},{"id":"d","text":"80"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","percentages","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-152'), seed_uuid('naplan-y5-006'), 2, 'medium', 'matching', 1, '[{"type":"text","content":"Match each organism to its food source."},{"type":"matching","pairs":[{"left":"Cow","right":"Grass"},{"left":"Eagle","right":"Small animals"},{"left":"Mushroom","right":"Decaying matter"}]}]'::jsonb, '[]'::jsonb, '["science","living-things","year5"]'::jsonb, NULL, '{"correctPairs":{"Cow":"Grass","Eagle":"Small animals","Mushroom":"Decaying matter"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-153'), seed_uuid('naplan-y5-006'), 3, 'easy', 'mcq', 1, '[{"type":"text","content":"Which planet is closest to the Sun?"},{"type":"mcq","options":[{"id":"a","text":"Venus"},{"id":"b","text":"Earth"},{"id":"c","text":"Mercury"},{"id":"d","text":"Mars"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["general-knowledge","world","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-154'), seed_uuid('naplan-y5-006'), 4, 'medium', 'numeric', 1, '[{"type":"text","content":"A rectangle is 8 cm long and 5 cm wide. What is its area in square centimetres?"},{"type":"image","src":"https://cdn.mindmosaic.com/maths/y5/rectangle-area-8x5.png","alt":"A rectangle labelled 8 cm long and 5 cm wide"}]'::jsonb, '[]'::jsonb, '["maths","area","year5"]'::jsonb, NULL, '{"correct":40,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-155'), seed_uuid('naplan-y5-006'), 5, 'medium', 'mcq', 1, '[{"type":"text","content":"Which sentence is written in the past tense?"},{"type":"mcq","options":[{"id":"a","text":"She runs to the park every morning."},{"id":"b","text":"She will run to the park tomorrow."},{"id":"c","text":"She ran to the park yesterday."},{"id":"d","text":"She is running to the park now."}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["english","grammar","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-156'), seed_uuid('naplan-y5-006'), 6, 'medium', 'boolean', 1, '[{"type":"text","content":"A triangle can have two right angles."}]'::jsonb, '[]'::jsonb, '["maths","geometry","year5"]'::jsonb, NULL, '{"correct":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-157'), seed_uuid('naplan-y5-006'), 7, 'easy', 'mcq', 1, '[{"type":"text","content":"Which force pulls objects towards the Earth?"},{"type":"mcq","options":[{"id":"a","text":"Magnetism"},{"id":"b","text":"Friction"},{"id":"c","text":"Gravity"},{"id":"d","text":"Buoyancy"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["science","forces","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-158'), seed_uuid('naplan-y5-006'), 8, 'easy', 'short', 1, '[{"type":"text","content":"Spell the word that means the study of living things."}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, '{"acceptedAnswers":["biology"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-159'), seed_uuid('naplan-y5-006'), 9, 'medium', 'mcq', 1, '[{"type":"text","content":"Where is the Great Barrier Reef located?"},{"type":"mcq","options":[{"id":"a","text":"New South Wales"},{"id":"b","text":"Western Australia"},{"id":"c","text":"Queensland"},{"id":"d","text":"Victoria"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["literacy","comprehension","year5"]'::jsonb, NULL, NULL, '{"title":"The Great Barrier Reef","content":"The Great Barrier Reef is the world''s largest coral reef system, stretching over 2,300 kilometres along the coast of Queensland, Australia. It is home to thousands of species of fish, coral, and marine life. Rising ocean temperatures caused by climate change are threatening the reef through a process called coral bleaching.","image":null}'::jsonb, 'sg-y5-001', NULL),
  (seed_uuid('q-160'), seed_uuid('naplan-y5-006'), 10, 'medium', 'short', 1, '[{"type":"text","content":"What process is threatening the Great Barrier Reef?"}]'::jsonb, '[]'::jsonb, '["literacy","comprehension","year5"]'::jsonb, NULL, '{"acceptedAnswers":["coral bleaching","bleaching"],"caseSensitive":false}'::jsonb, '{"title":"The Great Barrier Reef","content":"The Great Barrier Reef is the world''s largest coral reef system, stretching over 2,300 kilometres along the coast of Queensland, Australia. It is home to thousands of species of fish, coral, and marine life. Rising ocean temperatures caused by climate change are threatening the reef through a process called coral bleaching.","image":null}'::jsonb, 'sg-y5-001', NULL),
  (seed_uuid('q-161'), seed_uuid('naplan-y5-007'), 1, 'easy', 'boolean', 1, '[{"type":"text","content":"Is the Great Barrier Reef the world''s largest coral reef system?"}]'::jsonb, '[]'::jsonb, '["literacy","comprehension","year5"]'::jsonb, NULL, '{"correct":true}'::jsonb, '{"title":"The Great Barrier Reef","content":"The Great Barrier Reef is the world''s largest coral reef system, stretching over 2,300 kilometres along the coast of Queensland, Australia. It is home to thousands of species of fish, coral, and marine life. Rising ocean temperatures caused by climate change are threatening the reef through a process called coral bleaching.","image":null}'::jsonb, 'sg-y5-001', NULL),
  (seed_uuid('q-162'), seed_uuid('naplan-y5-007'), 2, 'medium', 'mcq', 1, '[{"type":"text","content":"Which of the following decimals is the largest?"},{"type":"mcq","options":[{"id":"a","text":"0.45"},{"id":"b","text":"0.9"},{"id":"c","text":"0.389"},{"id":"d","text":"0.75"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","decimals","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-163'), seed_uuid('naplan-y5-007'), 3, 'medium', 'multi_select', 1, '[{"type":"text","content":"Which TWO materials conduct electricity? Select both."},{"type":"multi_select","options":[{"id":"a","text":"Copper"},{"id":"b","text":"Wood"},{"id":"c","text":"Iron"},{"id":"d","text":"Rubber"}],"correctOptionIds":["a","c"],"partialCredit":false}]'::jsonb, '[]'::jsonb, '["science","materials","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-164'), seed_uuid('naplan-y5-007'), 4, 'medium', 'ordering', 1, '[{"type":"text","content":"Put the features of an information report in the correct order from first to last."},{"type":"ordering","instruction":"Order from first to last.","items":["Concluding statement","Factual paragraphs by category","General classification or introduction"]}]'::jsonb, '[]'::jsonb, '["english","writing","report","year5"]'::jsonb, NULL, '{"correctOrder":["General classification or introduction","Factual paragraphs by category","Concluding statement"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-165'), seed_uuid('naplan-y5-007'), 5, 'easy', 'mcq', 1, '[{"type":"text","content":"What is the longest river in the world?"},{"type":"mcq","options":[{"id":"a","text":"Amazon"},{"id":"b","text":"Nile"},{"id":"c","text":"Mississippi"},{"id":"d","text":"Yangtze"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["general-knowledge","world","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-166'), seed_uuid('naplan-y5-007'), 6, 'medium', 'numeric', 1, '[{"type":"text","content":"A farmer has 144 eggs to pack into cartons of 12. How many full cartons can the farmer fill?"}]'::jsonb, '[]'::jsonb, '["maths","division","year5"]'::jsonb, NULL, '{"correct":12,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-167'), seed_uuid('naplan-y5-007'), 7, 'medium', 'mcq', 1, '[{"type":"text","content":"Which sentence contains a subordinate clause?"},{"type":"mcq","options":[{"id":"a","text":"The dog barked."},{"id":"b","text":"She sang and danced."},{"id":"c","text":"Although it was raining, they played outside."},{"id":"d","text":"The cat sat on the mat."}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["english","grammar","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-168'), seed_uuid('naplan-y5-007'), 8, 'easy', 'mcq', 1, '[{"type":"text","content":"Which of the following is spelt correctly?"},{"type":"mcq","options":[{"id":"a","text":"environment"},{"id":"b","text":"enviroment"},{"id":"c","text":"enviornment"},{"id":"d","text":"environmant"}],"correctOptionId":"a"}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-169'), seed_uuid('naplan-y5-007'), 9, 'medium', 'short', 1, '[{"type":"text","content":"Spell the word that means to change from a liquid to a gas when heated."}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, '{"acceptedAnswers":["evaporate","evaporates"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-170'), seed_uuid('naplan-y5-007'), 10, 'medium', 'matching', 1, '[{"type":"text","content":"Match each fraction to its equivalent percentage."},{"type":"matching","pairs":[{"left":"1/2","right":"50%"},{"left":"1/4","right":"25%"},{"left":"1/10","right":"10%"}]}]'::jsonb, '[]'::jsonb, '["maths","fractions-decimals-percentages","year5"]'::jsonb, NULL, '{"correctPairs":{"1/2":"50%","1/4":"25%","1/10":"10%"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-171'), seed_uuid('naplan-y5-008'), 1, 'medium', 'mcq', 1, '[{"type":"text","content":"Which of the following is a renewable source of energy?"},{"type":"image","src":"https://cdn.mindmosaic.com/science/y5/energy-sources.png","alt":"Images of a solar panel, coal, oil barrel, and gas flame"},{"type":"mcq","options":[{"id":"a","text":"Coal"},{"id":"b","text":"Natural gas"},{"id":"c","text":"Solar power"},{"id":"d","text":"Oil"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["science","energy","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-172'), seed_uuid('naplan-y5-008'), 2, 'medium', 'boolean', 1, '[{"type":"text","content":"The number 57 is a prime number."}]'::jsonb, '[]'::jsonb, '["maths","number","year5"]'::jsonb, NULL, '{"correct":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-173'), seed_uuid('naplan-y5-008'), 3, 'easy', 'mcq', 1, '[{"type":"text","content":"Which ocean lies to the west of Australia?"},{"type":"image","src":"https://cdn.mindmosaic.com/gk/y5/australia-surrounding-oceans.png","alt":"A map of Australia showing surrounding oceans"},{"type":"mcq","options":[{"id":"a","text":"Pacific Ocean"},{"id":"b","text":"Indian Ocean"},{"id":"c","text":"Arctic Ocean"},{"id":"d","text":"Atlantic Ocean"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["general-knowledge","australia","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-174'), seed_uuid('naplan-y5-008'), 4, 'easy', 'numeric', 1, '[{"type":"text","content":"How many seconds are in 3 minutes?"}]'::jsonb, '[]'::jsonb, '["maths","time","year5"]'::jsonb, NULL, '{"correct":180,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-175'), seed_uuid('naplan-y5-008'), 5, 'medium', 'mcq', 1, '[{"type":"text","content":"Which word is an antonym of ''ancient''?"},{"type":"mcq","options":[{"id":"a","text":"Old"},{"id":"b","text":"Historical"},{"id":"c","text":"Modern"},{"id":"d","text":"Traditional"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["english","grammar","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-176'), seed_uuid('naplan-y5-008'), 6, 'easy', 'ordering', 1, '[{"type":"text","content":"Put these decimals in order from smallest to largest."},{"type":"ordering","instruction":"Order from smallest to largest.","items":["0.75","0.3","1.2","0.08"]}]'::jsonb, '[]'::jsonb, '["maths","number","year5"]'::jsonb, NULL, '{"correctOrder":["0.08","0.3","0.75","1.2"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-177'), seed_uuid('naplan-y5-008'), 7, 'easy', 'mcq', 1, '[{"type":"text","content":"Which organ pumps blood around the human body?"},{"type":"mcq","options":[{"id":"a","text":"Lung"},{"id":"b","text":"Brain"},{"id":"c","text":"Liver"},{"id":"d","text":"Heart"}],"correctOptionId":"d"}]'::jsonb, '[]'::jsonb, '["science","human-body","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-178'), seed_uuid('naplan-y5-008'), 8, 'medium', 'multi_select', 1, '[{"type":"text","content":"Which TWO techniques are commonly used in persuasive writing? Select both."},{"type":"multi_select","options":[{"id":"a","text":"Rhetorical questions"},{"id":"b","text":"Random lists of facts"},{"id":"c","text":"Emotive language"},{"id":"d","text":"Narrative flashbacks"}],"correctOptionIds":["a","c"],"partialCredit":false}]'::jsonb, '[]'::jsonb, '["english","literacy","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-179'), seed_uuid('naplan-y5-008'), 9, 'medium', 'mcq', 1, '[{"type":"text","content":"The test scores for five students are: 12, 15, 11, 14, 13. What is the mean (average) score?"},{"type":"mcq","options":[{"id":"a","text":"12"},{"id":"b","text":"13"},{"id":"c","text":"14"},{"id":"d","text":"15"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","statistics","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-180'), seed_uuid('naplan-y5-008'), 10, 'easy', 'short', 1, '[{"type":"text","content":"Spell the word that means a person who studies the stars and planets scientifically."}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, '{"acceptedAnswers":["astronomer"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-181'), seed_uuid('naplan-y5-009'), 1, 'easy', 'mcq', 1, '[{"type":"text","content":"What is 83 - 47?"},{"type":"mcq","options":[{"id":"a","text":"34"},{"id":"b","text":"36"},{"id":"c","text":"38"},{"id":"d","text":"46"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","subtraction","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-182'), seed_uuid('naplan-y5-009'), 2, 'easy', 'boolean', 1, '[{"type":"text","content":"Australia is the smallest continent in the world."}]'::jsonb, '[]'::jsonb, '["general-knowledge","australia","year3"]'::jsonb, NULL, '{"correct":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-183'), seed_uuid('naplan-y5-009'), 3, 'medium', 'mcq', 1, '[{"type":"text","content":"Which sentence uses an apostrophe correctly to show possession?"},{"type":"mcq","options":[{"id":"a","text":"The dogs bone was buried."},{"id":"b","text":"The dog''s bone was buried."},{"id":"c","text":"The dogs'' bone was buried."},{"id":"d","text":"The dogs bone'' was buried."}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["english","grammar","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-184'), seed_uuid('naplan-y5-009'), 4, 'easy', 'numeric', 1, '[{"type":"text","content":"What is 9 × 7?"}]'::jsonb, '[]'::jsonb, '["maths","multiplication","year3"]'::jsonb, NULL, '{"correct":63,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-185'), seed_uuid('naplan-y5-009'), 5, 'easy', 'matching', 1, '[{"type":"text","content":"Match each country to its continent."},{"type":"matching","pairs":[{"left":"Brazil","right":"South America"},{"left":"Egypt","right":"Africa"},{"left":"Japan","right":"Asia"}]}]'::jsonb, '[]'::jsonb, '["general-knowledge","world","year3"]'::jsonb, NULL, '{"correctPairs":{"Brazil":"South America","Egypt":"Africa","Japan":"Asia"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-186'), seed_uuid('naplan-y5-009'), 6, 'easy', 'mcq', 1, '[{"type":"text","content":"Which part of your body do you use to smell?"},{"type":"mcq","options":[{"id":"a","text":"Eyes"},{"id":"b","text":"Ears"},{"id":"c","text":"Nose"},{"id":"d","text":"Tongue"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["science","senses","year3"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-187'), seed_uuid('naplan-y5-009'), 7, 'medium', 'mcq', 1, '[{"type":"text","content":"What is 2/5 + 1/5?"},{"type":"mcq","options":[{"id":"a","text":"3/10"},{"id":"b","text":"3/5"},{"id":"c","text":"2/10"},{"id":"d","text":"1/2"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","fractions","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-188'), seed_uuid('naplan-y5-009'), 8, 'medium', 'boolean', 1, '[{"type":"text","content":"Sound can travel through a vacuum."}]'::jsonb, '[]'::jsonb, '["science","energy","year5"]'::jsonb, NULL, '{"correct":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-189'), seed_uuid('naplan-y5-009'), 9, 'medium', 'mcq', 1, '[{"type":"text","content":"What does the prefix ''micro'' mean?"},{"type":"mcq","options":[{"id":"a","text":"Large"},{"id":"b","text":"Many"},{"id":"c","text":"Small"},{"id":"d","text":"Under"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["english","vocabulary","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-190'), seed_uuid('naplan-y5-009'), 10, 'medium', 'numeric', 1, '[{"type":"text","content":"What is 25% of 200?"}]'::jsonb, '[]'::jsonb, '["maths","percentages","year5"]'::jsonb, NULL, '{"correct":50,"tolerance":0}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-191'), seed_uuid('naplan-y5-010'), 1, 'medium', 'ordering', 1, '[{"type":"text","content":"Put the stages of a butterfly''''s life cycle in the correct order from first to last."},{"type":"ordering","instruction":"Order from first to last.","items":["Adult butterfly","Pupa (chrysalis)","Larva (caterpillar)","Egg"]}]'::jsonb, '[]'::jsonb, '["science","life-cycle","year5"]'::jsonb, NULL, '{"correctOrder":["Egg","Larva (caterpillar)","Pupa (chrysalis)","Adult butterfly"]}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-192'), seed_uuid('naplan-y5-010'), 2, 'easy', 'mcq', 1, '[{"type":"text","content":"What is the name of Australia''''s longest river?"},{"type":"mcq","options":[{"id":"a","text":"Darling River"},{"id":"b","text":"Murray River"},{"id":"c","text":"Murrumbidgee River"},{"id":"d","text":"Snowy River"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["general-knowledge","australia","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-193'), seed_uuid('naplan-y5-010'), 3, 'medium', 'short', 1, '[{"type":"text","content":"Spell the word that means something that cannot be seen or touched, like an idea or feeling."}]'::jsonb, '[]'::jsonb, '["spelling","year5"]'::jsonb, NULL, '{"acceptedAnswers":["abstract"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-194'), seed_uuid('naplan-y5-010'), 4, 'medium', 'multi_select', 1, '[{"type":"text","content":"Which TWO shapes have exactly four sides? Select both."},{"type":"multi_select","options":[{"id":"a","text":"Rhombus"},{"id":"b","text":"Pentagon"},{"id":"c","text":"Trapezium"},{"id":"d","text":"Hexagon"}],"correctOptionIds":["a","c"],"partialCredit":false}]'::jsonb, '[]'::jsonb, '["maths","geometry","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-195'), seed_uuid('naplan-y5-010'), 5, 'medium', 'mcq', 1, '[{"type":"text","content":"Which word correctly completes the sentence?\n\n''''Neither the students nor the teacher ___ ready for the fire drill.''''"},{"type":"mcq","options":[{"id":"a","text":"were"},{"id":"b","text":"was"},{"id":"c","text":"are"},{"id":"d","text":"is"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["english","grammar","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-196'), seed_uuid('naplan-y5-010'), 6, 'easy', 'boolean', 1, '[{"type":"text","content":"The Moon produces its own light."}]'::jsonb, '[]'::jsonb, '["science","earth","year5"]'::jsonb, NULL, '{"correct":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-197'), seed_uuid('naplan-y5-010'), 7, 'medium', 'matching', 1, '[{"type":"text","content":"Match each literary device to its correct definition."},{"type":"matching","pairs":[{"left":"Simile","right":"Comparing two things using ''''like'''' or ''''as''''"},{"left":"Alliteration","right":"Repetition of the same starting sound"},{"left":"Metaphor","right":"Describing something as if it is something else"}]}]'::jsonb, '[]'::jsonb, '["english","literacy","year5"]'::jsonb, NULL, '{"correctPairs":{"Simile":"Comparing two things using ''''like'''' or ''''as''''","Alliteration":"Repetition of the same starting sound","Metaphor":"Describing something as if it is something else"}}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-198'), seed_uuid('naplan-y5-010'), 8, 'medium', 'mcq', 1, '[{"type":"text","content":"If n + 8 = 20, what is the value of n?"},{"type":"mcq","options":[{"id":"a","text":"10"},{"id":"b","text":"12"},{"id":"c","text":"14"},{"id":"d","text":"28"}],"correctOptionId":"b"}]'::jsonb, '[]'::jsonb, '["maths","algebra","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-199'), seed_uuid('naplan-y5-010'), 9, 'easy', 'short', 1, '[{"type":"text","content":"Spell the word for the opposite of ''''cold''''."}]'::jsonb, '[]'::jsonb, '["spelling","year3"]'::jsonb, NULL, '{"acceptedAnswers":["hot","warm"],"caseSensitive":false}'::jsonb, NULL, NULL, NULL),
  (seed_uuid('q-200'), seed_uuid('naplan-y5-010'), 10, 'medium', 'mcq', 1, '[{"type":"text","content":"When water is heated to 100°C, what change of state occurs?"},{"type":"image","src":"https://cdn.mindmosaic.com/science/y5/water-states-diagram.png","alt":"A diagram showing the three states of water: solid ice, liquid water, and steam"},{"type":"mcq","options":[{"id":"a","text":"Freezing"},{"id":"b","text":"Condensation"},{"id":"c","text":"Evaporation"},{"id":"d","text":"Melting"}],"correctOptionId":"c"}]'::jsonb, '[]'::jsonb, '["science","materials","year5"]'::jsonb, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Step 4: Insert exam_question_options (MCQ + multi_select only)
-- =============================================================================

INSERT INTO exam_question_options (question_id, option_id, content, media_reference)
VALUES
  (seed_uuid('q-101'), 'A', '51', NULL),
  (seed_uuid('q-101'), 'B', '61', NULL),
  (seed_uuid('q-101'), 'C', '71', NULL),
  (seed_uuid('q-101'), 'D', '57', NULL),
  (seed_uuid('q-102'), 'A', 'Sad', NULL),
  (seed_uuid('q-102'), 'B', 'Joyful', NULL),
  (seed_uuid('q-102'), 'C', 'Angry', NULL),
  (seed_uuid('q-102'), 'D', 'Tired', NULL),
  (seed_uuid('q-103'), 'A', 'Sydney', NULL),
  (seed_uuid('q-103'), 'B', 'Melbourne', NULL),
  (seed_uuid('q-103'), 'C', 'Canberra', NULL),
  (seed_uuid('q-103'), 'D', 'Brisbane', NULL),
  (seed_uuid('q-104'), 'A', 'Dog', NULL),
  (seed_uuid('q-104'), 'B', 'Run', NULL),
  (seed_uuid('q-104'), 'C', 'Table', NULL),
  (seed_uuid('q-104'), 'D', 'Quickly', NULL),
  (seed_uuid('q-109'), 'A', 'Rock', NULL),
  (seed_uuid('q-109'), 'B', 'Water', NULL),
  (seed_uuid('q-109'), 'C', 'Fern', NULL),
  (seed_uuid('q-109'), 'D', 'Cloud', NULL),
  (seed_uuid('q-110'), 'A', 'becuase', NULL),
  (seed_uuid('q-110'), 'B', 'becouse', NULL),
  (seed_uuid('q-110'), 'C', 'because', NULL),
  (seed_uuid('q-110'), 'D', 'beacuse', NULL),
  (seed_uuid('q-113'), 'A', '6', NULL),
  (seed_uuid('q-113'), 'B', '60', NULL),
  (seed_uuid('q-113'), 'C', '600', NULL),
  (seed_uuid('q-113'), 'D', '6000', NULL),
  (seed_uuid('q-115'), 'A', 'dog', NULL),
  (seed_uuid('q-115'), 'B', 'loudly', NULL),
  (seed_uuid('q-115'), 'C', 'barked', NULL),
  (seed_uuid('q-115'), 'D', 'gate', NULL),
  (seed_uuid('q-117'), 'A', '1/3', NULL),
  (seed_uuid('q-117'), 'B', '2/6', NULL),
  (seed_uuid('q-117'), 'C', '3/4', NULL),
  (seed_uuid('q-117'), 'D', '1/4', NULL),
  (seed_uuid('q-119'), 'A', 'Platypus', NULL),
  (seed_uuid('q-119'), 'B', 'Crocodile', NULL),
  (seed_uuid('q-119'), 'C', 'Kangaroo', NULL),
  (seed_uuid('q-119'), 'D', 'Echidna', NULL),
  (seed_uuid('q-121'), 'A', '5', NULL),
  (seed_uuid('q-121'), 'B', '6', NULL),
  (seed_uuid('q-121'), 'C', '7', NULL),
  (seed_uuid('q-121'), 'D', '8', NULL),
  (seed_uuid('q-124'), 'A', 'Paper', NULL),
  (seed_uuid('q-124'), 'B', 'Wool', NULL),
  (seed_uuid('q-124'), 'C', 'Waterproof plastic', NULL),
  (seed_uuid('q-124'), 'D', 'Cotton fabric', NULL),
  (seed_uuid('q-125'), 'A', 'wensday', NULL),
  (seed_uuid('q-125'), 'B', 'Wednesday', NULL),
  (seed_uuid('q-125'), 'C', 'Wendesday', NULL),
  (seed_uuid('q-125'), 'D', 'Wendsday', NULL),
  (seed_uuid('q-127'), 'A', 'In the park', NULL),
  (seed_uuid('q-127'), 'B', 'Outside the school gate', NULL),
  (seed_uuid('q-127'), 'C', 'At the shops', NULL),
  (seed_uuid('q-127'), 'D', 'In the playground', NULL),
  (seed_uuid('q-130'), 'A', '4', NULL),
  (seed_uuid('q-130'), 'B', '5', NULL),
  (seed_uuid('q-130'), 'C', '6', NULL),
  (seed_uuid('q-130'), 'D', '8', NULL),
  (seed_uuid('q-131'), 'A', 'Sunlight', NULL),
  (seed_uuid('q-131'), 'B', 'Music', NULL),
  (seed_uuid('q-131'), 'C', 'Water', NULL),
  (seed_uuid('q-131'), 'D', 'Plastic', NULL),
  (seed_uuid('q-132'), 'A', '$4.50', NULL),
  (seed_uuid('q-132'), 'B', '$4.60', NULL),
  (seed_uuid('q-132'), 'C', '$4.70', NULL),
  (seed_uuid('q-132'), 'D', '$5.00', NULL),
  (seed_uuid('q-133'), 'A', 'Where are you going.', NULL),
  (seed_uuid('q-133'), 'B', 'Where are you going?', NULL),
  (seed_uuid('q-133'), 'C', 'Where are you going!', NULL),
  (seed_uuid('q-133'), 'D', 'where are you going?', NULL),
  (seed_uuid('q-136'), 'A', 'Red', NULL),
  (seed_uuid('q-136'), 'B', 'Green', NULL),
  (seed_uuid('q-136'), 'C', 'Gold', NULL),
  (seed_uuid('q-136'), 'D', 'There is no circle', NULL),
  (seed_uuid('q-139'), 'A', 'walk', NULL),
  (seed_uuid('q-139'), 'B', 'walks', NULL),
  (seed_uuid('q-139'), 'C', 'walking', NULL),
  (seed_uuid('q-139'), 'D', 'walked', NULL),
  (seed_uuid('q-141'), 'A', '833', NULL),
  (seed_uuid('q-141'), 'B', '843', NULL),
  (seed_uuid('q-141'), 'C', '853', NULL),
  (seed_uuid('q-141'), 'D', '863', NULL),
  (seed_uuid('q-143'), 'A', '6/10', NULL),
  (seed_uuid('q-143'), 'B', '9/12', NULL),
  (seed_uuid('q-143'), 'C', '4/6', NULL),
  (seed_uuid('q-143'), 'D', '6/8', NULL),
  (seed_uuid('q-144'), 'A', 'Active during the day', NULL),
  (seed_uuid('q-144'), 'B', 'Active during the night', NULL),
  (seed_uuid('q-144'), 'C', 'Living underground', NULL),
  (seed_uuid('q-144'), 'D', 'Living in trees', NULL),
  (seed_uuid('q-145'), 'A', 'she', NULL),
  (seed_uuid('q-145'), 'B', 'running', NULL),
  (seed_uuid('q-145'), 'C', 'them', NULL),
  (seed_uuid('q-145'), 'D', 'beautiful', NULL),
  (seed_uuid('q-146'), 'A', 'Mantle', NULL),
  (seed_uuid('q-146'), 'B', 'Inner core', NULL),
  (seed_uuid('q-146'), 'C', 'Outer core', NULL),
  (seed_uuid('q-146'), 'D', 'Crust', NULL),
  (seed_uuid('q-149'), 'A', 'neccessary', NULL),
  (seed_uuid('q-149'), 'B', 'necesary', NULL),
  (seed_uuid('q-149'), 'C', 'necessary', NULL),
  (seed_uuid('q-149'), 'D', 'nessecary', NULL),
  (seed_uuid('q-151'), 'A', '50', NULL),
  (seed_uuid('q-151'), 'B', '60', NULL),
  (seed_uuid('q-151'), 'C', '70', NULL),
  (seed_uuid('q-151'), 'D', '80', NULL),
  (seed_uuid('q-153'), 'A', 'Venus', NULL),
  (seed_uuid('q-153'), 'B', 'Earth', NULL),
  (seed_uuid('q-153'), 'C', 'Mercury', NULL),
  (seed_uuid('q-153'), 'D', 'Mars', NULL),
  (seed_uuid('q-155'), 'A', 'She runs to the park every morning.', NULL),
  (seed_uuid('q-155'), 'B', 'She will run to the park tomorrow.', NULL),
  (seed_uuid('q-155'), 'C', 'She ran to the park yesterday.', NULL),
  (seed_uuid('q-155'), 'D', 'She is running to the park now.', NULL),
  (seed_uuid('q-157'), 'A', 'Magnetism', NULL),
  (seed_uuid('q-157'), 'B', 'Friction', NULL),
  (seed_uuid('q-157'), 'C', 'Gravity', NULL),
  (seed_uuid('q-157'), 'D', 'Buoyancy', NULL),
  (seed_uuid('q-159'), 'A', 'New South Wales', NULL),
  (seed_uuid('q-159'), 'B', 'Western Australia', NULL),
  (seed_uuid('q-159'), 'C', 'Queensland', NULL),
  (seed_uuid('q-159'), 'D', 'Victoria', NULL),
  (seed_uuid('q-162'), 'A', '0.45', NULL),
  (seed_uuid('q-162'), 'B', '0.9', NULL),
  (seed_uuid('q-162'), 'C', '0.389', NULL),
  (seed_uuid('q-162'), 'D', '0.75', NULL),
  (seed_uuid('q-163'), 'A', 'Copper', NULL),
  (seed_uuid('q-163'), 'B', 'Wood', NULL),
  (seed_uuid('q-163'), 'C', 'Iron', NULL),
  (seed_uuid('q-163'), 'D', 'Rubber', NULL),
  (seed_uuid('q-165'), 'A', 'Amazon', NULL),
  (seed_uuid('q-165'), 'B', 'Nile', NULL),
  (seed_uuid('q-165'), 'C', 'Mississippi', NULL),
  (seed_uuid('q-165'), 'D', 'Yangtze', NULL),
  (seed_uuid('q-167'), 'A', 'The dog barked.', NULL),
  (seed_uuid('q-167'), 'B', 'She sang and danced.', NULL),
  (seed_uuid('q-167'), 'C', 'Although it was raining, they played outside.', NULL),
  (seed_uuid('q-167'), 'D', 'The cat sat on the mat.', NULL),
  (seed_uuid('q-168'), 'A', 'environment', NULL),
  (seed_uuid('q-168'), 'B', 'enviroment', NULL),
  (seed_uuid('q-168'), 'C', 'enviornment', NULL),
  (seed_uuid('q-168'), 'D', 'environmant', NULL),
  (seed_uuid('q-171'), 'A', 'Coal', NULL),
  (seed_uuid('q-171'), 'B', 'Natural gas', NULL),
  (seed_uuid('q-171'), 'C', 'Solar power', NULL),
  (seed_uuid('q-171'), 'D', 'Oil', NULL),
  (seed_uuid('q-173'), 'A', 'Pacific Ocean', NULL),
  (seed_uuid('q-173'), 'B', 'Indian Ocean', NULL),
  (seed_uuid('q-173'), 'C', 'Arctic Ocean', NULL),
  (seed_uuid('q-173'), 'D', 'Atlantic Ocean', NULL),
  (seed_uuid('q-175'), 'A', 'Old', NULL),
  (seed_uuid('q-175'), 'B', 'Historical', NULL),
  (seed_uuid('q-175'), 'C', 'Modern', NULL),
  (seed_uuid('q-175'), 'D', 'Traditional', NULL),
  (seed_uuid('q-177'), 'A', 'Lung', NULL),
  (seed_uuid('q-177'), 'B', 'Brain', NULL),
  (seed_uuid('q-177'), 'C', 'Liver', NULL),
  (seed_uuid('q-177'), 'D', 'Heart', NULL),
  (seed_uuid('q-178'), 'A', 'Rhetorical questions', NULL),
  (seed_uuid('q-178'), 'B', 'Random lists of facts', NULL),
  (seed_uuid('q-178'), 'C', 'Emotive language', NULL),
  (seed_uuid('q-178'), 'D', 'Narrative flashbacks', NULL),
  (seed_uuid('q-179'), 'A', '12', NULL),
  (seed_uuid('q-179'), 'B', '13', NULL),
  (seed_uuid('q-179'), 'C', '14', NULL),
  (seed_uuid('q-179'), 'D', '15', NULL),
  (seed_uuid('q-181'), 'A', '34', NULL),
  (seed_uuid('q-181'), 'B', '36', NULL),
  (seed_uuid('q-181'), 'C', '38', NULL),
  (seed_uuid('q-181'), 'D', '46', NULL),
  (seed_uuid('q-183'), 'A', 'The dogs bone was buried.', NULL),
  (seed_uuid('q-183'), 'B', 'The dog''s bone was buried.', NULL),
  (seed_uuid('q-183'), 'C', 'The dogs'' bone was buried.', NULL),
  (seed_uuid('q-183'), 'D', 'The dogs bone'' was buried.', NULL),
  (seed_uuid('q-186'), 'A', 'Eyes', NULL),
  (seed_uuid('q-186'), 'B', 'Ears', NULL),
  (seed_uuid('q-186'), 'C', 'Nose', NULL),
  (seed_uuid('q-186'), 'D', 'Tongue', NULL),
  (seed_uuid('q-187'), 'A', '3/10', NULL),
  (seed_uuid('q-187'), 'B', '3/5', NULL),
  (seed_uuid('q-187'), 'C', '2/10', NULL),
  (seed_uuid('q-187'), 'D', '1/2', NULL),
  (seed_uuid('q-189'), 'A', 'Large', NULL),
  (seed_uuid('q-189'), 'B', 'Many', NULL),
  (seed_uuid('q-189'), 'C', 'Small', NULL),
  (seed_uuid('q-189'), 'D', 'Under', NULL),
  (seed_uuid('q-192'), 'A', 'Darling River', NULL),
  (seed_uuid('q-192'), 'B', 'Murray River', NULL),
  (seed_uuid('q-192'), 'C', 'Murrumbidgee River', NULL),
  (seed_uuid('q-192'), 'D', 'Snowy River', NULL),
  (seed_uuid('q-194'), 'A', 'Rhombus', NULL),
  (seed_uuid('q-194'), 'B', 'Pentagon', NULL),
  (seed_uuid('q-194'), 'C', 'Trapezium', NULL),
  (seed_uuid('q-194'), 'D', 'Hexagon', NULL),
  (seed_uuid('q-195'), 'A', 'were', NULL),
  (seed_uuid('q-195'), 'B', 'was', NULL),
  (seed_uuid('q-195'), 'C', 'are', NULL),
  (seed_uuid('q-195'), 'D', 'is', NULL),
  (seed_uuid('q-198'), 'A', '10', NULL),
  (seed_uuid('q-198'), 'B', '12', NULL),
  (seed_uuid('q-198'), 'C', '14', NULL),
  (seed_uuid('q-198'), 'D', '28', NULL),
  (seed_uuid('q-200'), 'A', 'Freezing', NULL),
  (seed_uuid('q-200'), 'B', 'Condensation', NULL),
  (seed_uuid('q-200'), 'C', 'Evaporation', NULL),
  (seed_uuid('q-200'), 'D', 'Melting', NULL)
ON CONFLICT (question_id, option_id) DO NOTHING;


-- =============================================================================
-- Step 5: Insert exam_correct_answers (100 rows)
-- =============================================================================

INSERT INTO exam_correct_answers (question_id, answer_type, correct_option_id,
  accepted_answers, case_sensitive, exact_value, range_min, range_max,
  tolerance, unit, rubric, sample_response)
VALUES
  (seed_uuid('q-101'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-102'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-103'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-104'), 'multi_select', NULL, '["A","C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-105'), 'short', NULL, '["mat"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-106'), 'numeric', NULL, NULL, NULL, 32, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-107'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-108'), 'ordering', NULL, '["Opening statement of opinion","Reasons and evidence","Conclusion"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-109'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-110'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-111'), 'short', NULL, '["library"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-112'), 'matching', NULL, '{"Dolphin":"Ocean","Koala":"Eucalyptus tree","Earthworm":"Soil"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-113'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-114'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-115'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-116'), 'numeric', NULL, NULL, NULL, 42, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-117'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-118'), 'ordering', NULL, '["Orientation","Complication","Resolution"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-119'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-120'), 'short', NULL, '["autumn"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-121'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-122'), 'matching', NULL, '{"quickly":"adverb","jump":"verb","shiny":"adjective"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-123'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-124'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-125'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-126'), 'numeric', NULL, NULL, NULL, 43, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-127'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-128'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-129'), 'short', NULL, '["Max","max"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-130'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-131'), 'multi_select', NULL, '["A","C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-132'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-133'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-134'), 'numeric', NULL, NULL, NULL, 6, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-135'), 'matching', NULL, '{"Window":"Glass","Jumper":"Wool","Spoon":"Metal"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-136'), 'mcq', 'D', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-137'), 'short', NULL, '["ocean"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-138'), 'ordering', NULL, '["98","305","412","1000"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-139'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-140'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-141'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-142'), 'numeric', NULL, NULL, NULL, 360, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-143'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-144'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-145'), 'multi_select', NULL, '["A","C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-146'), 'mcq', 'D', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-147'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-148'), 'short', NULL, '["protect"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-149'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-150'), 'ordering', NULL, '["Topic sentence with clear position","Supporting arguments with evidence","Rebuttal of opposing view","Call to action"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-151'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-152'), 'matching', NULL, '{"Cow":"Grass","Eagle":"Small animals","Mushroom":"Decaying matter"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-153'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-154'), 'numeric', NULL, NULL, NULL, 40, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-155'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-156'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-157'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-158'), 'short', NULL, '["biology"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-159'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-160'), 'short', NULL, '["coral bleaching","bleaching"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-161'), 'boolean', NULL, '["true"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-162'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-163'), 'multi_select', NULL, '["A","C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-164'), 'ordering', NULL, '["General classification or introduction","Factual paragraphs by category","Concluding statement"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-165'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-166'), 'numeric', NULL, NULL, NULL, 12, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-167'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-168'), 'mcq', 'A', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-169'), 'short', NULL, '["evaporate","evaporates"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-170'), 'matching', NULL, '{"1/2":"50%","1/4":"25%","1/10":"10%"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-171'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-172'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-173'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-174'), 'numeric', NULL, NULL, NULL, 180, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-175'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-176'), 'ordering', NULL, '["0.08","0.3","0.75","1.2"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-177'), 'mcq', 'D', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-178'), 'multi_select', NULL, '["A","C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-179'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-180'), 'short', NULL, '["astronomer"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-181'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-182'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-183'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-184'), 'numeric', NULL, NULL, NULL, 63, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-185'), 'matching', NULL, '{"Brazil":"South America","Egypt":"Africa","Japan":"Asia"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-186'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-187'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-188'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-189'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-190'), 'numeric', NULL, NULL, NULL, 50, NULL, NULL, 0, NULL, NULL, NULL),
  (seed_uuid('q-191'), 'ordering', NULL, '["Egg","Larva (caterpillar)","Pupa (chrysalis)","Adult butterfly"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-192'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-193'), 'short', NULL, '["abstract"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-194'), 'multi_select', NULL, '["A","C"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-195'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-196'), 'boolean', NULL, '["false"]'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-197'), 'matching', NULL, '{"Simile":"Comparing two things using ''''like'''' or ''''as''''","Alliteration":"Repetition of the same starting sound","Metaphor":"Describing something as if it is something else"}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-198'), 'mcq', 'B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-199'), 'short', NULL, '["hot","warm"]'::jsonb, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (seed_uuid('q-200'), 'mcq', 'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (question_id) DO NOTHING;


-- =============================================================================
-- Step 6: Cleanup
-- =============================================================================

DROP FUNCTION IF EXISTS seed_uuid(TEXT);

COMMIT;

-- =============================================================================
-- Verification (run manually after deployment)
-- =============================================================================
-- SELECT count(*) AS exams   FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice -- Exam %';
-- SELECT count(*) AS questions FROM exam_questions WHERE exam_package_id IN
--   (SELECT id FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice -- Exam %');
-- SELECT count(*) AS options  FROM exam_question_options WHERE question_id IN
--   (SELECT id FROM exam_questions WHERE exam_package_id IN
--     (SELECT id FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice -- Exam %'));
-- SELECT count(*) AS answers  FROM exam_correct_answers WHERE question_id IN
--   (SELECT id FROM exam_questions WHERE exam_package_id IN
--     (SELECT id FROM exam_packages WHERE title LIKE 'Year % NAPLAN Practice -- Exam %'));
-- Expected (batch 2 only): 10 exams, 100 questions, 208 options, 100 answers