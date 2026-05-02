# ADR-0011 — Pattern A SECURITY DEFINER helpers and atomic write function design

- Status: accepted
- Date: 2026-05-02
- Stage: 5
- Tags: backend, security, data

## Context

Arch §3.2 defines "Pattern A" for student-data tables (those carrying `student_id` + `tenant_id`)
and lists five access paths: student-self, parent-of-student, teacher-of-student, org_admin,
platform_admin. The arch template shows these access paths as inline subqueries directly in the
RLS `USING` clause (e.g., `student_id IN (SELECT student_id FROM parent_student_link WHERE
parent_id = auth_user_id())`).

Three problems emerged when implementing Stage 5 under this template:

1. **Inline subquery recursion**: `parent_student_link` and `class_student` are themselves
   RLS-enabled. Inline subqueries against RLS-enabled tables inside a policy `USING` clause
   trigger infinite recursion at PostgreSQL plan time (established in ADR-0005 for junction
   tables). The Pattern A template violates ADR-0005 for two of its five access paths.

2. **Atomic write function privilege boundary**: `create_session_response_atomic` must UPDATE
   `session_record` and INSERT into `response_telemetry`. Students have no UPDATE policy on
   `session_record` (intentional — only the function may bump `version`); `response_telemetry`
   is Pattern G (no authenticated INSERT). A caller-privilege function cannot perform these
   writes. `SECURITY DEFINER` is required.

3. **Invariant enforcement**: Several tables' write paths carry invariants that a direct INSERT
   would bypass silently — optimistic-lock version bump, `items_answered` counter, sequence
   monotonicity, idempotency tracking. Direct INSERT on those tables would corrupt downstream
   consumers even if no RLS policy blocked it.

## Options considered

For problems 1 and 2, the only compliant option is `SECURITY DEFINER` helpers. The question was
whether to inline the multi-path logic or extract it:

1. **Three SECURITY DEFINER helpers returning `uuid[]`** — one per relationship type
   (`fn_my_child_ids`, `fn_teacher_student_ids`) plus one aggregated for session-id-keyed tables
   (`fn_my_session_ids`). Each helper is `STABLE`, has `SET search_path = public, pg_temp`,
   triple REVOKE + GRANT. Policy `USING` clauses use `= ANY(fn_helper())`.
2. **One monolithic helper per table** — encode all five access paths inside a single function
   per table. Avoids composing helpers but duplicates parent/teacher join logic across every
   student-data table.

For problem 3, the question was whether to enforce via RLS or via documentation:

1. **Deny-RLS (no INSERT policy) + RLS-enabled tables** — any direct INSERT raises 42501.
   Enforced by the database; cannot be bypassed by application code.
2. **Documentation only** — documents that "only the atomic function should write this table"
   without database enforcement. Bypassable by future authors.

## Decision

**Three-helper composition (Option 1 for problems 1/2); deny-RLS enforcement (Option 1 for
problem 3).**

Three principles binding on all Stage 5+ migration and application code:

**Principle 1 — Pattern A cross-table access paths use SECURITY DEFINER helpers.**
`fn_my_child_ids()` and `fn_teacher_student_ids()` are the canonical helpers for parent-of-student
and teacher-of-student access paths respectively. `fn_my_session_ids()` aggregates all five paths
for tables keyed by `session_id` only (no `student_id` column). All three helpers: `LANGUAGE sql`,
`STABLE`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, triple REVOKE (`FROM PUBLIC`
twice + `FROM anon`), `GRANT EXECUTE TO authenticated`. Policy expressions use `= ANY(fn_helper())`
not inline subqueries.

**Principle 2 — Atomic write functions are SECURITY DEFINER.**
`create_session_response_atomic` performs writes that exceed the calling user's privileges: UPDATE
on `session_record` (students have no UPDATE policy), INSERT on `response_telemetry` (Pattern G,
no authenticated INSERT). `SECURITY DEFINER` is the only compliant path. Function body must
validate that the calling user owns the session before performing privileged writes (the optimistic
lock UPDATE is both the state-transition guard and the ownership check — if the session is not
active and version-matched, it raises `VERSION_CONFLICT` and no privileged write proceeds).

**Principle 3 — Where an atomic write function exists, it is the only authorized write path.**
Direct INSERT on `session_response`, `response_telemetry`, and `learning_event` is prohibited
(enforced by RLS: no INSERT policy, `ENABLE ROW LEVEL SECURITY` on all three). Bypassing the
atomic function would silently corrupt the invariants it enforces:
- optimistic-lock `version` bump on `session_record`
- `items_answered` counter consistency
- `sequence_number` monotonicity
- idempotency tracking via `api_idempotency_key`
Downstream consumers (intelligence pipeline, analytics) depend on these invariants holding for
every `learning_event` row. A direct INSERT that misses the version bump leaves `session_record`
in an inconsistent state that is invisible to the INSERT caller but fatal to pipeline consumers.

## Rationale

Principle 1 follows directly from ADR-0005 (helper pattern) extended to Pattern A. The three-helper
composition avoids duplicating parent/teacher join logic across every student-data table; each helper
can be independently tested (G16b assertions in 004_sessions_events.sql).

Principle 2 is a hard constraint from the privilege boundary. There is no alternative that preserves
both student INSERT (session_record creation, checkpoint autosave) and function-mediated updates
without `SECURITY DEFINER`.

Principle 3 converts an architectural intent into a database-enforced invariant. "Don't bypass the
function" as documentation has a half-life of one sprint; "INSERT raises 42501" has no half-life.

## Consequences

- Positive: Five access paths expressed once per helper, not once per table. Atomic function's
  invariants are enforced at the database layer, not the application layer.
- Negative: Application code cannot perform bulk INSERT into `session_response`/`learning_event`
  without going through the function (acceptable for v1; batch-insert path is a v1.1 concern).
- Follow-ups:
  - Stage 6+ helpers created for intelligence tables must follow Principle 1 (triple REVOKE,
    `= ANY(fn_helper())` in policy expressions).
  - Any new atomic write function must follow Principles 2 and 3.
  - ISSUE-0002: Stage 2/3 helpers (auth_tenant_id, auth_user_id, auth_role, fn_user_in_my_tenant,
    fn_class_in_my_tenant, fn_graph_version_is_published) are missing `REVOKE FROM anon`; remediation
    migration due before Stage 10 audit.

## Implementation notes

Files: `supabase/migrations/0004_sessions_events.sql` (Sections 3, 4, 5) · `supabase/tests/rls/004_sessions_events.sql` (G16, G16b, G17, G18)  
Commit: (Stage 5 commit)  
Related: ADR-0005, ADR-0008, ADR-0012, ISSUE-0002, BUG-C/BUG-D (Stage 5 DAILY_LOG)
