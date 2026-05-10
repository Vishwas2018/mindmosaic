# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 37 — Teacher Dashboard (2026-05-27)
- Next stage: Stage 38 — Teacher: Student Detail (SCREEN_SPECS Screen 20)
- Days remaining (target 75): 24 (Day 51 of 75 complete)
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 in progress: Stages 28–37 all shipped within budget. Stage 37 completed in 2 of 2 days. **+3 days net banked entering Stage 38**.
- Stages closed: 37 of 75.

## Test suite

| Suite           | Status       | Count                          | Last run   |
| --------------- | ------------ | ------------------------------ | ---------- |
| Unit            | ✅ green      | 540 passed / 1 skipped         | 2026-05-27 |
| Integration     | n/a          | n/a                            | n/a        |
| pgTAP           | ✅ green      | 451/451                        | 2026-05-03 |
| Contract        | ✅ green      | 200/200                        | 2026-05-27 |
| E2E (Vitest)    | ✅ green      | 1/1 (assignments-svc lifecycle)| 2026-05-23 |
| E2E (Playwright)| ⚠ opt-in     | 7 specs (gated)                | n/a        |
| RLS             | ✅ green      | 451/451 (53 tables)            | 2026-05-03 |
| Replay          | ✅ green      | 58/58 assertions               | 2026-05-16 |

Unit + contract breakdown (full `pnpm -r run test` output):
102 (@mm/types) + 32 (@mm/sdk) + 71 (@mm/ui) + 115 (@mm/engines) + 8 (@mm/core) + 24 (content-svc) + 30 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 29 (analytics-svc) + 19 (orchestration-svc) + 20 (assignments-svc contract) + 1 (assignments-svc e2e) + 15 (notifications-svc contract) + 5 (users-svc contract) + 11 (apps/web) = **540 passed, 1 skipped**

Stage 37 adds +12 vs Stage 36: +7 (analytics-svc: 4 × getClassKpi, 3 × patchInterventionAlert) + +5 (users-svc: 3 × handleGetMyClasses, 2 × handleGetClassStudents). users-svc new contract workspace.

Contract count: 200 (analytics-svc 29 + users-svc 5 + other edge functions). pgTAP/RLS not re-run — no new RLS policies.

## Quality gates

| Gate                | Last status                                                     | Last run   |
| ------------------- | --------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (16 packages)                                          | 2026-05-27 |
| pnpm typecheck      | ✅ green (16 packages)                                          | 2026-05-27 |
| pnpm test           | ✅ green (540 passed / 1 skipped — full output captured)        | 2026-05-27 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                     | 2026-05-16 |
| pnpm build          | ✅ green (7/7 packages)                                         | 2026-05-18 |
| RLS coverage        | ✅ 53/53 tables enabled + tested                                | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                                          | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012–0016 (sandbox no Docker)                    | 2026-05-03 (last clean: 11 migrations) |

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
- Workspaces: **16** (users-svc added at Stage 37)
- Issues critical / high / medium / low: **0/0/8/11**
  - Medium (8): ISSUE-0009 (IndexedDB + SW shell-cache v1.1), ISSUE-0010 (adaptive section-boundary banner + DTO field), ISSUE-0011 (deferred content blocks), ISSUE-0014 (exam_date column + UI ingress — v1.1), ISSUE-0021 (auto-groups route shape drift — v1.1 fix at Block 5 stage), ISSUE-0023 (Idempotency-Key enforcement deferred — v1.1), ISSUE-0027 (Block 5 Topic Mastery deferred — v1.1), ISSUE-0029 (close-ritual stale typecheck cache risk)
  - Low (11): ISSUE-0013 (evening ritual test count methodology), ISSUE-0015 (cohort_metric_cache category mismatch), ISSUE-0016 (async_pipeline_event + analytics_audit_log observability parity), ISSUE-0017 (high-fatigue alert deferred), ISSUE-0018 (undocumented env vars), ISSUE-0019 (tooling guard: amend-over-pushed-commit), ISSUE-0020 (generate-plan synchronous in v1), ISSUE-0022 (audit-log cursor pagination deferred), ISSUE-0024 (real-time tracking upgrade deferred), ISSUE-0025 (notification spam guard tuning deferred), ISSUE-0028 (trend sparkline absent — v1.1)
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

Stage 38 — Teacher: Student Detail (`/teacher/students/[id]`). SCREEN_SPECS Screen 20 (SCREEN_SPECS.md:1092+).

**Pre-reads required (T1):**
- SCREEN_SPECS Screen 20 verbatim (student detail content + API call list)
- `apps/web/src/app/(teacher)/` directory — check if `students/[id]/page.tsx` exists (stub or absent)
- analytics-svc handlers.ts — existing student-level endpoints (cohort, alerts per student)
- intelligence-svc handlers.ts — learner profile, causal map, skill mastery for student
- SDK hooks inventory for student-detail hooks

**Open carry-forwards to check at Stage 38 start:**
- ISSUE-0026 (useLearningPlan path) — Stage 38 teacher student detail MAY consume it; check.
- ISSUE-0021 + DEV-20260522-1: auto-groups carries forward; Stage 38 may or may not consume.
- Phase 1 Exit Report at `docs/dev/phase-1-exit-report.md`. Git tag `v1-phase-1` created locally; **push pending approval**.
- Q-28.8 deferral: `SkillGraphCache.adjacency` lacks `strength` + `dependency_class` fields. Address in v1.1.
