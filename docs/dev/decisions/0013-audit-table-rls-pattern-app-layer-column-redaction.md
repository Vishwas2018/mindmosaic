# ADR-0013 — Audit/explainability tables: row-level RLS + app-layer column redaction

- Status: accepted
- Date: 2026-05-03
- Stage: 6
- Tags: backend, security, data

## Context

Stage 6 introduces `intelligence_audit_log`, an append-only table that records every
L1–L9 pipeline decision with fields including `input_snapshot` (raw student input),
`algorithm_version`, and `trace_id` alongside `decision_type` and `decision_summary`.

Arch §2.8 lists intelligence_audit_log as "append-only" with access implied to be
Pattern A (student can read own rows). Arch §3.2 initially proposed Pattern G (deny-all
authenticated; service_role only). The §2A Stage 6 review flagged a conflict: Pattern G
would block students from reading their own decision summaries, contradicting the product
spec requirement that students see why the system made each decision.

Two sub-problems arise:
1. **Row-level access**: Which rows can each role see?
2. **Column-level access**: Some columns (`input_snapshot`, `algorithm_version`, `trace_id`)
   are internal implementation details that should not be exposed to students or parents —
   only to internal services and platform admins.

PostgreSQL offers column-level security via views with `GRANT SELECT (col) ON TABLE`,
but Supabase RLS does not natively support per-column USING expressions.

## Options considered

1. **Pattern G (deny-all) + service-layer view** — intelligence-svc exposes a
   view that projects only safe columns. Pros: zero RLS surface. Cons: blocks students
   from direct SELECT; adds a mandatory view in Stage 18 that is not yet implemented;
   breaks the "Pattern A = student can read own rows" invariant established in arch §1.2.

2. **Column-level RLS** — separate policies per column group using `WITH CHECK` and a
   wrapper view. Pros: declarative. Cons: Supabase does not support per-column USING
   expressions; complex to maintain; no precedent in this codebase.

3. **Pattern A row-level RLS + app-layer column projection (this decision)** — Standard
   Pattern A policies control which rows each role can read. Application code in
   intelligence-svc (Stage 18+) is responsible for projecting only safe columns when
   returning data to students/parents (i.e., SELECT decision_type, decision_summary,
   created_at — NOT input_snapshot, algorithm_version, trace_id).

## Decision

Use **Option 3**: row-level RLS (Pattern A) on `intelligence_audit_log` with
application-layer column projection.

Generalised principle: for audit/explainability tables, PostgreSQL RLS controls row
visibility; column-level access control is the responsibility of the application layer
(API handlers, Edge Functions, server-side queries). Do not use column-level PostgreSQL
features or security-invoker views to enforce column-level access in v1.

## Rationale

Pattern A is already established and tested (Stages 2–5). Adding column-level RLS would
introduce a new pattern with no existing implementation. Application-layer column
projection is standard practice (SELECT only what you expose) and is already enforced at
every API boundary by the Zod response schema. The risk of accidental column exposure is
mitigated by Zod response validation at the Edge Function layer.

## Consequences

- Positive: intelligence_audit_log follows the same Pattern A as every other student-data
  table; no new RLS pattern; student SELECT works without an additional view layer.
- Negative: enforcement of column redaction is application-layer contract, not a
  database guarantee. A bug in intelligence-svc could leak `input_snapshot`.
- Follow-ups:
  - Stage 18 (intelligence-svc): SELECT must project only `decision_type`,
    `decision_summary`, `created_at` for student/parent/teacher callers. Must NOT
    return `input_snapshot`, `algorithm_version`, `trace_id` to non-platform-admin roles.
  - Stage 18 must add a Zod response schema that omits the three internal fields.
  - If compliance requirements change (GDPR audit access, data portability), revisit
    this ADR — column-level encryption or a dedicated audit-export endpoint may be
    required.

## Implementation notes

Files: `supabase/migrations/0005_intelligence_orchestration.sql` (policies ial_*) ·
Commit: 2343cce · Related: ADR-0011, ADR-0012, ISSUE-0002
