# ADR-0005 — SECURITY DEFINER helpers for junction-table RLS (BUILD_CONTRACT §6)

- Status: accepted
- Date: 2026-05-01
- Stage: 2
- Tags: backend, security

## Context

`parent_student_link` and `class_student` are junction tables with no `tenant_id`
column. Their RLS SELECT policies must enforce tenant isolation by subquerying
`user_profile` (for parent_student_link: check `parent_id` belongs to the caller's
tenant) or `class_group` (for class_student: check `class_id` belongs to the
caller's tenant). Both referenced tables have RLS enabled.

BUILD_CONTRACT §6 prohibits inline subqueries against RLS-enabled tables inside
policy USING expressions. Postgres evaluates such subqueries in the context of the
calling role, recursively applying RLS, which can produce incorrect results or
policy recursion.

## Options considered

1. **SECURITY DEFINER helper functions** — `fn_user_in_my_tenant(uuid)` and
   `fn_class_in_my_tenant(uuid)` each perform the cross-table lookup with
   SECURITY DEFINER (bypassing the caller's RLS). Policy USING expression calls
   the helper, which returns boolean. BUILD_CONTRACT §6 compliant, deterministic.
2. **Add `tenant_id` to junction tables** — Denormalisation. Adds write complexity
   (must keep in sync on every INSERT), adds storage. Rejected as unnecessary.
3. **Inline subquery in USING** — Violates BUILD_CONTRACT §6. Rejected.

## Decision

Use SECURITY DEFINER helper functions for all junction-table RLS policies that
must subquery a tenant-scoped table.

## Rationale

BUILD_CONTRACT §6 is explicit and unambiguous. SECURITY DEFINER helpers are the
correct pattern. Both helpers include `SET search_path = public, pg_temp`,
`REVOKE EXECUTE FROM PUBLIC`, and `GRANT EXECUTE TO authenticated`.

## Consequences

- Positive: BUILD_CONTRACT §6 compliant. Correct, deterministic RLS on junction
  tables.
- Negative: Two additional functions in the public schema.
- Follow-ups: All future junction-table RLS policies in later migrations must
  follow this same SECURITY DEFINER helper pattern.

## Implementation notes

Files: `supabase/migrations/0001_enums_tenancy_auth.sql` §6 · Commit: e58a925
Related: ADR-0004
