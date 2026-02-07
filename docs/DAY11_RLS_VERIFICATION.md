# MindMosaic — Day 11: RLS Verification

## Overview

Day 11 verifies that Row Level Security policies are working correctly by testing access patterns for all user roles.

## Prerequisites

Before running tests:

1. ✅ Database schema deployed (`001_exam_schema.sql`)
2. ✅ RLS policies deployed (`002_row_level_security.sql`)
3. ✅ Profiles table created (`20260202_create_profiles.sql`)
4. ✅ Admin user exists with profile
5. ✅ At least one exam package exists
6. 🔲 Test users created (student, parent)

---

## Setup Instructions

### Step 1: Create Test Users in Supabase Auth

Go to **Supabase Dashboard → Authentication → Users → Add user**

Create these users:

| Email              | Password          | Role    |
| ------------------ | ----------------- | ------- |
| `student@test.com` | `TestStudent123!` | student |
| `parent@test.com`  | `TestParent123!`  | parent  |

### Step 2: Add Profiles for Test Users

After creating users, get their UUIDs from the Auth dashboard and run:

```sql
-- Get the UUIDs from Authentication → Users, then:
INSERT INTO public.profiles (id, role) VALUES
  ('STUDENT_UUID_HERE', 'student'),
  ('PARENT_UUID_HERE', 'parent');

-- Verify profiles
SELECT p.id, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;
```

### Step 3: Ensure Published Exam Exists

```sql
-- Make sure we have a published package for students to see
UPDATE exam_packages
SET status = 'published'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Verify
SELECT id, title, status FROM exam_packages;
```

### Step 4: Update Test Configuration

Edit `tests/rls/test-rls-policies.mjs`:

```javascript
const SUPABASE_ANON_KEY = "your_actual_anon_key";

const TEST_USERS = {
  admin: {
    email: "jvishu21@gmail.com",
    password: "your_actual_password",
    expectedRole: "admin",
  },
  // student and parent passwords if different
};
```

### Step 5: Run Tests

```bash
node tests/rls/test-rls-policies.mjs
```

---

## Expected Test Results

### Anonymous Access (No Auth)

| Test                      | Expected  |
| ------------------------- | --------- |
| Read exam_packages        | ❌ 0 rows |
| Read exam_questions       | ❌ 0 rows |
| Read exam_correct_answers | ❌ 0 rows |

### Admin Access

| Test                      | Expected    |
| ------------------------- | ----------- |
| Read exam_packages (all)  | ✅ All rows |
| Read exam_correct_answers | ✅ All rows |
| Read exam_questions       | ✅ All rows |
| Read exam_attempts        | ✅ All rows |
| Read exam_responses       | ✅ All rows |

### Student Access

| Test                            | Expected                             |
| ------------------------------- | ------------------------------------ |
| Read published exam_packages    | ✅ Published only                    |
| Read draft exam_packages        | ❌ 0 rows                            |
| Read exam_correct_answers       | ❌ 0 rows (CRITICAL)                 |
| Read exam_questions (published) | ✅ Questions from published packages |
| Create own exam_attempt         | ✅ Success                           |
| Read own exam_attempts          | ✅ Own only                          |
| Insert exam_response            | ✅ For own attempts                  |
| Insert exam_packages            | ❌ Blocked                           |
| Delete exam_attempts            | ❌ Blocked                           |

### Parent Access

| Test                         | Expected                   |
| ---------------------------- | -------------------------- |
| Read published exam_packages | ✅ Published only          |
| Read exam_correct_answers    | ❌ 0 rows                  |
| Read exam_attempts           | ❌ 0 rows (no linking yet) |
| Read exam_responses          | ❌ 0 rows                  |
| Create exam_attempts         | ❌ Blocked                 |

---

## Security Verification Checklist

After running tests, verify:

- [ ] Anonymous users see NO data
- [ ] Students CANNOT see `exam_correct_answers`
- [ ] Students can ONLY see published content
- [ ] Students can ONLY access their own attempts/responses
- [ ] Students CANNOT delete attempts (audit trail)
- [ ] Parents CANNOT see correct answers
- [ ] Parents CANNOT see student attempts (until linking is implemented)
- [ ] Admins can see everything

---

## Troubleshooting

### "Invalid API key"

- Get the correct anon key from Supabase Dashboard → Settings → API

### "User not found" / Sign-in failed

- Create the user in Supabase Auth Dashboard first
- Check email/password are correct

### Student can see correct answers (CRITICAL)

- Verify RLS is enabled: `ALTER TABLE exam_correct_answers ENABLE ROW LEVEL SECURITY;`
- Check no permissive policies exist for students

### Student can see drafts

- Verify the policy checks `status = 'published'`

---

## Files Created

| File                                           | Purpose                      |
| ---------------------------------------------- | ---------------------------- |
| `tests/rls/test-rls-policies.mjs`              | Comprehensive RLS test suite |
| `supabase/migrations/003_test_users_setup.sql` | Test user setup reference    |
| `docs/DAY11_RLS_VERIFICATION.md`               | This documentation           |

---

## Next Steps (Day 12)

After RLS verification passes:

1. **Student Exam Flow Edge Functions**
   - `start-exam-attempt`
   - `submit-response`
   - `submit-attempt`

2. **Results Retrieval**
   - `get-attempt-results` (with correct answer exposure after submission)
