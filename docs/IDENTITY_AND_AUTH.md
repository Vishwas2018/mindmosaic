# MindMosaic — Identity & Auth Model (Day 11)

## Overview

MindMosaic uses Supabase Auth for authentication and a dedicated
`profiles` table for authorization.

Authentication answers **who you are**.
Authorization answers **what you are allowed to do**.

---

## Profiles Table

The `profiles` table is the canonical source of truth for user roles.

### Structure

| Column     | Type        | Description           |
| ---------- | ----------- | --------------------- | ------- | ------ |
| id         | uuid (PK)   | FK to auth.users.id   |
| role       | text        | admin                 | student | parent |
| created_at | timestamptz | Creation timestamp    |
| updated_at | timestamptz | Last update timestamp |

Each authenticated user must have exactly one profile row.

---

## Roles

### admin

- Full access to content tables
- Can ingest exam packages
- Can manage profiles

### student

- Will be able to attempt exams (future)
- No write access to content tables

### parent

- Reserved for future use
- No permissions defined yet

---

## Row Level Security

RLS is enabled on `profiles`.

Policies:

- Users can read their own profile
- Admins can read all profiles
- Admins may update profiles (role changes)

All content tables remain admin‑only for writes.

---

## JWT Role Claim

JWTs are expected to include a `role` claim.

- `profiles.role` is canonical
- JWT role must match profiles.role
- Edge Functions rely on `role = 'admin'` for privileged actions

---

## Future Usage

This identity model will be used by:

- exam_attempts
- exam_responses
- analytics and reporting

No runtime exam logic is implemented yet.
