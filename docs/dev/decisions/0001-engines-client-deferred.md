# ADR-0001 — Defer packages/engines-client to Stage 15

- Status: accepted
- Date: 2026-04-30
- Stage: 1
- Tags: dx | infra

## Context

DEV_PLAN.md Stage 1 originally included `packages/engines-client` in its deliverables list. `@mm/engines-client` is designed to be a browser-safe re-export of the `AssessmentEngine` contract types from `@mm/engines`, excluding any Node-only dependencies so that `apps/web` can import engine contracts without pulling in the full engine implementation.

Stage 15 (Engine Contracts + LinearEngine) is where `packages/engines` gets its first real implementation. `engines-client` has no content to re-export until the engine interface in `packages/engines/src/contracts.ts` exists. Creating an empty `engines-client` package in Stage 1 adds a dependency arrow with nothing on the other end, which would require either:
(a) importing from an empty `@mm/engines` (no value), or
(b) duplicating type stubs (violates single-source-of-truth).

## Options considered

1. **Create engines-client in Stage 1 (empty)** — Pros: plan compliance. Cons: dead package with no exports; turbo build task for it is a no-op; confusing for 14 stages.
2. **Defer engines-client to Stage 15** — Pros: created at the same time as the contracts it re-exports; no empty package in the tree. Cons: minor deviation from Stage 1 deliverables list.

## Decision

Use **Option 2** — defer `packages/engines-client` to Stage 15.

## Rationale

Stage 1's purpose is to establish the monorepo scaffold. An empty package with no exports adds noise without benefit. Stage 15 is the correct home because `engines-client` is a thin browser-safe lens over `packages/engines` contracts, which don't exist until Stage 15. Creating it there maintains co-location of the abstraction and the thing it abstracts.

BUILD_CONTRACT §2 and DEV_PLAN.md §0 both support "vertical slices" and avoiding half-built artifacts.

## Consequences

- Positive: cleaner package graph in Stages 1–14; engines-client is created with real content.
- Negative: Stage 1 deliverables list in DEV_PLAN.md references engines-client but it won't be present — logged as deviation DEV-20260430-1.
- Follow-ups: Stage 15 must create `packages/engines-client` per its deliverables list (already specified there).

## Implementation notes

Files: _(none — non-creation is the action)_ · Commit: 5ea07d4 · Related: DEV-20260430-1
