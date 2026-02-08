# MindMosaic Day 12: Student Exam Flow (Backend)

## 📅 Date: February 5, 2026

---

## 🎯 Objective

Implement the backend edge functions for the student exam-taking flow: starting attempts, submitting responses, and completing exams.

---

## ✅ What Was Accomplished

### Edge Functions Created

| Function             | Purpose                  | Method |
| -------------------- | ------------------------ | ------ |
| `start-exam-attempt` | Begin an exam attempt    | POST   |
| `submit-response`    | Save a question response | POST   |
| `submit-attempt`     | Complete and submit exam | POST   |

---

## 🔌 API Endpoints

### 1. Start Exam Attempt

**Endpoint:** `POST /functions/v1/start-exam-attempt`

**Request:**

```json
{
  "examPackageId": "uuid"
}
```

**Response (201):**

```json
{
  "success": true,
  "attemptId": "uuid",
  "startedAt": "2026-02-05T10:00:00Z"
}
```

**Business Rules:**

- Exam package must exist and be `published`
- Student can have multiple attempts (no limit by default)
- Creates `exam_attempts` row with `status: 'started'`

### 2. Submit Response

**Endpoint:** `POST /functions/v1/submit-response`

**Request:**

```json
{
  "attemptId": "uuid",
  "questionId": "uuid",
  "responseData": {
    "selectedOptionId": "B" // MCQ example
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "responseId": "uuid",
  "savedAt": "2026-02-05T10:05:00Z"
}
```

**Business Rules:**

- Attempt must belong to authenticated student
- Attempt status must be `started`
- Question must belong to the attempt's exam package
- Upsert behavior (update if exists)

### 3. Submit Attempt

**Endpoint:** `POST /functions/v1/submit-attempt`

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
  "submittedAt": "2026-02-05T10:45:00Z",
  "status": "submitted"
}
```

**Business Rules:**

- Attempt must belong to authenticated student
- Attempt status must be `started`
- Updates status to `submitted`
- Sets `submitted_at` timestamp
- No further responses can be added

---

## 🔐 Security Enforcement

### RLS-Based Ownership

All operations validate ownership via RLS:

```sql
-- Student can only start attempts for themselves
CREATE POLICY "exam_attempts_insert_own"
ON exam_attempts FOR INSERT
WITH CHECK (is_student() AND student_id = auth.uid());

-- Student can only update own attempts
CREATE POLICY "exam_attempts_update_own"
ON exam_attempts FOR UPDATE
USING (is_student() AND student_id = auth.uid());
```

### Response Validation

```sql
-- Student can only submit responses to own attempts
CREATE POLICY "exam_responses_insert_own"
ON exam_responses FOR INSERT
WITH CHECK (
  is_student() AND
  EXISTS (
    SELECT 1 FROM exam_attempts
    WHERE id = attempt_id AND student_id = auth.uid()
  )
);
```

---

## 📝 Response Data Formats

| Response Type | Data Structure                          |
| ------------- | --------------------------------------- |
| MCQ           | `{ "selectedOptionId": "A" }`           |
| Short         | `{ "answer": "user text" }`             |
| Numeric       | `{ "answer": 42.5 }`                    |
| Extended      | `{ "answer": "long text response..." }` |

---

## 🔄 Exam Flow State Machine

```
                    ┌──────────────────┐
                    │  Package exists  │
                    │   (published)    │
                    └────────┬─────────┘
                             │
                    start-exam-attempt
                             │
                             ▼
┌───────────────────────────────────────────────────────┐
│                     STARTED                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │  submit-response (repeatable for each question) │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────┘
                         │
                  submit-attempt
                         │
                         ▼
               ┌─────────────────┐
               │    SUBMITTED    │
               │ (no more edits) │
               └─────────────────┘
```

---

## 📁 Files Created

```
supabase/functions/
├── start-exam-attempt/
│   └── index.ts
├── submit-response/
│   └── index.ts
└── submit-attempt/
    └── index.ts
```

---

## 🧪 Test Scenarios

### Happy Path

1. ✅ Student starts attempt → attempt created
2. ✅ Student submits MCQ response → response saved
3. ✅ Student submits numeric response → response saved
4. ✅ Student submits attempt → status = submitted

### Error Cases

1. ❌ Start attempt for draft package → 400 error
2. ❌ Submit response to other student's attempt → 403 error
3. ❌ Submit response after attempt submitted → 400 error
4. ❌ Submit attempt that's already submitted → 400 error

---

## 📋 Day 12 Checklist

- [x] `start-exam-attempt` edge function created
- [x] `submit-response` edge function created
- [x] `submit-attempt` edge function created
- [x] Ownership validation via RLS
- [x] Status transitions enforced
- [x] Response data formats documented
- [x] Error handling standardized

---

## 🏗️ Architecture Decisions

| Decision                  | Rationale                              |
| ------------------------- | -------------------------------------- |
| Upsert for responses      | Allow students to change answers       |
| No attempt limits         | Business decision, can add later       |
| No time limit enforcement | Backend tracks time, frontend enforces |
| RLS for ownership         | Database-level security                |

---

## ⚠️ Not In Scope

| Feature                   | Reason                  |
| ------------------------- | ----------------------- |
| Scoring                   | Day 13                  |
| Results display           | Day 13                  |
| Time limit enforcement    | Frontend responsibility |
| Question navigation state | Client-side             |

---

## 🚀 Next Steps (Day 13)

1. Create `exam_results` table
2. Build `score-attempt` edge function
3. Implement auto-scoring for MCQ, numeric, short
4. Flag extended questions for manual review
5. Allow results retrieval after submission

---

_Document generated: February 5, 2026_
_MindMosaic v0.7.0 - Day 12_
