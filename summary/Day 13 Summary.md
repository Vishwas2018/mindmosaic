# MindMosaic Day 13: Results & Scoring Engine

## 📅 Date: February 5, 2026

---

## 🎯 Objective

Implement the scoring engine that evaluates student responses and stores results after exam submission.

---

## ✅ What Was Accomplished

### Database Changes

#### New Table: `exam_results`

```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
  score SMALLINT NOT NULL DEFAULT 0,
  max_score SMALLINT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  requires_manual_review BOOLEAN NOT NULL DEFAULT false,
  feedback JSONB,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);
```

#### New Enum Value

```sql
ALTER TYPE attempt_status ADD VALUE 'evaluated';
```

### Edge Function: `score-attempt`

**Endpoint:** `POST /functions/v1/score-attempt`

**Request:**

```json
{
  "attemptId": "uuid"
}
```

**Response (200):**

```json
{
  "success": true,
  "results": {
    "totalScore": 15,
    "maxScore": 20,
    "percentage": 75,
    "questionResults": [
      {
        "questionId": "uuid",
        "score": 1,
        "maxScore": 1,
        "isCorrect": true,
        "requiresManualReview": false
      }
    ]
  },
  "evaluatedAt": "2026-02-05T11:00:00Z"
}
```

---

## 📊 Scoring Logic by Response Type

### MCQ Scoring

```typescript
function scoreMcq(response, correctAnswer) {
  const selected = response.response_data?.selectedOptionId;
  const correct = correctAnswer.correct_option_id;

  return {
    score: selected === correct ? 1 : 0,
    isCorrect: selected === correct,
  };
}
```

**Rules:**

- Exact match required
- Score = max_score if correct, 0 otherwise

### Numeric Scoring

```typescript
function scoreNumeric(response, correctAnswer) {
  const answer = response.response_data?.answer;

  // Check exact value with tolerance
  if (correctAnswer.exact_value !== null) {
    const tolerance = correctAnswer.tolerance ?? 0;
    const isCorrect = Math.abs(answer - correctAnswer.exact_value) <= tolerance;
    return { score: isCorrect ? 1 : 0, isCorrect };
  }

  // Check range
  if (correctAnswer.range_min !== null && correctAnswer.range_max !== null) {
    const isCorrect =
      answer >= correctAnswer.range_min && answer <= correctAnswer.range_max;
    return { score: isCorrect ? 1 : 0, isCorrect };
  }
}
```

**Rules:**

- Exact value: within tolerance
- Range: between min and max (inclusive)

### Short Answer Scoring

```typescript
function scoreShort(response, correctAnswer) {
  const answer = response.response_data?.answer || "";
  const accepted = correctAnswer.accepted_answers || [];
  const caseSensitive = correctAnswer.case_sensitive ?? false;

  const normalizedAnswer = caseSensitive ? answer : answer.toLowerCase();
  const isCorrect = accepted.some((a) => {
    const normalizedAccepted = caseSensitive ? a : a.toLowerCase();
    return normalizedAnswer === normalizedAccepted;
  });

  return { score: isCorrect ? 1 : 0, isCorrect };
}
```

**Rules:**

- Match any accepted answer
- Case sensitivity configurable

### Extended Response (No Auto-Score)

```typescript
function scoreExtended(response, correctAnswer) {
  return {
    score: 0,
    isCorrect: false,
    requiresManualReview: true,
  };
}
```

**Rules:**

- Always returns score = 0
- Flags `requiresManualReview = true`
- Admin must manually score

---

## 🔐 RLS Policies for `exam_results`

| Policy                      | Operation | Who     | Condition             |
| --------------------------- | --------- | ------- | --------------------- |
| `exam_results_select_own`   | SELECT    | Student | Via attempt ownership |
| `exam_results_select_admin` | SELECT    | Admin   | `is_admin()`          |
| `exam_results_insert_own`   | INSERT    | Student | Via attempt ownership |
| `exam_results_update_admin` | UPDATE    | Admin   | `is_admin()`          |
| `exam_results_delete_admin` | DELETE    | Admin   | `is_admin()`          |

---

## 🔄 Scoring Flow

```
┌──────────────────┐
│ submit-attempt   │
│ status=submitted │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  score-attempt   │
│                  │
│ 1. Fetch attempt │
│ 2. Validate own  │
│ 3. Fetch answers │
│ 4. Score each    │
│ 5. Insert results│
│ 6. Update status │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ status=evaluated │
│ results visible  │
└──────────────────┘
```

---

## 📝 Response Type Summary

| Type     | Auto-Scored | Scoring Method         |
| -------- | ----------- | ---------------------- |
| MCQ      | ✅ Yes      | Exact match            |
| Numeric  | ✅ Yes      | Tolerance or range     |
| Short    | ✅ Yes      | Accepted answers list  |
| Extended | ❌ No       | Manual review required |

---

## 📁 Files Created

```
supabase/
├── functions/
│   └── score-attempt/
│       └── index.ts
└── migrations/
    └── 013_scoring_engine.sql

tests/
└── runtime/
    └── test-scoring-flow.mjs
```

---

## 🧪 Test Scenarios

### Auto-Scoring Tests

| Test                              | Expected                               |
| --------------------------------- | -------------------------------------- |
| MCQ correct answer                | score = max_score, isCorrect = true    |
| MCQ wrong answer                  | score = 0, isCorrect = false           |
| Numeric within tolerance          | score = max_score                      |
| Numeric outside tolerance         | score = 0                              |
| Short exact match                 | score = max_score                      |
| Short case mismatch (insensitive) | score = max_score                      |
| Extended response                 | score = 0, requiresManualReview = true |

### Security Tests

| Test                               | Expected                 |
| ---------------------------------- | ------------------------ |
| Score other student's attempt      | 403 Forbidden            |
| Score already evaluated attempt    | Idempotent (same result) |
| Student access results before eval | Empty                    |
| Student access results after eval  | Own results only         |

---

## 📋 Day 13 Checklist

- [x] `exam_results` table created
- [x] `evaluated` status added to enum
- [x] `score-attempt` edge function created
- [x] MCQ scoring implemented
- [x] Numeric scoring (exact + range) implemented
- [x] Short answer scoring implemented
- [x] Extended questions flagged for manual review
- [x] RLS policies for results table
- [x] Idempotent scoring (can call multiple times)
- [x] Test suite created

---

## ⚠️ Known Issues (Fixed in Day 14)

| Issue                                    | Severity | Status       |
| ---------------------------------------- | -------- | ------------ |
| Student can INSERT exam_results directly | CRITICAL | Fixed Day 14 |
| Service role used for correct answers    | HIGH     | Fixed Day 14 |
| Direct status UPDATE allowed             | MEDIUM   | Fixed Day 14 |

---

## 🏗️ Architecture Decisions

| Decision                   | Rationale                 |
| -------------------------- | ------------------------- |
| Separate results table     | Normalized, queryable     |
| Idempotent scoring         | Safe to retry             |
| Extended = manual review   | Cannot auto-score rubrics |
| Results visible after eval | Controlled exposure       |

---

## 🚀 Next Steps (Day 14)

1. **Security hardening** — Remove direct INSERT policy
2. **Service role removal** — Use SECURITY DEFINER functions
3. **Multi-select support** — Add scoring for multi-select MCQ
4. **Status update protection** — Via RPC only

---

_Document generated: February 5, 2026_
_MindMosaic v0.8.0 - Day 13_
