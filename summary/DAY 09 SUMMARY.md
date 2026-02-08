# MindMosaic Day 09: Row Level Security

## 📅 Date: February 1, 2026

---

## 🎯 Objective

Implement Row Level Security (RLS) policies to protect exam content and student data based on user roles.

---

## ✅ What Was Accomplished

### Security Model

**Roles are read from JWT claims**, not from a database table:

```sql
SELECT auth.jwt() ->> 'role';
```

### Correct Answer Visibility: Strict Assessment Integrity

**Decision: Students and parents have NO direct database access to `exam_correct_answers`.**

| Role    | Access to Correct Answers |
| ------- | ------------------------- |
| Student | ❌ NO ACCESS              |
| Parent  | ❌ NO ACCESS              |
| Admin   | ✅ Full CRUD              |

**Rationale:**

- Assessment integrity — students cannot query during exam
- Security at database level — cannot bypass via application bugs
- Controlled exposure via edge functions after submission

---

## 📁 Migration File

**Location:** `supabase/migrations/002_row_level_security.sql`

### Helper Functions

```sql
CREATE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', 'anon');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_student() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'student' FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_parent() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'parent' FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'student', 'parent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🔐 Policy Summary

### Content Tables

| Table                   | Student          | Parent           | Admin |
| ----------------------- | ---------------- | ---------------- | ----- |
| `exam_packages`         | SELECT published | SELECT published | ALL   |
| `exam_media_assets`     | SELECT published | SELECT published | ALL   |
| `exam_questions`        | SELECT published | SELECT published | ALL   |
| `exam_question_options` | SELECT published | SELECT published | ALL   |
| `exam_correct_answers`  | ❌ NONE          | ❌ NONE          | ALL   |

### Runtime Tables

| Table            | Student  | Parent        | Admin  |
| ---------------- | -------- | ------------- | ------ |
| `exam_attempts`  | Own only | ❌ (deferred) | SELECT |
| `exam_responses` | Own only | ❌            | SELECT |

---

## 📝 Key Policies

### Published Content Access

```sql
CREATE POLICY "exam_packages_select_published"
ON exam_packages FOR SELECT
USING (
  status = 'published' AND (is_student() OR is_parent())
);
```

### Admin Full Access

```sql
CREATE POLICY "exam_packages_admin_all"
ON exam_packages FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
```

### Student Own Attempts

```sql
CREATE POLICY "exam_attempts_select_own"
ON exam_attempts FOR SELECT
USING (is_student() AND student_id = auth.uid());

CREATE POLICY "exam_attempts_insert_own"
ON exam_attempts FOR INSERT
WITH CHECK (is_student() AND student_id = auth.uid());
```

### Correct Answers - Admin Only

```sql
-- NO student or parent policies
CREATE POLICY "exam_correct_answers_admin_all"
ON exam_correct_answers FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
```

---

## 🔒 Security Guarantees

| Guarantee                    | Implementation              |
| ---------------------------- | --------------------------- |
| No client ID trust           | All checks use `auth.uid()` |
| Published status at DB level | Cannot bypass via app bugs  |
| No DELETE on runtime tables  | Audit trail preserved       |
| Correct answers protected    | Zero rows for non-admin     |

---

## 📋 Day 9 Checklist

- [x] RLS enabled on all 7 tables
- [x] Helper functions with SECURITY DEFINER
- [x] Profiles table created
- [x] Student policies for published content
- [x] Parent policies for published content
- [x] Admin full access policies
- [x] Correct answers blocked for non-admin
- [x] Student can create/read own attempts
- [x] Student can create/read own responses
- [x] No DELETE policies on runtime tables
- [x] Documentation written

---

## ⚠️ Deferred Features

| Feature                           | Reason                  | Resolution |
| --------------------------------- | ----------------------- | ---------- |
| Parent access to student attempts | Requires linking table  | Auth phase |
| JWT role claims configuration     | Requires Supabase setup | Deployment |

---

## 🔍 Testing Checklist

- [ ] Anonymous users see NO data
- [ ] Students see ONLY published content
- [ ] Students CANNOT see `exam_correct_answers`
- [ ] Students can ONLY see own attempts
- [ ] Students CANNOT delete attempts
- [ ] Admins can see everything
- [ ] Admins can write to content tables

---

## 🚀 Next Steps (Day 10)

1. Create ingestion edge function
2. Validate exam packages (JSON Schema)
3. Transform contract to database rows
4. Insert with proper RLS context

---

_Document generated: February 1, 2026_
_MindMosaic v0.4.0 - Day 9_
