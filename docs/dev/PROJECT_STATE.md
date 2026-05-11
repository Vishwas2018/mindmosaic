# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 41 — Phase 2 Exit Review (Conditional Go) (2026-05-31)
- Next stage: Stage 42 — Stripe Integration + Webhook (Phase 4 slice)
- Days remaining (target 75): 18 (Day 57 of 75 complete)
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 complete: Stages 28–41 (14 stages). **+5.5 days net banked entering Phase 3/4**.
- Stages closed: 41 of 75.

## Test suite

| Suite           | Status       | Count                                                         | Last run   |
| --------------- | ------------ | ------------------------------------------------------------- | ---------- |
| Unit            | ✅ green      | 593 passed / 1 skipped (+ 3 Playwright test.skip-guarded)    | 2026-05-11 |
| Integration     | n/a          | n/a                                                           | n/a        |
| pgTAP           | ✅ green      | 451/451                                                       | 2026-05-03 |
| Contract        | ✅ green      | included in 593 Vitest total                                  | 2026-05-11 |
| E2E (Vitest)    | ✅ green      | 1/1 (assignments-svc lifecycle)                               | 2026-05-23 |
| E2E (Playwright)| ⚠ opt-in     | 12 specs / 15 tests (gated)                                   | n/a        |
| RLS             | ✅ green      | 451/451 (53 tables)                                           | 2026-05-03 |
| Replay          | ✅ green      | 58/58 assertions                                              | 2026-05-16 |

Unit + contract breakdown (full `pnpm -r run test` output 2026-05-11 Stage 40 close — unchanged Stage 41 docs-only):
115 (@mm/types) + 46 (@mm/sdk) + 75 (@mm/ui) + 115 (@mm/engines) + 9 (@mm/core) + 24 (content-svc) + 32 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 31 (analytics-svc) + 19 (orchestration-svc) + 20 (assignments-svc incl. e2e) + 15 (notifications-svc) + 7 (users-svc) + 26 (apps/web) = **593 passed, 1 skipped**

Stage 41 is docs-only — no test changes. Stage 40 adds +12 vs Stage 39 (581→593).

## Quality gates

| Gate                | Last status                                                        | Last run   |
| ------------------- | ------------------------------------------------------------------ | ---------- |
| pnpm lint           | ✅ green (16 packages)                                             | 2026-05-31 |
| pnpm typecheck      | ✅ green (16 packages, 0 turbo-cached — --force run per §Close-ritual) | 2026-05-31 |
| pnpm test           | ✅ green (593 passed / 1 skipped — 594 total Vitest)               | 2026-05-11 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                        | 2026-05-16 |
| pnpm build          | ✅ green (exit 0, 21 routes)                                       | 2026-05-11 |
| RLS coverage        | ✅ 53/53 tables enabled + tested                                   | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                                             | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012–0017 (sandbox no Docker)                       | 2026-05-03 (last clean: 11 migrations) |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95                                                 |
| --------------------------------- | ---------- | ------------------------------------------------------------ |
| POST /sessions/{id}/respond       | 300 ms     | not measured — Stage 48 hardening pass (requires deployed environment) |
| POST /sessions/{id}/submit + sync | 5000 ms    | not measured — Stage 48 hardening pass (requires deployed environment) |
| Pipeline async                    | 30000 ms   | not measured — Stage 48 hardening pass (requires deployed environment) |
| Dashboard load                    | 2000 ms    | not measured — Stage 48 hardening pass (requires deployed environment) |

## Open items

- ADRs accepted: **33** (ADR-0001 through ADR-0033)
- ADRs proposed: 0
- Workspaces: **16**
- Issues critical / high / medium / low: **0/0/8/10**
  - Medium (8): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0030
  - Low (10): ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028, ISSUE-0031
  - Resolved: ISSUE-0005, 0006, 0007, 0008, 0012, 0026, **0013, 0018, 0029** (Stage 41 audit triage)
- Open questions: 0
- Open bugs: 0
- Deviations logged: 16 total (8 resolved, 8 open)
  - DEV-20260430-1 resolved Stage 15
  - DEV-20260511-1 resolved Stage 22b
  - DEV-20260515-1 self-resolved Stage 25
  - DEV-20260518-1 resolved Stage 28
  - DEV-20260522-2 resolved Stage 32
  - DEV-20260511-2 self-resolved Stage 40
  - DEV-20260527-1 resolved Stage 41 (close-ritual cache-bust canonised)
  - DEV-20260524-1 resolved Stage 41 (documentation side — deployment.md)
  - DEV-20260503-2 ongoing v1.1
  - DEV-20260519-1 ongoing — exam_date column deferred
  - DEV-20260522-1 ongoing v1.1 — auto-groups route shape
  - DEV-20260523-1 ongoing v1.1 — Idempotency-Key enforcement
  - DEV-20260526-1 ongoing — PathwayReadiness from learner profile, not analytics-svc
  - DEV-20260529-1 ongoing — 5-step wizard vs 4-step SCREEN_SPECS §22 (Stage 39)
  - DEV-20260530-1 ongoing — tab labels Assigned/In Progress/Completed vs spec
  - DEV-20260530-2 ongoing — Review button vs dropdown (Stage 40)
- Tag state: `v1-phase-1` pushed to origin (Stage 41). `v1-phase-2-partial` created and pushed (Stage 41).

## Notes for next session

Stage 42 — Stripe Integration + Webhook (Phase 4 slice). Read DEV_PLAN.md Stage 42 entry before any work.

Anticipated Stripe-specific discipline:
- Q-42.* likely needed on: test-mode vs live-mode key strategy; webhook signature verification (`stripe.webhooks.constructEvent`); idempotency for payment events (distinct from ISSUE-0023 assignment idempotency); subscription tier mapping to `user_role` / feature flags.
- ISSUE-0023 (Idempotency-Key enforcement) is not a blocker for Stripe but the pattern established there (parse-and-log vs full dedup) must not be repeated for payment webhooks — webhook idempotency is correctness-critical.
- migration 0017 not tested against Postgres (sandbox no Docker — same as 0012–0016). No new migrations until Docker validation is possible.
- DEV-20260529-1, DEV-20260530-1/2: v1.1 spec reconciliation needed; not Stage 42 work.
- v1-phase-1 and v1-phase-2-partial tags both pushed. Next tag: `v1.0.0` at Stage 49 (full launch gate).
