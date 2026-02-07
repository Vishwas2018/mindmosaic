# MindMosaic — Ingestion Pipeline (Day 10)

## Overview

The Ingestion Pipeline is the **official and only** method for inserting exam content into the database. All exam packages must pass through this pipeline.

**Components:**
- Edge Function: `supabase/functions/ingest-exam-package/index.ts`
- Validation: `src/validation/validateExamPackage.ts`
- Transformation: `src/ingestion/transformExamPackage.ts`
- Insertion: `src/ingestion/insertExamPackage.ts`

---

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌───────────────┐     ┌──────────────┐
│   Client     │ ──► │  Edge Function  │ ──► │  Validation   │ ──► │  Transform   │
│  (Admin UI)  │     │    (Deno)       │     │    (Ajv)      │     │  (to rows)   │
└──────────────┘     └─────────────────┘     └───────────────┘     └──────┬───────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │   Insert     │
                                                                    │ (Supabase)   │
                                                                    └──────────────┘
```

---

## Edge Function

### Endpoint

```
POST /functions/v1/ingest-exam-package
```

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with admin role |
| `Content-Type` | Yes | `application/json` |

### Request Body

JSON exam package matching the Day 7 contract schema.

### Response (Success)

```json
{
  "success": true,
  "examPackageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Status: `201 Created`

### Response (Validation Error)

```json
{
  "success": false,
  "error": "validation_failed",
  "schemaErrors": [
    {
      "path": "/metadata/yearLevel",
      "message": "must be <= 9",
      "keyword": "maximum",
      "params": { "limit": 9 }
    }
  ]
}
```

Or:

```json
{
  "success": false,
  "error": "validation_failed",
  "businessErrors": [
    "Total marks mismatch: metadata.totalMarks is 10, but sum of question marks is 8"
  ]
}
```

Status: `400 Bad Request`

### Response (Insert Error)

```json
{
  "success": false,
  "error": "insert_failed",
  "message": "exam_packages: duplicate key value violates unique constraint"
}
```

Status: `500 Internal Server Error`

### Response (Auth Error)

```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```

Status: `401 Unauthorized`

---

## Validation

### JSON Schema Validation

Uses Ajv (Another JSON Schema Validator) with draft-07 schema.

**Key features:**
- All errors reported (`allErrors: true`)
- Format validation enabled (`ajv-formats`)
- UUID, date-time formats enforced

### Business Rule Validation

Beyond JSON Schema, the following rules are enforced:

| Rule | Description |
|------|-------------|
| Total marks consistency | `metadata.totalMarks` must equal sum of question marks |
| Media asset references | All `mediaId` references must exist in `mediaAssets` |
| MCQ options count | MCQ questions must have exactly 4 options |
| Answer type match | `correctAnswer.type` must match `responseType` |
| Sequence numbers | Must be unique and sequential starting from 1 |

### Validation Functions

```typescript
// JSON Schema only
validateExamPackage(data: unknown): ValidationResult

// Business rules only (requires schema-valid data)
validateBusinessRules(data: ExamPackageInput): string[]

// Full validation (schema + business rules)
validateExamPackageFull(data: unknown): FullValidationResult
```

---

## Transformation

### Contract-to-Database Mapping

| Contract Field | Database Table | Column |
|----------------|---------------|--------|
| `metadata.id` | `exam_packages` | `id` |
| `metadata.yearLevel` | `exam_packages` | `year_level` |
| `metadata.assessmentType` | `exam_packages` | `assessment_type` |
| `metadata.durationMinutes` | `exam_packages` | `duration_minutes` |
| `metadata.totalMarks` | `exam_packages` | `total_marks` |
| `questions[].id` | `exam_questions` | `id` |
| `questions[].sequenceNumber` | `exam_questions` | `sequence_number` |
| `questions[].responseType` | `exam_questions` | `response_type` |
| `questions[].promptBlocks` | `exam_questions` | `prompt_blocks` (JSONB) |
| `questions[].options[]` | `exam_question_options` | Multiple rows |
| `questions[].correctAnswer` | `exam_correct_answers` | Discriminated columns |
| `mediaAssets[]` | `exam_media_assets` | Multiple rows |

### Output Types

```typescript
interface TransformedExamPackage {
  examPackage: ExamPackageRow;
  mediaAssets: ExamMediaAssetRow[];
  questions: ExamQuestionRow[];
  questionOptions: ExamQuestionOptionRow[];
  correctAnswers: ExamCorrectAnswerRow[];
}
```

---

## Insertion

### Insert Order

Foreign key dependencies require this order:

1. `exam_packages` — Parent table
2. `exam_media_assets` — References exam_packages
3. `exam_questions` — References exam_packages
4. `exam_question_options` — References exam_questions
5. `exam_correct_answers` — References exam_questions

### RLS Requirements

Insertions must be performed with an admin-role JWT. The Day 9 RLS policies allow:

- Admins: Full CRUD on all content tables
- Students/Parents: No INSERT/UPDATE/DELETE on content tables

### Transaction Notes

The Supabase JS client does not support explicit transactions. The current implementation:
- Inserts in dependency order
- Fails fast on any error
- Does not automatically rollback previous inserts on failure

For true ACID compliance, use the RPC-based `insertExamPackageTransaction` function (requires database-side function).

---

## Testing

### Unit Tests

Location: `tests/ingestion/ingestExamPackage.test.ts`

**Coverage:**
- Schema validation (valid and invalid cases)
- Business rule validation
- Transformation to database rows
- Column naming conventions

### Test Fixture

Location: `tests/fixtures/validExamPackage.json`

A minimal valid exam package with:
- 4 questions (MCQ, numeric, short, extended)
- All response types covered
- No media assets

### Running Tests

```bash
npm test
```

### Integration Tests (Skipped)

Database insertion tests are marked as `describe.skip`. They require:
- Running Supabase instance
- Admin JWT credentials
- Database with Day 8 schema deployed

---

## Usage Example

```typescript
// Using the edge function (recommended)
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/ingest-exam-package`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(examPackage),
  }
);

const result = await response.json();

if (result.success) {
  console.log('Inserted:', result.examPackageId);
} else {
  console.error('Failed:', result.error, result.schemaErrors || result.businessErrors);
}
```

---

## What This Pipeline Does NOT Do

- **Scoring** — No scoring logic
- **Triggers** — No database triggers
- **Identity** — No user/role table management
- **UI** — No admin interface
- **Media upload** — No file storage integration
- **Versioning** — No version conflict resolution

These are intentionally out of scope for Day 10.
