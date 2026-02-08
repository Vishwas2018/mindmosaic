# MindMosaic Day 10: Ingestion Pipeline

## 📅 Date: February 1, 2026

---

## 🎯 Objective

Create the official ingestion pipeline — the only method for inserting exam content into the database.

---

## ✅ What Was Accomplished

### Pipeline Architecture

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

### Components Created

| Component      | Location                                  | Purpose            |
| -------------- | ----------------------------------------- | ------------------ |
| Edge Function  | `supabase/functions/ingest-exam-package/` | HTTP endpoint      |
| Validation     | `src/validation/validateExamPackage.ts`   | Ajv JSON Schema    |
| Transformation | `src/ingestion/transformExamPackage.ts`   | Contract → DB rows |
| Insertion      | `src/ingestion/insertExamPackage.ts`      | Supabase writes    |

---

## 🔌 Edge Function API

### Endpoint

```
POST /functions/v1/ingest-exam-package
```

### Headers

| Header          | Required | Description                  |
| --------------- | -------- | ---------------------------- |
| `Authorization` | Yes      | Bearer token with admin role |
| `Content-Type`  | Yes      | `application/json`           |

### Success Response (201)

```json
{
  "success": true,
  "examPackageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Validation Error (400)

```json
{
  "success": false,
  "error": "validation_failed",
  "schemaErrors": [
    {
      "path": "/metadata/yearLevel",
      "message": "must be <= 9",
      "keyword": "maximum"
    }
  ]
}
```

### Business Error (400)

```json
{
  "success": false,
  "error": "validation_failed",
  "businessErrors": [
    "Total marks mismatch: metadata.totalMarks is 10, sum is 8"
  ]
}
```

---

## ✅ Validation Layers

### Layer 1: JSON Schema (Ajv)

- Type checking
- Constraint validation
- Format validation (UUID, datetime)
- Required field verification

### Layer 2: Business Rules

| Rule                      | Description                                   |
| ------------------------- | --------------------------------------------- |
| Total marks consistency   | Sum of question marks = `metadata.totalMarks` |
| Media reference integrity | All `mediaId` must exist in `mediaAssets`     |
| MCQ options count         | Exactly 4 options per MCQ                     |
| Answer type match         | `correctAnswer.type` = `responseType`         |
| Sequence numbers          | Unique and sequential from 1                  |

---

## 🔄 Transformation Logic

### Contract → Database Mapping

| Contract                    | Table                   | Columns               |
| --------------------------- | ----------------------- | --------------------- |
| `metadata.*`                | `exam_packages`         | Direct mapping        |
| `questions[]`               | `exam_questions`        | One row per question  |
| `questions[].options`       | `exam_question_options` | 4 rows per MCQ        |
| `questions[].correctAnswer` | `exam_correct_answers`  | Discriminated columns |
| `mediaAssets[]`             | `exam_media_assets`     | One row per asset     |

### Output Type

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

## 📁 Files Created

```
src/
├── validation/
│   └── validateExamPackage.ts      # Ajv + business rules
└── ingestion/
    ├── transformExamPackage.ts     # Contract → rows
    └── insertExamPackage.ts        # Supabase insert

supabase/functions/
└── ingest-exam-package/
    └── index.ts                    # Edge function

tests/
├── fixtures/
│   └── validExamPackage.json       # Test fixture
└── ingestion/
    └── ingestExamPackage.test.ts   # Unit tests
```

---

## 🧪 Test Coverage

### Unit Tests

```bash
npm test

# 20 passing tests:
# ✓ Schema validation (valid/invalid cases)
# ✓ Business rule validation
# ✓ Transformation to database rows
# ✓ Column naming conventions
```

### Test Fixture

Minimal valid exam package with:

- 4 questions (MCQ, numeric, short, extended)
- All response types covered
- No media assets

---

## 📋 Day 10 Checklist

- [x] Ajv validation module created
- [x] Business rule validation implemented
- [x] Transformation logic for all tables
- [x] Edge function endpoint created
- [x] Error responses standardized
- [x] 20 unit tests passing
- [x] Test fixture created
- [x] Documentation written
- [x] Lint passing

---

## 🏗️ Architecture Decisions

| Decision                      | Rationale                      |
| ----------------------------- | ------------------------------ |
| Ajv for JSON Schema           | Edge function compatible, fast |
| Separate validation/transform | Testable units                 |
| Edge function as sole entry   | Single authoritative point     |
| Business rules beyond schema  | Contract constraints           |

---

## ⚠️ Not In Scope

| Feature                     | Reason                 |
| --------------------------- | ---------------------- |
| Scoring logic               | Out of scope           |
| Media upload                | Out of scope           |
| Version conflict resolution | Out of scope           |
| Transaction rollback        | Supabase JS limitation |

---

## 🚀 Next Steps (Day 11)

1. Deploy to Supabase
2. Create test users (student, parent)
3. Verify RLS policies work
4. Test end-to-end ingestion

---

_Document generated: February 1, 2026_
_MindMosaic v0.5.0 - Day 10_
