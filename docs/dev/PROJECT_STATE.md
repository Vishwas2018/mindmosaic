# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 38 — Teacher: Student Detail (2026-05-11)
- Next stage: Stage 39 — (check DEV_PLAN.md for title)
- Days remaining (target 75): 22 (Day 53 of 75 complete)
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 in progress: Stages 28–38 all shipped within budget. Stage 38 completed in 2 of 2 days. **+3 days net banked entering Stage 39**.
- Stages closed: 38 of 75.

## Test suite

| Suite           | Status       | Count                          | Last run   |
| --------------- | ------------ | ------------------------------ | ---------- |
| Unit            | ✅ green      | 547 passed / 1 skipped         | 2026-05-11 |
| Integration     | n/a          | n/a                            | n/a        |
| pgTAP           | ✅ green      | 451/451                        | 2026-05-03 |
| Contract        | ✅ green      | 206/206                        | 2026-05-11 |
| E2E (Vitest)    | ✅ green      | 1/1 (assignments-svc lifecycle)| 2026-05-23 |
| E2E (Playwright)| ⚠ opt-in     | 8 specs (gated)                | n/a        |
| RLS             | ✅ green      | 451/451 (53 tables)            | 2026-05-03 |
| Replay          | ✅ green      | 58/58 assertions               | 2026-05-16 |

Unit + contract breakdown (full `pnpm -r run test` output 2026-05-11):
102 (@mm/types) + 32 (@mm/sdk) + 72 (@mm/ui) + 115 (@mm/engines) + 8 (@mm/core) + 24 (content-svc) + 32 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 31 (analytics-svc) + 19 (orchestration-svc) + 20 (assignments-svc contract) + 1 (assignments-svc e2e) + 15 (notifications-svc contract) + 7 (users-svc contract) + 11 (apps/web) = **547 passed, 1 skipped**

Stage 38 adds +7 vs Stage 37 (540→547): +1 (SkillBar horizontal) +2 (assessment-svc listRecentSessions) +2 (users-svc handleGetStudentProfile) +2 (analytics-svc createInterventionAlert).
Contract count: 206 (analytics-svc 31 + users-svc 7 + other edge functions). pgTAP/RLS not re-run — no new tables (migration 0017 is enum only).

## Quality gates

| Gate                | Last status                                                     | Last run   |
| ------------------- | --------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (16 packages)                                          | 2026-05-11 |
| pnpm typecheck      | ✅ green (16 packages)                                          | 2026-05-11 |
| pnpm test           | ✅ green (547 passed / 1 skipped — 548 total)                   | 2026-05-11 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                     | 2026-05-16 |
| pnpm build          | ✅ green (7/7 packages)                                         | 2026-05-11 |
| RLS coverage        | ✅ 53/53 tables enabled + tested                                | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                                          | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012–0017 (sandbox no Docker)                    | 2026-05-03 (last clean: 11 migrations) |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95                                        |
| --------------------------------- | ---------- | --------------------------------------------------- |
| POST /sessions/{id}/respond       | 300 ms     | n/a — measurement requires deployed environment    |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a — measurement requires deployed environment    |
| Pipeline async                    | 30000 ms   | n/a — measurement requires deployed environment    |
| Dashboard load                    | 2000 ms    | n/a — measurement requires deployed environment    |

## Open items

- ADRs accepted: **33** (ADR-0001 through ADR-0033)
- ADRs proposed: 0
- Workspaces: **16**
- Issues critical / high / medium / low: **0/0/9/11**
  - Medium (9): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0029, ISSUE-0030 (NEW — pathway→strand mapping absent; NAPLAN-only tab at Screen 20)
  - Low (11): ISSUE-0013, ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0018, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028
  - Resolved: ISSUE-0005, 0006, 0007, 0008, 0012
- Open questions: 0
- Open bugs: 0
- Deviations logged: 11 total (5 resolved, 6 open)
  - DEV-20260430-1 resolved Stage 15
  - DEV-20260503-2 ongoing v1.1
  - DEV-20260511-1 resolved Stage 22b
  - DEV-20260515-1 self-resolved Stage 25
  - DEV-20260518-1 resolved Stage 28
  - DEV-20260519-1 ongoing — exam_date column deferred
  - DEV-20260522-1 ongoing v1.1 — auto-groups route shape
  - DEV-20260522-2 resolved Stage 32
  - DEV-20260523-1 ongoing v1.1 — Idempotency-Key enforcement
  - DEV-20260524-1 ongoing — outbox→notifications 5s SLA deferred to Stage 41
  - DEV-20260526-1 ongoing — PathwayReadiness from learner profile, not analytics-svc
  - DEV-20260527-1 ongoing — Stage 36 close stale typecheck cache

## Notes for next session

Stage 39. Read DEV_PLAN.md Stage 39 for full deliverables. Known carry-forwards:
- ISSUE-0026 (useLearningPlan path) — check if Stage 39 consumes it.
- Phase 1 Exit Report + git tag `v1-phase-1` push still pending operator approval.
- Q-28.8 deferral: `SkillGraphCache.adjacency` fields — address in v1.1.
- migration 0017 not tested against Postgres (sandbox no Docker — same as 0012–0016).
