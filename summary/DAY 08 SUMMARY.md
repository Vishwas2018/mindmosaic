# MindMosaic Day 08: Database Schema Design

## 📅 Date: February 1, 2026

---

## 🎯 Objective

Translate the Day 7 exam package contract into a Supabase PostgreSQL schema with proper normalization and constraints.

---

## ✅ What Was Accomplished

### Schema Design Principles

1. **Contract-First** — Every table maps to the contract
2. **UUID Primary Keys** — Globally unique identifiers
3. **JSONB for Nested Objects** — Preserves structure
4. **No Denormalization** — Normalized design
5. **No Soft Deletes** — Hard deletes with CASCADE

### Tables Created

| Table                   | Purpose            | Rows Per Package |
| ----------------------- | ------------------ | ---------------- |
| `exam_packages`         | Exam metadata      | 1                |
| `exam_media_assets`     | Media manifest     | 0-N              |
| `exam_questions`        | Questions          | 1-N              |
| `exam_question_options` | MCQ options        | 0-4 per question |
| `exam_correct_answers`  | Answer definitions | 1 per question   |
| `exam_attempts`         | Student attempts   | Runtime          |
| `exam_responses`        | Student responses  | Runtime          |

### Custom Enum Types

| Type              | Values                                                                          |
| ----------------- | ------------------------------------------------------------------------------- |
| `assessment_type` | naplan, icas                                                                    |
| `exam_status`     | draft, published                                                                |
| `subject`         | numeracy, reading, writing, language-conventions, mathematics, english, science |
| `difficulty`      | easy, medium, hard                                                              |
| `response_type`   | mcq, short, extended, numeric                                                   |
| `media_type`      | image, diagram, graph                                                           |
| `media_placement` | above, inline, below                                                            |
| `attempt_status`  | started, submitted                                                              |

---

## 📁 Migration File

**Location:** `supabase/migrations/001_exam_schema.sql`

### exam_packages Table

```sql
CREATE TABLE exam_packages (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  year_level SMALLINT NOT NULL CHECK (year_level BETWEEN 1 AND 9),
  subject subject NOT NULL,
  assessment_type assessment_type NOT NULL,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 180),
  total_marks SMALLINT NOT NULL CHECK (total_marks >= 1),
  version VARCHAR(20) NOT NULL,
  schema_version VARCHAR(20) NOT NULL CHECK (schema_version = '1.0.0'),
  status exam_status NOT NULL DEFAULT 'draft',
  instructions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### exam_questions Table

```sql
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY,
  exam_package_id UUID NOT NULL REFERENCES exam_packages(id) ON DELETE CASCADE,
  sequence_number SMALLINT NOT NULL CHECK (sequence_number >= 1),
  difficulty difficulty NOT NULL,
  response_type response_type NOT NULL,
  marks SMALLINT NOT NULL DEFAULT 1 CHECK (marks BETWEEN 1 AND 10),
  prompt_blocks JSONB NOT NULL,
  media_references JSONB,
  tags JSONB NOT NULL DEFAULT '[]',
  hint VARCHAR(500),
  UNIQUE (exam_package_id, sequence_number)
);
```

### exam_correct_answers Table

```sql
CREATE TABLE exam_correct_answers (
  question_id UUID PRIMARY KEY REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_type response_type NOT NULL,
  -- MCQ
  correct_option_id CHAR(1) CHECK (correct_option_id IN ('A','B','C','D')),
  -- Short
  accepted_answers JSONB,
  case_sensitive BOOLEAN,
  -- Numeric
  exact_value DOUBLE PRECISION,
  range_min DOUBLE PRECISION,
  range_max DOUBLE PRECISION,
  tolerance DOUBLE PRECISION,
  unit VARCHAR(20),
  -- Extended
  rubric JSONB,
  sample_response TEXT
);
```

---

## 📊 Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐
│  exam_packages  │───────│ exam_media_assets│
│  (metadata)     │ 1   * │                  │
└────────┬────────┘       └──────────────────┘
         │
         │ 1
         ▼ *
┌─────────────────┐       ┌──────────────────────┐
│  exam_questions │───────│ exam_question_options│
│                 │ 1   * │ (MCQ only)           │
└────────┬────────┘       └──────────────────────┘
         │
         │ 1
         ▼ 1
┌─────────────────────┐
│ exam_correct_answers│
└─────────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  exam_packages  │───────│  exam_attempts  │
│                 │ 1   * │                 │
└─────────────────┘       └────────┬────────┘
                                   │ 1
                                   ▼ *
                          ┌─────────────────┐
                          │  exam_responses │
                          └─────────────────┘
```

---

## 🔄 Contract-to-Database Mapping

| Contract Field              | Table                   | Column                  |
| --------------------------- | ----------------------- | ----------------------- |
| `metadata.id`               | `exam_packages`         | `id`                    |
| `metadata.yearLevel`        | `exam_packages`         | `year_level`            |
| `metadata.durationMinutes`  | `exam_packages`         | `duration_minutes`      |
| `questions[].promptBlocks`  | `exam_questions`        | `prompt_blocks` (JSONB) |
| `questions[].options[]`     | `exam_question_options` | Separate rows           |
| `questions[].correctAnswer` | `exam_correct_answers`  | Discriminated columns   |

---

## 📋 Day 8 Checklist

- [x] Enum types created for all contract enums
- [x] exam_packages table with all metadata fields
- [x] exam_media_assets table for media manifest
- [x] exam_questions table with JSONB for blocks
- [x] exam_question_options table for MCQ
- [x] exam_correct_answers with discriminated union columns
- [x] exam_attempts for runtime tracking
- [x] exam_responses for student answers
- [x] Foreign key relationships defined
- [x] CASCADE/RESTRICT delete rules set
- [x] Check constraints applied
- [x] Indexes for common queries

---

## 🏗️ Architecture Decisions

| Decision                  | Rationale                             |
| ------------------------- | ------------------------------------- |
| JSONB for nested objects  | Preserves structure, enables querying |
| Separate options table    | Normalized design, FK constraints     |
| Discriminated union in DB | Maps directly to contract             |
| CASCADE for content       | Allow content updates                 |
| RESTRICT for attempts     | Preserve exam history                 |

---

## 🚀 Next Steps (Day 9)

1. Create Row Level Security policies
2. Define JWT-based role checking
3. Protect correct answers from students
4. Enforce published status access

---

_Document generated: February 1, 2026_
_MindMosaic v0.3.0 - Day 8_
