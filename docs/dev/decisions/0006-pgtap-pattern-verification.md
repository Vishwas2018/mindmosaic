# ADR-0006 — §2A pgTAP pattern verification requirement

- Status: accepted
- Date: 2026-05-01
- Stage: 2
- Tags: dx, process

## Context

Stage 2 implementation surfaced four surprises that were knowable from
Postgres/pgTAP docs but were not caught during §2A review:

1. **plan count 66→65**: manual arithmetic error (7+20+1+4+1+12+4+12+4=65, not 66).
2. **DML-CTE parse error**: `SELECT is((WITH x AS (INSERT...) SELECT COUNT(*) FROM x), ...)`
   is illegal — Postgres requires data-modifying CTEs at the top level of a
   statement, not nested inside a scalar expression. All G7–G9 DML assertions had
   to be restructured to `WITH x AS (...) SELECT is((SELECT COUNT(*) FROM x), ...)`.
3. **RLS INSERT-deny raises 42501**: When no INSERT policy exists on an RLS-enabled
   table, Postgres raises `new row violates row-level security policy` (SQLSTATE
   42501) for INSERT. It does NOT silently return 0 rows the way UPDATE/DELETE do
   (which filter via no-visible-rows). G7.2 had to be changed from the DML-CTE
   zero-rows pattern to `throws_ok(sql, '42501', NULL, description)`.
4. **now() constant in transaction**: pgTAP trigger tests that compare
   `updated_at_after > updated_at_before` fail because `now()` returns the
   transaction start time throughout the entire transaction — both reads return
   the same timestamp. Fixed by inserting with a sentinel `updated_at = '2000-01-01'`
   and checking that after UPDATE it is `> '2000-01-01'`.

All four were catchable at §2A review time with 1–2 line skeleton verification.
Total debugging cost: ~45–60 minutes. Estimated §2A skeleton overhead: 5–10 min
per schema stage with new patterns.

## Options considered

1. **Add skeleton requirement to §2A item (e)** — For any pgTAP pattern not
   previously used in this codebase, show the exact 1–2-line skeleton form during
   §2A so the human reviewer can sanity-check it before code generation.
2. **No change** — Accept that implementation will surface these issues and fix them.

## Decision

§2A item (e) must, going forward, include the exact 1–2-line skeleton form for
any pgTAP assertion pattern not previously used in this codebase. CLAUDE_PROMPTS.md
§2A item (e) updated accordingly.

## Rationale

The debugging cost exceeded the §2A review overhead. The patterns that caused
surprises (DML-CTE in SELECT, INSERT vs UPDATE/DELETE RLS behaviour, transaction
timestamp semantics) are each applicable to at least 4 of the remaining 8 schema
stages in Phase 0. Catching them at §2A time prevents recurrence.

## Consequences

- Positive: §2A reviews become self-verifying for new pgTAP patterns. Reduces
  implementation surprises.
- Negative: §2A reviews slightly longer (~5–10 min per schema stage with new
  patterns). Acceptable given surprise cost.
- Follow-ups: Stages 3–10 (all schema stages) — §2A item (e) should note if any
  patterns are reused from Stage 2 (no skeleton needed) or are new (skeleton
  required).

## Implementation notes

Files: `CLAUDE_PROMPTS.md` §2A item (e) amended · Commit: dev-context for Stage 2
Related: Stage 2 DAILY_LOG surprises 1–4
