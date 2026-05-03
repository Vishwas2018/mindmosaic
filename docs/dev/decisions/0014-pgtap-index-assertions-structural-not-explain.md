# ADR-0014 — pgTAP index assertions via structural catalog check + dedup; not EXPLAIN

- Status: accepted
- Date: 2026-05-03
- Stage: 7
- Tags: tests | dx

## Context

Stage 6 introduced partial unique indexes (repair_record C7 indexes) and verified them
functionally via P5 (throws_like '%duplicate key%'). Before Stage 7, a question arose:
should pgTAP test files use `EXPLAIN SELECT ...` to assert the query planner selects
specific partial indexes (idx_job_poll, idx_job_dedup, etc.)?

On an empty test database, PostgreSQL's planner often chooses a sequential scan over an
index regardless of predicate coverage — table statistics are absent and the cost model
favours seq scan for zero rows. EXPLAIN-based assertions therefore produce false failures
or fragile "pass because the plan happened to match" results. They do not meaningfully
validate index correctness in a pgTAP context.

The relevant spec authority is arch §2.15 (DDL with index definitions) and §5.2 (pipeline
retry table referencing idempotency_key uniqueness).

## Options considered

1. **EXPLAIN-based assertion** — `EXPLAIN SELECT ...` output matched via pgTAP string
   pattern. Pros: exercises actual planner. Cons: fragile on empty DB; planner statistics
   absent; couples tests to query text format.

2. **pg_indexes catalog check only** — `SELECT ok(EXISTS(SELECT 1 FROM pg_indexes WHERE
   indexname='idx_job_poll'), ...)`. Proves DDL was applied. Does not prove predicate
   correctness or uniqueness enforcement.

3. **Structural catalog check + P5 dedup (for unique indexes)** — catalog check proves
   existence; throws_like '%duplicate key%' proves the unique predicate fires on
   conflicting data. EXPLAIN deferred to Stage 26 load tests where real data populates
   statistics.

## Decision

Use **Option 3**: `pg_indexes` catalog check for all indexes; P5 dedup rejection for
unique and partial-unique indexes. EXPLAIN assertions deferred to Stage 26.

## Rationale

Structural catalog checks confirm the index DDL was applied — necessary and sufficient to
catch a missing `CREATE INDEX` statement. P5 dedup rejection proves the unique predicate
evaluates correctly at write time — functionally more meaningful than a planner hint.
Stage 26 load tests run against a seeded database where statistics exist; EXPLAIN there
will produce reliable planner choices.

## Consequences

- Positive: stable test suite; no planner-statistics coupling; dedup tests catch predicate
  logic errors (wrong column, wrong status filter).
- Negative: planner index selection not validated until Stage 26.
- Follow-ups: Stage 26 load-test framework must include EXPLAIN-based assertions for
  critical indexes (idx_job_poll, idx_job_dedup at minimum). Document in Stage 26 prompt.

## Implementation notes

Files: all pgTAP test files from Stage 7 onward.
Pattern: `SELECT ok(EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='T' AND indexname='I'), 'I exists');`
Related: PGTAP_PATTERNS.md P5, BUILD_CONTRACT §10 item 6, Stage 26 load-test plan.
