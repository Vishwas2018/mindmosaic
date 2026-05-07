# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 27 — Phase 1 Exit Review (2026-05-17)
- Next stage: Stage 28 — Job Worker + L3b Causal Full
- Days remaining (target 75): 40
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked** (Stage 27 closed within same-day budget — review only, no code changes).

## Test suite

| Suite       | Status   | Count               | Last run   |
| ----------- | -------- | ------------------- | ---------- |
| Unit        | ✅ green  | 399/399             | 2026-05-16 |
| Integration | n/a      | n/a                 | n/a        |
| pgTAP       | ✅ green  | 451/451             | 2026-05-03 |
| Contract    | ✅ green  | 82/82               | 2026-05-16 |
| RLS         | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E         | ⚠ opt-in | 5 specs (gated)     | n/a        |
| Replay      | ✅ green  | 58/58 assertions    | 2026-05-16 |

Unit + contract breakdown: 97 (@mm/types) + **32** (@mm/sdk: **18** client [+5 ADR-0026 lock-token tests] + 10 keys + 4 hooks) + 67 (@mm/ui) + 110 (@mm/engines) + 24 (@mm/content-svc) + 30 (@mm/assessment-svc) + 28 (@mm/intelligence-svc) + 11 (@mm/web) = **399 total** (unchanged from Stage 26).

Contract count = 24 (content-svc) + 30 (assessment-svc) + 28 (intelligence-svc) = 82 (unchanged).

Replay harness: `scripts/test-scoring.ts` — 50 LinearEngine sessions (5 patterns × 10 replays), 58 assertions, <1 s runtime. `pnpm test:replay`.

pgTAP/RLS not re-run for Stage 27 — no schema changes. Pre-deploy gate from Stages 19+20 still applies.

## Quality gates

| Gate                | Last status                                                     | Last run   |
| ------------------- | --------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)                                           | 2026-05-16 |
| pnpm typecheck      | ✅ green (10 packages)                                          | 2026-05-16 |
| pnpm test           | ✅ green (399/399 unit + contract)                              | 2026-05-16 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                     | 2026-05-16 |
| pnpm build          | ✅ green (7/7 packages)                                         | 2026-05-16 |
| RLS coverage        | ✅ 53/53 tables enabled + tested                                | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                                          | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012 + 0013 (sandbox no Docker)                  | 2026-05-03 (last clean: 11 migrations) |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95                                        |
| --------------------------------- | ---------- | --------------------------------------------------- |
| POST /sessions/{id}/respond       | 300 ms     | n/a — measurement requires deployed environment    |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a — measurement requires deployed environment    |
| Pipeline async                    | 30000 ms   | n/a — measurement requires deployed environment    |
| Dashboard load                    | 2000 ms    | n/a — measurement requires deployed environment    |

k6 load test (`k6/session-loop.js`) is ready for execution; nightly CI workflow (`.github/workflows/load-test.yml`) will run when `LOAD_TEST_BASE_URL` + `LOAD_TEST_TOKEN` secrets are configured post-deploy.

## Open items

- ADRs accepted: **30** (ADR-0001 through ADR-0030; no new ADRs in Stages 24–27)
- ADRs proposed: 0
- Issues critical / high / medium / low: **0/0/4/0**
  - Medium (4): ISSUE-0006 (intelligence-svc L3a bypasses skill-graph cache), ISSUE-0009 (IndexedDB + SW shell-cache v1.1 upgrade — DEV_PLAN §5 P1.6), ISSUE-0010 (adaptive section-boundary banner + DTO field — DEV_PLAN §5 P1.7), ISSUE-0011 (deferred content blocks: Results screen 5 stubs (a–e) + Dashboard mastery snapshot (f) — DEV_PLAN §5 P2.10)
  - **Resolved at Stage 26:** ISSUE-0005 (env hygiene), ISSUE-0007 (SDK X-Session-Lock), ISSUE-0008 (error-code reconciliation)
  - **Resolved at Stage 25 audit:** ISSUE-0012 (commit-msg hook)
- Open questions: 0
- Open bugs: 0
- Deviations logged: 4 (DEV-20260430-1 resolved Stage 15; DEV-20260503-2 ongoing v1.1; DEV-20260511-1 resolved Stage 22b; DEV-20260515-1 self-resolved Stage 25)

## Notes for next session

Stage 28. Refer `DEV_PLAN.md` Stage 28 for deliverables (Days 40–41, 2-day budget): generic job worker + `pipeline.causal.evaluate_full` (L3b) async pipeline step.

Pre-deploy gate still pending: migrations 0012 + 0013 + RLS must be run locally before any deploy (sandbox lacks Docker).

Phase 1 Exit Report at `docs/dev/phase-1-exit-report.md`. Git tag `v1-phase-1` created locally; **push pending approval** — run `git push origin v1-phase-1` when ready.
