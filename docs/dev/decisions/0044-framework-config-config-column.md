# ADR-0044 — framework_config.config column: add, backfill, constrain

- Status: accepted
- Date: 2026-06-03
- Stage: v1.1 (exam-content branch)
- Tags: backend | data | dx

## Context

`packages/engines/src/contracts.ts:216–219` defines:

```typescript
interface FrameworkConfigRow {
  id: string;
  config: FrameworkConfig;
}
```

`assessment-svc/handlers.ts` reads `.select('id, config')` from `framework_config` at:
- line 264 (`createSession` step 3)
- line 632 (`submitSession`)

Migration `0003_assessment_config.sql:26–38` never created a `config` column.
The table has: `structure`, `adaptive_rules`, `scoring_rules`, `constraints`,
`difficulty_bands`, `blueprint`. No `config`.

PostgREST returns `{"code":"42703","message":"column framework_config.config does not exist"}`
on every select. Both `createSession` and `submitSession` have been non-functional
since migration 0003 was applied. `fc.config` is consumed at two points:
1. `fc.config.time_limit_ms` (line 335) — session time limit
2. `engine.initialise(ctx, fc.config)` (line 347) — all four engines validate
   `config.engine_type` as a guard and throw on mismatch

The breakage was not caught by the contract test suite because
`buildFrameworkConfigRow()` returned a hand-crafted `{ id, config: {...} }`
object matching the TypeScript interface, bypassing the DB schema entirely.
No Zod parse of `config` occurs in the handler path — the code casts directly
(`as FrameworkConfigRow`), so Zod `.default()` values do not apply at runtime;
all fields in `config` must be present in the JSON.

Pre-write gates passed:
- Gate 1: `time_limit_ms: z.number().int().positive().nullable()` — confirmed nullable
- Gate 2: two rows, both in v1 scope (`au_numeracy_y5_format` v1, `au_math_paper_c_format` v1)
- Gate 3: no families outside v1 scope

## Options considered

1. **NOT NULL immediately (single-step migration)** — ADD column + backfill + NOT NULL in one
   transaction. Works on prod (rows exist when migration runs). Works on `db reset` (no rows
   at migration time → backfill is a no-op → NOT NULL applied to empty table → seeds supply config).
   Pros: atomic, no intermediate nullable state. Cons: seeds must be updated simultaneously.

2. **Nullable first, backfill later** — ADD nullable column in migration 0027, then a separate
   migration 0028 after backfill. Pros: decouples deployment from data decisions.
   Cons: window where the column exists but is null returns a handler error instead of a 42703 error
   (marginally better UX but still broken); requires two migration files; seeds must still supply
   config eventually; extra complexity for no real benefit since the backfill values are known.

3. **Fix code to synthesize from existing columns** — Remove `config` column concept; synthesize
   `FrameworkConfig` from `structure`, `scoring_rules`, `constraints`, `adaptive_rules`.
   Pros: no schema change needed.
   Cons: `engine_type` does not exist in any framework_config column (it lives on `pathway`);
   engines validate `config.engine_type` as a type guard and throw on mismatch; injecting it
   from `pathway` would break the `FrameworkConfig` contract and require touching all four engines.
   Rejected.

## Decision

Use **Option 1** — single atomic migration with backfill and NOT NULL in one transaction.

File: `supabase/migrations/0027_framework_config_add_config.sql`

Resolved Q-44.1–Q-44.4 values:
- `time_limit_ms` for `au_numeracy_y5_format`: `null` — per-stage timer lives in
  `adaptive_rules.testlets[*].time_limit_ms` (spec §4.1 "Per-stage timer, server-authoritative";
  no session-level cap for adaptive).
- `time_limit_ms` for `au_math_paper_c_format`: `3600000` — from `structure.time_minutes=60`
  in the seeded row; confirmed by `buildLinearConfig` fixture (`60 * 60 * 1000`).
- `back_navigation_enabled` for `au_numeracy_y5_format`: `true` — AdaptiveEngine enforces
  within-testlet boundary internally; the session-level flag controlling the student UI toggle
  is `true`. Consistent with `buildAdaptiveConfig` fixture comment "within testlet".
- `flag_for_review_enabled` for both: `true` — consistent with both `buildAdaptiveConfig` and
  `buildLinearConfig` fixtures; no spec source contradicts this.
- `scoring_rules` for both: `percentage` formula + 3-band `developing/proficient/advanced` per
  phase-1-exit-report.md §2.2 ("3-band lookup (developing/proficient/advanced)").

Engine thresholds included explicitly in the JSON (not omitted to rely on Zod defaults) because
the handler casts directly without parsing — Zod defaults do not apply.

## Rationale

Option 1 is preferred over Option 2 because the flagged values are now resolved, the backfill
data is confirmed, and a single migration is easier to audit than a two-step migration pair with
an intermediate nullable state. Option 3 is rejected because it would break the engine type
guards without a larger refactor.

## Consequences

- Positive: `createSession` and `submitSession` stop returning `500: column does not exist` after
  migration 0027 is applied.
- Positive: `FrameworkConfigRow.config: FrameworkConfig` type contract is now correct at the DB
  level.
- Positive: `buildFrameworkConfigRow()` in contract tests now Zod-parses the mock config — future
  shape divergence fails the test build rather than silently returning undefined fields.
- Negative: `supabase/seeds/03_assessment_config.sql` and `scripts/seed-e2e.ts` both require
  simultaneous update (done in this commit) to satisfy the NOT NULL constraint on `db reset`.
- Follow-up (out of scope for this commit): pgTAP column-assertion test for `framework_config`
  to catch future column-name drift at the migration layer (ADR-0006 + ADR-0014 precedent).

## Prevention proposal

Root cause: `buildFrameworkConfigRow()` returned a hand-crafted object matching the TypeScript
interface without any DB schema validation. The mock-Supabase pattern has no way to detect
column-name divergence.

Mitigations applied:
1. `buildFrameworkConfigRow` now calls `FrameworkConfigSchema.parse(configInput)` — if the shape
   diverges from the schema in future, the test fails at the builder call, not at an assertion.

Mitigation deferred:
2. pgTAP column assertion on `framework_config` against `information_schema.columns` — follow-up
   per ADR-0006/0014 precedent.

## Implementation notes

Files:
- `supabase/migrations/0027_framework_config_add_config.sql` (migration)
- `supabase/seeds/03_assessment_config.sql` (seed updated with config column)
- `scripts/seed-e2e.ts` (e2e seed updated with config field)
- `supabase/functions/assessment-svc/__tests__/contract.test.ts` (mock hardened)

Related: ISSUE-0038, BUG-0001, Q-44.1–Q-44.4
