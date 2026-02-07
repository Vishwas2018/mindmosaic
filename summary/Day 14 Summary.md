# MindMosaic Day 14 HARDENED: Security Fixes Applied

## 📅 Date: February 6, 2026

---

## 🚨 CRITICAL SECURITY FIXES

### Fix 1: Students Cannot Insert exam_results Directly

**Problem:**

- RLS policy allowed authenticated students to INSERT into `exam_results`
- This enabled score forgery

**Solution:**

- **REMOVED** the `exam_results_insert_own` policy entirely
- Created `insert_exam_result()` SECURITY DEFINER function that:
  - Validates attempt exists
  - Validates attempt belongs to `auth.uid()`
  - Validates attempt.status = 'submitted'
  - Enforces idempotency via UNIQUE constraint
  - Only this function can insert results

**Verification:**

```sql
-- Should return NO INSERT policy for students
SELECT * FROM pg_policies WHERE tablename = 'exam_results' AND cmd = 'INSERT';
```

---

### Fix 2: Removed Service Role from Edge Function

**Problem:**

- `SUPABASE_SERVICE_ROLE_KEY` was used to fetch correct answers
- This bypassed RLS and exposed correct answers

**Solution:**

- **COMPLETELY REMOVED** service role usage from `score-attempt`
- Created `get_correct_answers_for_scoring(attempt_id)` SECURITY DEFINER function that:
  - Validates attempt exists
  - Validates attempt belongs to `auth.uid()`
  - Validates attempt.status IN ('submitted', 'evaluated')
  - Returns correct answers ONLY for that attempt's questions
- Edge Function calls this RPC instead of direct table access

**Verification:**

```typescript
// Edge Function now uses ONLY:
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});

// NO MORE:
// const supabaseAdmin = createClient(url, SUPABASE_SERVICE_ROLE_KEY);
```

---

### Fix 3: Students Cannot Mark Attempts as Evaluated

**Problem:**

- Edge Function directly updated `exam_attempts.status = 'evaluated'`
- If Day 13 RLS allowed student updates, this was forgeable

**Solution:**

- **REMOVED** direct UPDATE from Edge Function
- Created `mark_attempt_evaluated(attempt_id)` SECURITY DEFINER function that:
  - Validates ownership
  - Validates attempt.status = 'submitted'
  - Sets status = 'evaluated' and evaluated_at = now()
- Edge Function calls this RPC

---

## ⚠️ CORRECTNESS FIXES

### Fix 4: Aligned Scoring to Ingestion Schema

**Fields Used (from actual exam_correct_answers table):**

| Field               | Type             | Used For                 |
| ------------------- | ---------------- | ------------------------ |
| `correct_option_id` | CHAR(1)          | MCQ                      |
| `accepted_answers`  | JSONB            | Short text, Multi-select |
| `case_sensitive`    | BOOLEAN          | Short text               |
| `exact_value`       | DOUBLE PRECISION | Numeric                  |
| `range_min`         | DOUBLE PRECISION | Numeric                  |
| `range_max`         | DOUBLE PRECISION | Numeric                  |
| `tolerance`         | DOUBLE PRECISION | Numeric                  |

**NOT supported (not in schema or not auto-scorable):**

- `rubric` - Extended questions only, manual review
- `sample_response` - Not used for scoring

---

### Fix 5: Multi-Select Scoring Implemented

**Scoring Rule:**

- Exact set comparison (order-independent)
- No partial credit
- Score = max_score if perfect match, else 0

**Implementation:**

```typescript
function scoreMultiSelect(response, correctAnswer) {
  const selectedOptions = response.response_data?.selectedOptionIds || [];
  const correctOptions = correctAnswer.accepted_answers || [];

  const selectedSet = new Set(selectedOptions.map((s) => s.toUpperCase()));
  const correctSet = new Set(correctOptions.map((s) => s.toUpperCase()));

  if (selectedSet.size !== correctSet.size)
    return { score: 0, isCorrect: false };

  for (const item of selectedSet) {
    if (!correctSet.has(item)) return { score: 0, isCorrect: false };
  }

  return { score: 1, isCorrect: true };
}
```

---

## 🔐 RLS POLICIES (Final State)

### exam_results

| Policy                      | Operation | Who     | Rule                  |
| --------------------------- | --------- | ------- | --------------------- |
| `exam_results_select_own`   | SELECT    | Student | Via attempt ownership |
| `exam_results_select_admin` | SELECT    | Admin   | `is_admin()`          |
| `exam_results_update_admin` | UPDATE    | Admin   | `is_admin()`          |
| `exam_results_delete_admin` | DELETE    | Admin   | `is_admin()`          |

**NO INSERT POLICY** - All inserts via `insert_exam_result()` SECURITY DEFINER

---

## 📁 SECURITY DEFINER Functions

| Function                                      | Purpose                 | Validates                      |
| --------------------------------------------- | ----------------------- | ------------------------------ |
| `get_correct_answers_for_scoring(attempt_id)` | Returns correct answers | Ownership, status              |
| `insert_exam_result(...)`                     | Inserts result          | Ownership, status, idempotency |
| `mark_attempt_evaluated(attempt_id)`          | Updates attempt status  | Ownership, status              |

---

## 🧪 TEST HARNESS Updates

New security tests added:

1. **Student CANNOT insert exam_results directly** - Verifies RLS blocks direct INSERT
2. **Student CANNOT update attempt status directly** - Verifies status changes only via RPC
3. **Student CANNOT access correct_answers table** - Verifies RLS on correct_answers
4. **Multi-select scoring (no partial credit)** - Verifies exact set matching
5. **Extended questions flagged & unscored** - Score = 0, requires_manual_review = true
6. **Student CANNOT update own result** - Only admins can modify results

---

## 📁 Files Delivered

```
day14-hardened/
├── migrations/
│   └── 014_scoring_engine_hardened.sql   # Fixed schema + RLS + RPCs
├── supabase/
│   └── functions/
│       └── score-attempt/
│           └── index.ts                   # No service role, uses RPCs
├── tests/
│   └── runtime/
│       └── test-scoring-flow.mjs          # Security tests included
└── DAY14_HARDENED_SUMMARY.md              # This file
```

---

## 🚀 Deployment Steps

### 1. Apply Migration

```sql
-- Run 014_scoring_engine_hardened.sql in Supabase SQL Editor
-- This will:
-- - Add 'evaluated' to attempt_status enum
-- - Add 'multi' to response_type enum
-- - Create exam_results table
-- - Create SECURITY DEFINER functions
-- - Set up correct RLS policies
```

### 2. Deploy Edge Function

```bash
supabase functions deploy score-attempt
```

### 3. Run Tests

```bash
node tests/runtime/test-scoring-flow.mjs
```

---

## ✅ Verification Checklist

- [ ] No INSERT policy on exam_results for students

  ```sql
  SELECT * FROM pg_policies
  WHERE tablename = 'exam_results' AND cmd = 'INSERT';
  -- Should return 0 rows
  ```

- [ ] SECURITY DEFINER functions exist

  ```sql
  SELECT proname, prosecdef FROM pg_proc
  WHERE proname IN ('get_correct_answers_for_scoring', 'insert_exam_result', 'mark_attempt_evaluated');
  -- All should have prosecdef = true
  ```

- [ ] Edge Function has NO service role reference

  ```bash
  grep -r "SERVICE_ROLE" supabase/functions/score-attempt/
  # Should return nothing
  ```

- [ ] All security tests pass
  ```bash
  node tests/runtime/test-scoring-flow.mjs | grep "SECURITY"
  # All should show ✅
  ```

---

## 🛡️ Security Guarantees

1. **No direct result forgery** - Students cannot INSERT/UPDATE exam_results
2. **No correct answer exposure** - Answers only accessible via validated RPC
3. **No status forgery** - Attempt status changes only via validated RPC
4. **Idempotency** - Multiple scoring calls return same result
5. **Ownership validation** - All operations verify auth.uid() ownership

---

_Document generated: February 6, 2026_
_MindMosaic v1.0.0 - Day 14 HARDENED_
