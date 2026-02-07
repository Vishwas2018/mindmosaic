-- =============================================================================
-- MindMosaic Exam Schema
-- Migration: 001_exam_schema.sql
-- 
-- This schema is derived directly from:
--   - src/contracts/exam-package.schema.ts (Zod contract)
--   - src/contracts/exam-package.json-schema.ts (JSON Schema)
--   - docs/EXAM_PACKAGE_CONTRACT.md
--
-- Contract Version: 1.0.0
-- =============================================================================

-- =============================================================================
-- Custom Types (Enums from Contract)
-- =============================================================================

-- Maps to: AssessmentType = z.enum(["naplan", "icas"])
CREATE TYPE assessment_type AS ENUM ('naplan', 'icas');

-- Maps to: ExamStatus = z.enum(["draft", "published"])
CREATE TYPE exam_status AS ENUM ('draft', 'published');

-- Maps to: Subject = z.enum([...])
CREATE TYPE subject AS ENUM (
  'numeracy',
  'reading',
  'writing',
  'language-conventions',
  'mathematics',
  'english',
  'science'
);

-- Maps to: Difficulty = z.enum(["easy", "medium", "hard"])
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');

-- Maps to: ResponseType = z.enum(["mcq", "short", "extended", "numeric"])
CREATE TYPE response_type AS ENUM ('mcq', 'short', 'extended', 'numeric');

-- Maps to: MediaType = z.enum(["image", "diagram", "graph"])
CREATE TYPE media_type AS ENUM ('image', 'diagram', 'graph');

-- Maps to: MediaPlacement = z.enum(["above", "inline", "below"])
CREATE TYPE media_placement AS ENUM ('above', 'inline', 'below');

-- Attempt status (not in contract, required for exam_attempts table)
CREATE TYPE attempt_status AS ENUM ('started', 'submitted');

-- =============================================================================
-- Table: exam_packages
-- =============================================================================
-- Purpose: Stores exam package metadata
-- Maps to: ExamMetadataSchema in contract
-- =============================================================================

CREATE TABLE exam_packages (
  -- Primary key: Maps to metadata.id
  id UUID PRIMARY KEY,
  
  -- Title: Maps to metadata.title (1-200 chars)
  title VARCHAR(200) NOT NULL,
  CONSTRAINT exam_packages_title_not_empty CHECK (char_length(title) >= 1),
  
  -- Year level: Maps to metadata.yearLevel (1-9)
  year_level SMALLINT NOT NULL,
  CONSTRAINT exam_packages_year_level_range CHECK (year_level >= 1 AND year_level <= 9),
  
  -- Subject: Maps to metadata.subject
  subject subject NOT NULL,
  
  -- Assessment type: Maps to metadata.assessmentType
  assessment_type assessment_type NOT NULL,
  
  -- Duration: Maps to metadata.durationMinutes (5-180)
  duration_minutes SMALLINT NOT NULL,
  CONSTRAINT exam_packages_duration_range CHECK (duration_minutes >= 5 AND duration_minutes <= 180),
  
  -- Total marks: Maps to metadata.totalMarks (min 1)
  total_marks SMALLINT NOT NULL,
  CONSTRAINT exam_packages_total_marks_positive CHECK (total_marks >= 1),
  
  -- Version: Maps to metadata.version (semver pattern)
  version VARCHAR(20) NOT NULL,
  CONSTRAINT exam_packages_version_semver CHECK (version ~ '^\d+\.\d+\.\d+$'),
  
  -- Schema version: Maps to metadata.schemaVersion (must be "1.0.0")
  schema_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  CONSTRAINT exam_packages_schema_version_valid CHECK (schema_version = '1.0.0'),
  
  -- Status: Maps to metadata.status
  status exam_status NOT NULL DEFAULT 'draft',
  
  -- Instructions: Maps to metadata.instructions (optional array, max 10 items)
  -- Stored as JSONB array of strings
  instructions JSONB DEFAULT '[]'::JSONB,
  
  -- Timestamps: Maps to metadata.createdAt, metadata.updatedAt
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX exam_packages_subject_year_idx ON exam_packages (subject, year_level);
CREATE INDEX exam_packages_status_idx ON exam_packages (status);
CREATE INDEX exam_packages_assessment_type_idx ON exam_packages (assessment_type);

-- =============================================================================
-- Table: exam_media_assets
-- =============================================================================
-- Purpose: Stores media assets declared at the exam package level
-- Maps to: MediaAssetSchema in contract
-- =============================================================================

CREATE TABLE exam_media_assets (
  -- Primary key: Maps to MediaAsset.id
  id UUID PRIMARY KEY,
  
  -- Foreign key to exam package
  exam_package_id UUID NOT NULL REFERENCES exam_packages(id) ON DELETE CASCADE,
  
  -- Type: Maps to MediaAsset.type
  type media_type NOT NULL,
  
  -- Filename: Maps to MediaAsset.filename (1-200 chars)
  filename VARCHAR(200) NOT NULL,
  CONSTRAINT exam_media_assets_filename_not_empty CHECK (char_length(filename) >= 1),
  
  -- MIME type: Maps to MediaAsset.mimeType
  -- Pattern: ^image/(png|jpeg|svg\+xml|webp)$
  mime_type VARCHAR(50) NOT NULL,
  CONSTRAINT exam_media_assets_mime_type_valid CHECK (
    mime_type IN ('image/png', 'image/jpeg', 'image/svg+xml', 'image/webp')
  ),
  
  -- Dimensions: Maps to MediaAsset.width, MediaAsset.height (optional, min 1)
  width INTEGER,
  CONSTRAINT exam_media_assets_width_positive CHECK (width IS NULL OR width >= 1),
  height INTEGER,
  CONSTRAINT exam_media_assets_height_positive CHECK (height IS NULL OR height >= 1),
  
  -- Size: Maps to MediaAsset.sizeBytes (optional, min 1)
  size_bytes INTEGER,
  CONSTRAINT exam_media_assets_size_positive CHECK (size_bytes IS NULL OR size_bytes >= 1)
);

-- Index for lookups by exam package
CREATE INDEX exam_media_assets_package_idx ON exam_media_assets (exam_package_id);

-- =============================================================================
-- Table: exam_questions
-- =============================================================================
-- Purpose: Stores questions belonging to an exam package
-- Maps to: QuestionSchema in contract
-- =============================================================================

CREATE TABLE exam_questions (
  -- Primary key: Maps to Question.id
  id UUID PRIMARY KEY,
  
  -- Foreign key to exam package
  exam_package_id UUID NOT NULL REFERENCES exam_packages(id) ON DELETE CASCADE,
  
  -- Sequence number: Maps to Question.sequenceNumber (min 1)
  sequence_number SMALLINT NOT NULL,
  CONSTRAINT exam_questions_sequence_positive CHECK (sequence_number >= 1),
  
  -- Difficulty: Maps to Question.difficulty
  difficulty difficulty NOT NULL,
  
  -- Response type: Maps to Question.responseType
  response_type response_type NOT NULL,
  
  -- Marks: Maps to Question.marks (1-10, default 1)
  marks SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT exam_questions_marks_range CHECK (marks >= 1 AND marks <= 10),
  
  -- Prompt blocks: Maps to Question.promptBlocks
  -- Stored as JSONB array of PromptBlock objects
  -- Structure: [{ type, content, ... }, ...]
  prompt_blocks JSONB NOT NULL,
  CONSTRAINT exam_questions_prompt_blocks_not_empty CHECK (jsonb_array_length(prompt_blocks) >= 1),
  
  -- Media references: Maps to Question.mediaReferences (optional)
  -- Stored as JSONB array of MediaReference objects
  -- Structure: [{ mediaId, type, placement, altText, caption? }, ...]
  media_references JSONB DEFAULT '[]'::JSONB,
  
  -- Tags: Maps to Question.tags (max 10 items)
  -- Stored as JSONB array of strings
  tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- Hint: Maps to Question.hint (optional, max 500 chars)
  hint VARCHAR(500),
  
  -- Unique constraint: sequence number must be unique within an exam package
  CONSTRAINT exam_questions_unique_sequence UNIQUE (exam_package_id, sequence_number)
);

-- Index for lookups by exam package
CREATE INDEX exam_questions_package_idx ON exam_questions (exam_package_id);
CREATE INDEX exam_questions_response_type_idx ON exam_questions (response_type);

-- =============================================================================
-- Table: exam_question_options
-- =============================================================================
-- Purpose: Stores MCQ options for questions
-- Maps to: McqOptionSchema in contract
-- Rules: Exists only for MCQ questions, exactly 4 options per question
-- =============================================================================

CREATE TABLE exam_question_options (
  -- Composite primary key: question_id + option_id
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  
  -- Option ID: Maps to McqOption.id (must be A, B, C, or D)
  option_id CHAR(1) NOT NULL,
  CONSTRAINT exam_question_options_id_valid CHECK (option_id IN ('A', 'B', 'C', 'D')),
  
  -- Content: Maps to McqOption.content (1-500 chars)
  content VARCHAR(500) NOT NULL,
  CONSTRAINT exam_question_options_content_not_empty CHECK (char_length(content) >= 1),
  
  -- Media reference: Maps to McqOption.mediaReference (optional)
  -- Stored as JSONB object: { mediaId, type, placement, altText, caption? }
  media_reference JSONB,
  
  -- Composite primary key
  PRIMARY KEY (question_id, option_id)
);

-- Index for lookups by question
CREATE INDEX exam_question_options_question_idx ON exam_question_options (question_id);

-- =============================================================================
-- Table: exam_correct_answers
-- =============================================================================
-- Purpose: Stores correct answer definitions for questions
-- Maps to: CorrectAnswerSchema (discriminated union) in contract
-- Supports all response types: mcq, short, extended, numeric
-- =============================================================================

CREATE TABLE exam_correct_answers (
  -- Foreign key to question (one answer per question)
  question_id UUID PRIMARY KEY REFERENCES exam_questions(id) ON DELETE CASCADE,
  
  -- Answer type: Must match question's response_type
  -- Maps to CorrectAnswer.type discriminator
  answer_type response_type NOT NULL,
  
  -- ==========================================================================
  -- MCQ Answer Fields
  -- Maps to: { type: "mcq", correctOptionId: "A"|"B"|"C"|"D" }
  -- ==========================================================================
  correct_option_id CHAR(1),
  CONSTRAINT exam_correct_answers_option_id_valid CHECK (
    correct_option_id IS NULL OR correct_option_id IN ('A', 'B', 'C', 'D')
  ),
  
  -- ==========================================================================
  -- Short Answer Fields
  -- Maps to: { type: "short", acceptedAnswers: string[], caseSensitive: boolean }
  -- ==========================================================================
  accepted_answers JSONB,  -- Array of strings
  case_sensitive BOOLEAN,
  
  -- ==========================================================================
  -- Numeric Answer Fields
  -- Maps to: { type: "numeric", exactValue?, range?, tolerance?, unit? }
  -- ==========================================================================
  exact_value DOUBLE PRECISION,
  range_min DOUBLE PRECISION,
  range_max DOUBLE PRECISION,
  tolerance DOUBLE PRECISION,
  CONSTRAINT exam_correct_answers_tolerance_positive CHECK (tolerance IS NULL OR tolerance >= 0),
  unit VARCHAR(20),
  
  -- ==========================================================================
  -- Extended Answer Fields
  -- Maps to: { type: "extended", rubric: [{criterion, maxMarks}], sampleResponse? }
  -- ==========================================================================
  rubric JSONB,  -- Array of { criterion: string, maxMarks: number }
  sample_response TEXT,
  
  -- ==========================================================================
  -- Type-specific constraints
  -- Ensures fields are populated correctly based on answer_type
  -- ==========================================================================
  
  -- MCQ: Must have correct_option_id
  CONSTRAINT exam_correct_answers_mcq_fields CHECK (
    answer_type != 'mcq' OR correct_option_id IS NOT NULL
  ),
  
  -- Short: Must have accepted_answers
  CONSTRAINT exam_correct_answers_short_fields CHECK (
    answer_type != 'short' OR accepted_answers IS NOT NULL
  ),
  
  -- Numeric: Must have at least exactValue or range
  CONSTRAINT exam_correct_answers_numeric_fields CHECK (
    answer_type != 'numeric' OR (
      exact_value IS NOT NULL OR 
      (range_min IS NOT NULL AND range_max IS NOT NULL)
    )
  ),
  
  -- Extended: Must have rubric
  CONSTRAINT exam_correct_answers_extended_fields CHECK (
    answer_type != 'extended' OR rubric IS NOT NULL
  )
);

-- =============================================================================
-- Table: exam_attempts
-- =============================================================================
-- Purpose: Represents a student's attempt at an exam
-- Not directly in contract, but required for runtime
-- =============================================================================

CREATE TABLE exam_attempts (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to exam package
  exam_package_id UUID NOT NULL REFERENCES exam_packages(id) ON DELETE RESTRICT,
  
  -- Student reference (UUID placeholder for future auth integration)
  student_id UUID NOT NULL,
  
  -- Attempt status
  status attempt_status NOT NULL DEFAULT 'started',
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  
  -- Constraint: submitted_at only when status is 'submitted'
  CONSTRAINT exam_attempts_submitted_timestamp CHECK (
    (status = 'started' AND submitted_at IS NULL) OR
    (status = 'submitted' AND submitted_at IS NOT NULL)
  )
);

-- Indexes for common queries
CREATE INDEX exam_attempts_student_idx ON exam_attempts (student_id);
CREATE INDEX exam_attempts_package_idx ON exam_attempts (exam_package_id);
CREATE INDEX exam_attempts_status_idx ON exam_attempts (status);

-- =============================================================================
-- Table: exam_responses
-- =============================================================================
-- Purpose: Stores student responses per question per attempt
-- Supports all response types via JSONB
-- =============================================================================

CREATE TABLE exam_responses (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to attempt
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  
  -- Foreign key to question
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
  
  -- Response type (denormalized for query efficiency, must match question)
  response_type response_type NOT NULL,
  
  -- Raw response data as JSONB
  -- Structure varies by response_type:
  --   mcq:      { selectedOptionId: "A"|"B"|"C"|"D" }
  --   short:    { answer: "string" }
  --   numeric:  { answer: number }
  --   extended: { answer: "string" }
  response_data JSONB NOT NULL,
  
  -- Timestamp when response was recorded
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one response per question per attempt
  CONSTRAINT exam_responses_unique_per_attempt UNIQUE (attempt_id, question_id)
);

-- Indexes for common queries
CREATE INDEX exam_responses_attempt_idx ON exam_responses (attempt_id);
CREATE INDEX exam_responses_question_idx ON exam_responses (question_id);

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON TABLE exam_packages IS 'Stores exam package metadata. Maps to ExamMetadataSchema in contract.';
COMMENT ON TABLE exam_media_assets IS 'Stores media assets declared at package level. Maps to MediaAssetSchema.';
COMMENT ON TABLE exam_questions IS 'Stores questions belonging to an exam package. Maps to QuestionSchema.';
COMMENT ON TABLE exam_question_options IS 'Stores MCQ options. Maps to McqOptionSchema. Only for MCQ questions.';
COMMENT ON TABLE exam_correct_answers IS 'Stores correct answer definitions. Maps to CorrectAnswerSchema discriminated union.';
COMMENT ON TABLE exam_attempts IS 'Represents a student attempt at an exam. Runtime table, not in contract.';
COMMENT ON TABLE exam_responses IS 'Stores student responses per question per attempt. Runtime table.';

COMMENT ON COLUMN exam_packages.instructions IS 'JSONB array of instruction strings. Max 10 items per contract.';
COMMENT ON COLUMN exam_questions.prompt_blocks IS 'JSONB array of PromptBlock objects. See contract for structure.';
COMMENT ON COLUMN exam_questions.media_references IS 'JSONB array of MediaReference objects. References exam_media_assets.id.';
COMMENT ON COLUMN exam_correct_answers.accepted_answers IS 'JSONB array of accepted answer strings for short response type.';
COMMENT ON COLUMN exam_correct_answers.rubric IS 'JSONB array of {criterion, maxMarks} objects for extended response type.';
COMMENT ON COLUMN exam_responses.response_data IS 'JSONB object containing raw response. Structure varies by response_type.';
