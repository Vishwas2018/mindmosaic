# MindMosaic Day 07: Exam Package Contract

## 📅 Date: January 31, 2026

---

## 🎯 Objective

Define the authoritative exam package contract as a single source of truth for all assessment content in MindMosaic.

---

## ✅ What Was Accomplished

### Contract Design Principles

1. **Render-Agnostic Content** — Structured blocks, not HTML
2. **Explicit Over Implicit** — All constraints defined
3. **Versionable** — Schema versioning built-in
4. **Dual Validation** — Zod (frontend) + JSON Schema (backend)

### Zod Schema

Created `src/contracts/exam-package.schema.ts`:

```typescript
export const ExamPackageSchema = z.object({
  metadata: ExamMetadataSchema,
  questions: z.array(QuestionSchema).min(1),
  mediaAssets: z.array(MediaAssetSchema).optional(),
});
```

**Key Types:**

| Schema                | Purpose            |
| --------------------- | ------------------ |
| `ExamMetadataSchema`  | Exam information   |
| `QuestionSchema`      | Question structure |
| `PromptBlockSchema`   | Content blocks     |
| `CorrectAnswerSchema` | Answer definitions |
| `MediaAssetSchema`    | Media manifest     |

### JSON Schema

Created `src/contracts/exam-package.json-schema.ts`:

```typescript
export const examPackageJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["metadata", "questions"],
  // ... complete schema definition
};
```

### Prompt Block Types

| Type          | Fields                   | Usage                 |
| ------------- | ------------------------ | --------------------- |
| `text`        | `content`                | Main question text    |
| `heading`     | `level`, `content`       | Section headings      |
| `list`        | `ordered`, `items`       | Bullet/numbered lists |
| `quote`       | `content`, `attribution` | Quoted passages       |
| `instruction` | `content`                | Student instructions  |

### Response Types

| Type       | Correct Answer Schema                                               |
| ---------- | ------------------------------------------------------------------- |
| `mcq`      | `{ correctOptionId: "A" \| "B" \| "C" \| "D" }`                     |
| `short`    | `{ acceptedAnswers: string[], caseSensitive?: boolean }`            |
| `numeric`  | `{ exactValue?: number, range?: { min, max }, tolerance?: number }` |
| `extended` | `{ rubric: RubricItem[], sampleResponse?: string }`                 |

---

## 📁 Files Created

```
src/contracts/
├── exam-package.schema.ts         # Zod schema
├── exam-package.json-schema.ts    # JSON Schema
└── examples/
    ├── year2-numeracy.ts          # Year 2 MCQ example
    ├── year5-mathematics.ts       # Year 5 mixed example
    └── year9-reading.ts           # Year 9 comprehension

scripts/
└── validate-exam-examples.mjs     # Validation script

docs/
└── EXAM_PACKAGE_CONTRACT.md       # Contract documentation
```

---

## 📝 Example Package Structure

```json
{
  "metadata": {
    "id": "uuid",
    "title": "Year 5 Mathematics - Fractions",
    "yearLevel": 5,
    "subject": "mathematics",
    "assessmentType": "naplan",
    "durationMinutes": 45,
    "totalMarks": 20,
    "version": "1.0.0",
    "schemaVersion": "1.0.0",
    "status": "published"
  },
  "questions": [
    {
      "id": "uuid",
      "sequenceNumber": 1,
      "difficulty": "medium",
      "responseType": "mcq",
      "marks": 1,
      "promptBlocks": [{ "type": "text", "content": "What is 1/2 + 1/4?" }],
      "options": [
        { "id": "A", "content": "1/4" },
        { "id": "B", "content": "2/4" },
        { "id": "C", "content": "3/4" },
        { "id": "D", "content": "1" }
      ],
      "correctAnswer": {
        "type": "mcq",
        "correctOptionId": "C"
      }
    }
  ]
}
```

---

## ✅ Validated Examples

| Example                | Year Level | Questions | Types                |
| ---------------------- | ---------- | --------- | -------------------- |
| `year2-numeracy.ts`    | 2          | 3         | MCQ only             |
| `year5-mathematics.ts` | 5          | 4         | MCQ, numeric         |
| `year9-reading.ts`     | 9          | 5         | MCQ, short, extended |

### Validation Script

```bash
npm run validate:exams

# Output:
# ✓ year2-numeracy.ts - valid
# ✓ year5-mathematics.ts - valid
# ✓ year9-reading.ts - valid
```

---

## 🏗️ Architecture Decisions

| Decision                     | Rationale                                     |
| ---------------------------- | --------------------------------------------- |
| Zod + JSON Schema            | Type-safe frontend, language-agnostic backend |
| Structured blocks (not HTML) | Render-agnostic, secure, portable             |
| UUID for all IDs             | Globally unique, no central coordination      |
| Exactly 4 MCQ options        | Consistent with NAPLAN format                 |
| `schemaVersion` field        | Breaking changes require version bump         |

---

## 📋 Day 7 Checklist

- [x] Zod schema created with all types
- [x] JSON Schema created (equivalent)
- [x] ExamMetadataSchema defined
- [x] QuestionSchema with all response types
- [x] PromptBlockSchema for structured content
- [x] CorrectAnswerSchema (discriminated union)
- [x] MediaAssetSchema for media manifest
- [x] Three validated example packages
- [x] Validation script created
- [x] Documentation written

---

## 🔍 Verification

```bash
# Run TypeScript compilation
npm run build

# Run example validation
npm run validate:exams

# Both should pass with no errors
```

---

## 🚀 Next Steps (Day 8)

1. Design Supabase PostgreSQL schema
2. Map contract fields to database columns
3. Create migration files
4. Handle JSONB for nested structures

---

_Document generated: January 31, 2026_
_MindMosaic v0.2.0 - Day 7_
