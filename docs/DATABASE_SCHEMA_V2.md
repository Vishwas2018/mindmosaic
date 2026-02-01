# MindMosaic — Database Schema (Day 8)

## Overview

This document describes the Supabase PostgreSQL schema designed to persist exam packages, questions, media, attempts, and responses.

**Source Contract**: `src/contracts/exam-package.schema.ts` (v1.0.0)  
**Migration File**: `supabase/migrations/001_exam_schema.sql`
**RLS Policies**: See [ROW_LEVEL_SECURITY.md](./ROW_LEVEL_SECURITY.md) (Day 9)


## Design Principles

1. **Contract-First**: Every table and column maps directly to the contract
2. **UUID Primary Keys**: All tables use UUIDs for globally unique identifiers
3. **JSONB for Structured Objects**: Complex nested structures stored as JSONB
4. **No Denormalization**: Normalized design unless contract requires otherwise
5. **No Soft Deletes**: Hard deletes with CASCADE where appropriate
6. **No Scoring Logic**: Schema stores data only, no computed fields

---

## Tables

### 1. `exam_packages`

**Purpose**: Stores exam package metadata.

**Contract Mapping**: `ExamMetadataSchema`

| Column             | Type         | Nullable | Contract Field             | Notes            |
| ------------------ | ------------ | -------- | -------------------------- | ---------------- |
| `id`               | UUID         | No       | `metadata.id`              | Primary key      |
| `title`            | VARCHAR(200) | No       | `metadata.title`           | Min 1 char       |
| `year_level`       | SMALLINT     | No       | `metadata.yearLevel`       | Range: 1-9       |
| `subject`          | ENUM         | No       | `metadata.subject`         | See Subject enum |
| `assessment_type`  | ENUM         | No       | `metadata.assessmentType`  | naplan, icas     |
| `duration_minutes` | SMALLINT     | No       | `metadata.durationMinutes` | Range: 5-180     |
| `total_marks`      | SMALLINT     | No       | `metadata.totalMarks`      | Min 1            |
| `version`          | VARCHAR(20)  | No       | `metadata.version`         | Semver pattern   |
| `schema_version`   | VARCHAR(20)  | No       | `metadata.schemaVersion`   | Must be "1.0.0"  |
| `status`           | ENUM         | No       | `metadata.status`          | draft, published |
| `instructions`     | JSONB        | Yes      | `metadata.instructions`    | Array of strings |
| `created_at`       | TIMESTAMPTZ  | No       | `metadata.createdAt`       | Default: now()   |
| `updated_at`       | TIMESTAMPTZ  | No       | `metadata.updatedAt`       | Default: now()   |

**Indexes**:

- `exam_packages_subject_year_idx` on (subject, year_level)
- `exam_packages_status_idx` on (status)
- `exam_packages_assessment_type_idx` on (assessment_type)

**Relationships**:

- One-to-many with `exam_questions`
- One-to-many with `exam_media_assets`
- One-to-many with `exam_attempts`

---

### 2. `exam_media_assets`

**Purpose**: Stores media assets declared at the exam package level.

**Contract Mapping**: `MediaAssetSchema`

| Column            | Type         | Nullable | Contract Field         | Notes                 |
| ----------------- | ------------ | -------- | ---------------------- | --------------------- |
| `id`              | UUID         | No       | `MediaAsset.id`        | Primary key           |
| `exam_package_id` | UUID         | No       | —                      | FK to exam_packages   |
| `type`            | ENUM         | No       | `MediaAsset.type`      | image, diagram, graph |
| `filename`        | VARCHAR(200) | No       | `MediaAsset.filename`  | Min 1 char            |
| `mime_type`       | VARCHAR(50)  | No       | `MediaAsset.mimeType`  | Validated pattern     |
| `width`           | INTEGER      | Yes      | `MediaAsset.width`     | Min 1 if present      |
| `height`          | INTEGER      | Yes      | `MediaAsset.height`    | Min 1 if present      |
| `size_bytes`      | INTEGER      | Yes      | `MediaAsset.sizeBytes` | Min 1 if present      |

**Valid MIME Types**: `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`

**Relationships**:

- Many-to-one with `exam_packages` (CASCADE delete)
- Referenced by `exam_questions.media_references` (JSONB)
- Referenced by `exam_question_options.media_reference` (JSONB)

---

### 3. `exam_questions`

**Purpose**: Stores questions belonging to an exam package.

**Contract Mapping**: `QuestionSchema`

| Column             | Type         | Nullable | Contract Field             | Notes                         |
| ------------------ | ------------ | -------- | -------------------------- | ----------------------------- |
| `id`               | UUID         | No       | `Question.id`              | Primary key                   |
| `exam_package_id`  | UUID         | No       | —                          | FK to exam_packages           |
| `sequence_number`  | SMALLINT     | No       | `Question.sequenceNumber`  | Min 1, unique per package     |
| `difficulty`       | ENUM         | No       | `Question.difficulty`      | easy, medium, hard            |
| `response_type`    | ENUM         | No       | `Question.responseType`    | mcq, short, extended, numeric |
| `marks`            | SMALLINT     | No       | `Question.marks`           | Range: 1-10, default 1        |
| `prompt_blocks`    | JSONB        | No       | `Question.promptBlocks`    | Array of PromptBlock          |
| `media_references` | JSONB        | Yes      | `Question.mediaReferences` | Array of MediaReference       |
| `tags`             | JSONB        | No       | `Question.tags`            | Array of strings              |
| `hint`             | VARCHAR(500) | Yes      | `Question.hint`            | Optional                      |

`tags` is stored as an array and defaults to an empty array when not provided.

**Defaults**:

- `marks` defaults to 1 when not specified in the contract

**JSONB Structures**:

JSONB column structure is validated at the application and edge-function layer using the Exam Package contract schemas, not within PostgreSQL.

`prompt_blocks` (array):

```json
[
  { "type": "text", "content": "..." },
  { "type": "heading", "level": 1, "content": "..." },
  { "type": "list", "ordered": true, "items": ["..."] },
  { "type": "quote", "content": "...", "attribution": "..." },
  { "type": "instruction", "content": "..." }
]
```

`media_references` (array):

```json
[
  {
    "mediaId": "uuid",
    "type": "image|diagram|graph",
    "placement": "above|inline|below",
    "altText": "...",
    "caption": "..."
  }
]
```

**Constraints**:

- `sequence_number` unique within `exam_package_id`
- `prompt_blocks` must have at least 1 element

**Relationships**:

- Many-to-one with `exam_packages` (CASCADE delete)
- One-to-many with `exam_question_options` (MCQ only)
- One-to-one with `exam_correct_answers`
- One-to-many with `exam_responses`

---

### 4. `exam_question_options`

**Purpose**: Stores MCQ options for questions.

**Contract Mapping**: `McqOptionSchema`

| Column            | Type         | Nullable | Contract Field             | Notes                 |
| ----------------- | ------------ | -------- | -------------------------- | --------------------- |
| `question_id`     | UUID         | No       | —                          | FK to exam_questions  |
| `option_id`       | CHAR(1)      | No       | `McqOption.id`             | Must be A, B, C, or D |
| `content`         | VARCHAR(500) | No       | `McqOption.content`        | Min 1 char            |
| `media_reference` | JSONB        | Yes      | `McqOption.mediaReference` | Single MediaReference |

**Primary Key**: Composite (`question_id`, `option_id`)

**Rules**:

- Only created for questions with `response_type = 'mcq'`
- Exactly 4 options per MCQ question (A, B, C, D)
- Option IDs must be preserved from contract

**JSONB Structure** (`media_reference`):

```json
{
  "mediaId": "uuid",
  "type": "image|diagram|graph",
  "placement": "above|inline|below",
  "altText": "...",
  "caption": "..."
}
```

**Relationships**:

- Many-to-one with `exam_questions` (CASCADE delete)

---

### 5. `exam_correct_answers`

**Purpose**: Stores correct answer definitions for questions.

**Contract Mapping**: `CorrectAnswerSchema` (discriminated union)

| Column              | Type        | Nullable | Contract Field                  | Used By                  |
| ------------------- | ----------- | -------- | ------------------------------- | ------------------------ |
| `question_id`       | UUID        | No       | —                               | PK, FK to exam_questions |
| `answer_type`       | ENUM        | No       | `CorrectAnswer.type`            | All types                |
| `correct_option_id` | CHAR(1)     | Yes      | `McqAnswer.correctOptionId`     | MCQ                      |
| `accepted_answers`  | JSONB       | Yes      | `ShortAnswer.acceptedAnswers`   | Short                    |
| `case_sensitive`    | BOOLEAN     | Yes      | `ShortAnswer.caseSensitive`     | Short                    |
| `exact_value`       | DOUBLE      | Yes      | `NumericAnswer.exactValue`      | Numeric                  |
| `range_min`         | DOUBLE      | Yes      | `NumericAnswer.range.min`       | Numeric                  |
| `range_max`         | DOUBLE      | Yes      | `NumericAnswer.range.max`       | Numeric                  |
| `tolerance`         | DOUBLE      | Yes      | `NumericAnswer.tolerance`       | Numeric                  |
| `unit`              | VARCHAR(20) | Yes      | `NumericAnswer.unit`            | Numeric                  |
| `rubric`            | JSONB       | Yes      | `ExtendedAnswer.rubric`         | Extended                 |
| `sample_response`   | TEXT        | Yes      | `ExtendedAnswer.sampleResponse` | Extended                 |

**Discriminated Union Mapping**:

| answer_type | Required Fields                              | Optional Fields     |
| ----------- | -------------------------------------------- | ------------------- |
| `mcq`       | `correct_option_id`                          | —                   |
| `short`     | `accepted_answers`                           | `case_sensitive`    |
| `numeric`   | `exact_value` OR (`range_min` + `range_max`) | `tolerance`, `unit` |
| `extended`  | `rubric`                                     | `sample_response`   |

**Constraints**:

- `answer_type` must exactly match the parent question’s `response_type` value.
- Type-specific CHECK constraints enforce required fields

**JSONB Structures**:

`accepted_answers` (array):

```json
["answer1", "answer2", "answer3"]
```

`rubric` (array):

```json
[
  { "criterion": "Clear explanation", "maxMarks": 2 },
  { "criterion": "Correct answer", "maxMarks": 1 }
]
```

**Relationships**:

- One-to-one with `exam_questions` (CASCADE delete)

---

### 6. `exam_attempts`

**Purpose**: Represents a student's attempt at an exam.

**Contract Mapping**: Not in contract (runtime table)

| Column            | Type        | Nullable | Notes                            |
| ----------------- | ----------- | -------- | -------------------------------- |
| `id`              | UUID        | No       | Primary key, auto-generated      |
| `exam_package_id` | UUID        | No       | FK to exam_packages              |
| `student_id`      | UUID        | No       | Placeholder for future auth      |
| `status`          | ENUM        | No       | started, submitted               |
| `started_at`      | TIMESTAMPTZ | No       | Default: now()                   |
| `submitted_at`    | TIMESTAMPTZ | Yes      | Required when status = submitted |

**Constraints**:

- `submitted_at` must be NULL when status is 'started'
- `submitted_at` must be NOT NULL when status is 'submitted'

**Relationships**:

- Many-to-one with `exam_packages` (RESTRICT delete)
- One-to-many with `exam_responses`

---

### 7. `exam_responses`

**Purpose**: Stores student responses per question per attempt.

**Contract Mapping**: Not in contract (runtime table)

| Column          | Type        | Nullable | Notes                       |
| --------------- | ----------- | -------- | --------------------------- |
| `id`            | UUID        | No       | Primary key, auto-generated |
| `attempt_id`    | UUID        | No       | FK to exam_attempts         |
| `question_id`   | UUID        | No       | FK to exam_questions        |
| `response_type` | ENUM        | No       | Denormalized from question  |
| `response_data` | JSONB       | No       | Raw response data           |
| `responded_at`  | TIMESTAMPTZ | No       | Default: now()              |

**Constraints**:

- Unique constraint on (`attempt_id`, `question_id`)

**JSONB Structure** (`response_data` varies by type):

```json
// MCQ
{ "selectedOptionId": "B" }

// Short
{ "answer": "user response" }

// Numeric
{ "answer": 42.5 }

// Extended
{ "answer": "user's extended response text..." }
```

**Relationships**:

- Many-to-one with `exam_attempts` (CASCADE delete)
- Many-to-one with `exam_questions` (RESTRICT delete)

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐
│  exam_packages  │───────│ exam_media_assets│
│  (metadata)     │ 1   * │                  │
└────────┬────────┘       └──────────────────┘
         │
         │ 1
         │
         ▼ *
┌─────────────────┐       ┌──────────────────────┐
│  exam_questions │───────│ exam_question_options│
│                 │ 1   * │ (MCQ only)           │
└────────┬────────┘       └──────────────────────┘
         │
         │ 1
         │
         ▼ 1
┌─────────────────────┐
│ exam_correct_answers│
└─────────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  exam_packages  │───────│  exam_attempts  │
│                 │ 1   * │                 │
└─────────────────┘       └────────┬────────┘
                                   │
                                   │ 1
                                   │
                                   ▼ *
                          ┌─────────────────┐
                          │  exam_responses │
                          └─────────────────┘
```

---

## Custom Types (Enums)

| Type Name         | Values                                                                          | Contract Source  |
| ----------------- | ------------------------------------------------------------------------------- | ---------------- |
| `assessment_type` | naplan, icas                                                                    | `AssessmentType` |
| `exam_status`     | draft, published                                                                | `ExamStatus`     |
| `subject`         | numeracy, reading, writing, language-conventions, mathematics, english, science | `Subject`        |
| `difficulty`      | easy, medium, hard                                                              | `Difficulty`     |
| `response_type`   | mcq, short, extended, numeric                                                   | `ResponseType`   |
| `media_type`      | image, diagram, graph                                                           | `MediaType`      |
| `media_placement` | above, inline, below                                                            | `MediaPlacement` |
| `attempt_status`  | started, submitted                                                              | Not in contract  |

---

## Mapping Notes

### ExamPackage → Tables

| Contract Field  | Table               | Column(s)            |
| --------------- | ------------------- | -------------------- |
| `metadata.*`    | `exam_packages`     | Direct mapping       |
| `questions[]`   | `exam_questions`    | One row per question |
| `mediaAssets[]` | `exam_media_assets` | One row per asset    |

### Question → Tables

| Contract Field             | Table                   | Column(s)                  |
| -------------------------- | ----------------------- | -------------------------- |
| `Question.id`              | `exam_questions`        | `id`                       |
| `Question.sequenceNumber`  | `exam_questions`        | `sequence_number`          |
| `Question.difficulty`      | `exam_questions`        | `difficulty`               |
| `Question.responseType`    | `exam_questions`        | `response_type`            |
| `Question.marks`           | `exam_questions`        | `marks`                    |
| `Question.promptBlocks`    | `exam_questions`        | `prompt_blocks` (JSONB)    |
| `Question.mediaReferences` | `exam_questions`        | `media_references` (JSONB) |
| `Question.options`         | `exam_question_options` | Separate table             |
| `Question.correctAnswer`   | `exam_correct_answers`  | Separate table             |
| `Question.tags`            | `exam_questions`        | `tags` (JSONB)             |
| `Question.hint`            | `exam_questions`        | `hint`                     |

### CorrectAnswer → Columns

| Contract Type    | answer_type | Used Columns                                                 |
| ---------------- | ----------- | ------------------------------------------------------------ |
| `McqAnswer`      | mcq         | `correct_option_id`                                          |
| `ShortAnswer`    | short       | `accepted_answers`, `case_sensitive`                         |
| `NumericAnswer`  | numeric     | `exact_value`, `range_min`, `range_max`, `tolerance`, `unit` |
| `ExtendedAnswer` | extended    | `rubric`, `sample_response`                                  |

### MediaAsset → Columns

| Contract Field         | Column       |
| ---------------------- | ------------ |
| `MediaAsset.id`        | `id`         |
| `MediaAsset.type`      | `type`       |
| `MediaAsset.filename`  | `filename`   |
| `MediaAsset.mimeType`  | `mime_type`  |
| `MediaAsset.width`     | `width`      |
| `MediaAsset.height`    | `height`     |
| `MediaAsset.sizeBytes` | `size_bytes` |

---

## Implementation Notes

1. **Versioning**: Multiple versions of the same exam package are supported via the `version` column. Each version gets a new `id`.

2. **Schema Version Lock**: The `schema_version` column is constrained to `'1.0.0'`. Updating the contract requires updating this constraint.

3. **JSONB Validation**: PostgreSQL does not validate JSONB structure. Contract validation must occur at the application or edge function layer.

4. **Media Reference Integrity**: The `media_references` JSONB field references `exam_media_assets.id`. This referential integrity must be enforced at the application layer (not via FK constraints on JSONB).

5. **MCQ Option Count**: The 4-option rule for MCQ questions must be enforced at the application layer. The schema allows insertion but does not enforce the count.

6. **Response Type Consistency**: The constraint that `exam_correct_answers.answer_type` matches `exam_questions.response_type` requires application‑layer validation (or a trigger if explicitly added later).

This schema intentionally excludes:

- Row Level Security policies
- Edge function validation
- Scoring or analytics logic

These are addressed in subsequent build phases.
