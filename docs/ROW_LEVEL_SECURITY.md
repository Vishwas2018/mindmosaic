# MindMosaic — Row Level Security (Day 9)

## Overview

This document describes the Row Level Security (RLS) policies that protect exam content and student data in MindMosaic.

**Migration File**: `supabase/migrations/002_row_level_security.sql`  
**Tables Covered**: 7 (from Day 8 schema only)

---

## Scope

### What Day 9 Covers

- RLS policies for the 7 tables defined in Day 8
- JWT-based role checking functions
- Published status enforcement at database level
- Student ownership enforcement via `auth.uid()`

### What Day 9 Does NOT Cover

- **Identity tables** (`profiles`, `parent_student`) — deferred to Auth/User Model phase
- **Parent-student linking** — requires identity tables, deferred
- **Edge functions** — out of scope
- **Scoring logic** — out of scope
- **Triggers** — out of scope

---

## Role Source

**Roles are read from JWT claims**, not from a database table.

```sql
-- Role is extracted from JWT
SELECT auth.jwt() ->> 'role';
```

### Required JWT Claim

The application must set a custom `role` claim during authentication:

```json
{
  "role": "student" | "parent" | "admin"
}
```

### Why JWT Claims?

1. **No table dependency** — Day 9 does not introduce new tables
2. **Performance** — No additional database lookup for role checks
3. **Supabase standard** — Custom claims are the recommended pattern

### Configuration Requirement

The Auth/User Model phase must configure Supabase to include the `role` claim in JWTs. This is typically done via a database function hook or Supabase Auth configuration.

---

## Correct Answer Visibility Model

### Decision: Option A — Strict Assessment Integrity

**Students and parents have NO direct database access to `exam_correct_answers`.**

| Role | Access to `exam_correct_answers` |
|------|----------------------------------|
| student | ❌ NO ACCESS |
| parent | ❌ NO ACCESS |
| admin | ✅ Full CRUD |

### Rationale

1. **Assessment integrity** — Students cannot query answers during an exam
2. **No UI reliance** — Security is enforced at database level, not UI
3. **Controlled exposure** — Answers can be exposed via edge functions that verify submission status

### How Students See Answers After Submission

In a future phase, an edge function will:
1. Verify the student has submitted the attempt
2. Query `exam_correct_answers` using a service role key
3. Return answers to the student

This is **not** implemented in Day 9.

---

## Tables with RLS Enabled

All 7 Day 8 tables have RLS enabled:

| Table | RLS Enabled |
|-------|-------------|
| `exam_packages` | ✅ |
| `exam_media_assets` | ✅ |
| `exam_questions` | ✅ |
| `exam_question_options` | ✅ |
| `exam_correct_answers` | ✅ |
| `exam_attempts` | ✅ |
| `exam_responses` | ✅ |

---

## Policy Summary

### Content Tables

| Table | Student | Parent | Admin |
|-------|---------|--------|-------|
| `exam_packages` | SELECT published | SELECT published | ALL |
| `exam_media_assets` | SELECT published | SELECT published | ALL |
| `exam_questions` | SELECT published | SELECT published | ALL |
| `exam_question_options` | SELECT published | SELECT published | ALL |
| `exam_correct_answers` | ❌ | ❌ | ALL |

### Runtime Tables

| Table | Student | Parent | Admin |
|-------|---------|--------|-------|
| `exam_attempts` | SELECT/INSERT/UPDATE own | ❌ (deferred) | SELECT |
| `exam_responses` | SELECT/INSERT/UPDATE own | ❌ | SELECT |

**Note**: Parent access to `exam_attempts` is deferred to the Auth/User Model phase when `parent_student` linking is implemented.

---

## Detailed Policies

### `exam_packages`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_packages_select_published` | SELECT | `status = 'published'` AND (student OR parent) |
| `exam_packages_select_admin` | SELECT | admin |
| `exam_packages_insert_admin` | INSERT | admin |
| `exam_packages_update_admin` | UPDATE | admin |
| `exam_packages_delete_admin` | DELETE | admin |

### `exam_media_assets`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_media_assets_select_published` | SELECT | (student OR parent) AND parent package published |
| `exam_media_assets_select_admin` | SELECT | admin |
| `exam_media_assets_insert_admin` | INSERT | admin |
| `exam_media_assets_update_admin` | UPDATE | admin |
| `exam_media_assets_delete_admin` | DELETE | admin |

### `exam_questions`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_questions_select_published` | SELECT | (student OR parent) AND parent package published |
| `exam_questions_select_admin` | SELECT | admin |
| `exam_questions_insert_admin` | INSERT | admin |
| `exam_questions_update_admin` | UPDATE | admin |
| `exam_questions_delete_admin` | DELETE | admin |

### `exam_question_options`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_question_options_select_published` | SELECT | (student OR parent) AND parent package published |
| `exam_question_options_select_admin` | SELECT | admin |
| `exam_question_options_insert_admin` | INSERT | admin |
| `exam_question_options_update_admin` | UPDATE | admin |
| `exam_question_options_delete_admin` | DELETE | admin |

### `exam_correct_answers`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_correct_answers_select_admin` | SELECT | admin |
| `exam_correct_answers_insert_admin` | INSERT | admin |
| `exam_correct_answers_update_admin` | UPDATE | admin |
| `exam_correct_answers_delete_admin` | DELETE | admin |

**No student or parent policies** — strict assessment integrity.

### `exam_attempts`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_attempts_select_own` | SELECT | student AND `student_id = auth.uid()` |
| `exam_attempts_select_admin` | SELECT | admin |
| `exam_attempts_insert_own` | INSERT | student AND `student_id = auth.uid()` |
| `exam_attempts_update_own` | UPDATE | student AND `student_id = auth.uid()` |

**No DELETE policy** — attempts are permanent records.  
**No parent policy** — deferred to Auth/User Model phase.

### `exam_responses`

| Policy | Operation | Condition |
|--------|-----------|-----------|
| `exam_responses_select_own` | SELECT | student AND owns parent attempt |
| `exam_responses_select_admin` | SELECT | admin |
| `exam_responses_insert_own` | INSERT | student AND owns parent attempt |
| `exam_responses_update_own` | UPDATE | student AND owns parent attempt |

**No DELETE policy** — responses are permanent records.  
**No parent policy** — parents cannot view responses.

---

## Helper Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `get_user_role()` | TEXT | Returns `auth.jwt() ->> 'role'` |
| `is_admin()` | BOOLEAN | True if role = 'admin' |
| `is_student()` | BOOLEAN | True if role = 'student' |
| `is_parent()` | BOOLEAN | True if role = 'parent' |

All functions are `STABLE` and use no table lookups.

---

## Security Guarantees

### 1. No Client-Supplied ID Trust

All ownership checks use `auth.uid()`:

```sql
-- CORRECT
USING (student_id = auth.uid())
```

### 2. Published Status at Database Level

Content visibility is enforced in PostgreSQL:

```sql
USING (status = 'published' AND ...)
```

### 3. No DELETE on Runtime Tables

Neither `exam_attempts` nor `exam_responses` have DELETE policies. These are permanent audit records.

### 4. Correct Answers Protected

`exam_correct_answers` has **no student or parent policies**. Direct database queries will return zero rows.

---

## Testing Checklist

Before deploying, verify:

- [ ] Anonymous users cannot read any table
- [ ] Students can only read published packages
- [ ] Students cannot read draft packages
- [ ] Students cannot read `exam_correct_answers`
- [ ] Students can create and view own attempts
- [ ] Students cannot view other students' attempts
- [ ] Students cannot delete attempts or responses
- [ ] Parents can read published content
- [ ] Parents cannot read `exam_correct_answers`
- [ ] Parents cannot read attempts (until Auth phase)
- [ ] Parents cannot read responses
- [ ] Admins can read all content
- [ ] Admins can write to content tables
- [ ] Admins can read (not write) runtime tables

---

## Deferred to Auth/User Model Phase

The following features require identity tables and are deferred:

1. **Parent access to student attempts** — requires `parent_student` linking
2. **Role storage in database** — currently using JWT claims
3. **User profile management** — requires `profiles` table

These will be implemented when the Auth/User Model phase begins.
