# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 31 — L9 Orchestration Weekly Plan (2026-05-21)
- Next stage: Stage 32 — Intelligence + Analytics Endpoints Complete (Day 45)
- Days remaining (target 75): 31
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 in progress: Stages 28–31 shipped within budget. **+2 days net banked entering Stage 32** (no buffer impact from Stages 28, 29, 30, or 31).

## Test suite

| Suite       | Status   | Count                         | Last run   |
| ----------- | -------- | ----------------------------- | ---------- |
| Unit        | ✅ green  | 447 passed / 1 skipped        | 2026-05-21 |
| Integration | n/a      | n/a                           | n/a        |
| pgTAP       | ✅ green  | 451/451                       | 2026-05-03 |
| Contract    | ✅ green  | 124/124                       | 2026-05-21 |
| RLS         | ✅ green  | 451/451 (53 tables)           | 2026-05-03 |
| E2E         | ⚠ opt-in | 5 specs (gated)               | n/a        |
| Replay      | ✅ green  | 58/58 assertions              | 2026-05-16 |

Unit + contract breakdown (full `pnpm -r run test` output):
98 (@mm/types) + 32 (@mm/sdk) + 67 (@mm/ui) + 115 (@mm/engines) + 24 (content-svc) + 30 (assessment-svc) + 43 (intelligence-svc) + 6 (jobs-worker) + 12 (analytics-svc) + 9 (orchestration-svc) + 11 (apps/web) = **447 passed, 1 skipped**

Baseline note: pre-Stage-31 baseline was **438**. Stage 31 adds +9: 9 orchestration-svc contract tests.

Contract count = 24 (content-svc) + 30 (assessment-svc) + 43 (intelligence-svc) + 6 (jobs-worker) + 12 (analytics-svc) + 9 (orchestration-svc) = **124** (was 115 at Stage 30 close).

pgTAP/RLS not re-run for Stage 31 — no new migrations, no RLS policy changes.

## Quality gates

| Gate                | Last status                                                     | Last run   |
| ------------------- | --------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (13 packages)                                          | 2026-05-21 |
| pnpm typecheck      | ✅ green (13 packages)                                          | 2026-05-21 |
| pnpm test           | ✅ green (447 passed / 1 skipped — full output captured)        | 2026-05-21 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                     | 2026-05-16 |
| pnpm build          | ✅ green (7/7 packages)                                         | 2026-05-18 |
| RLS coverage        | ✅ 53/53 tables enabled + tested                                | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                                          | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012 + 0013 + 0014 (sandbox no Docker)           | 2026-05-03 (last clean: 11 migrations) |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95                                        |
| --------------------------------- | ---------- | --------------------------------------------------- |
| POST /sessions/{id}/respond       | 300 ms     | n/a — measurement requires deployed environment    |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a — measurement requires deployed environment    |
| Pipeline async                    | 30000 ms   | n/a — measurement requires deployed environment    |
| Dashboard load                    | 2000 ms    | n/a — measurement requires deployed environment    |

k6 load test (`k6/session-loop.js`) is ready for execution; nightly CI workflow (`.github/workflows/load-test.yml`) will run when `LOAD_TEST_BASE_URL` + `LOAD_TEST_TOKEN` secrets are configured post-deploy.

## Open items

- ADRs accepted: **33** (ADR-0001 through ADR-0033)
- ADRs proposed: 0
- Workspaces: **13** (orchestration-svc added at Stage 31)
- Issues critical / high / medium / low: **0/0/4/7**
  - Medium (4): ISSUE-0009 (IndexedDB + SW shell-cache v1.1 upgrade — DEV_PLAN §5 P1.6), ISSUE-0010 (adaptive section-boundary banner + DTO field — DEV_PLAN §5 P1.7), ISSUE-0011 (deferred content blocks: Results screen 5 stubs (a–e) + Dashboard mastery snapshot (f) — DEV_PLAN §5 P2.10), ISSUE-0014 (exam_date column + UI ingress — v1.1)
  - Low (7): ISSUE-0013 (evening ritual test count methodology — fix applied from Stage 29), ISSUE-0015 (cohort_metric_cache category mismatch — v1.1), ISSUE-0016 (async_pipeline_event + analytics_audit_log for L5/L7/L9 observability parity post ADR-0032 — v1.1), ISSUE-0017 (high-fatigue alert deferred — per-session data not queryable — v1.1), ISSUE-0018 (INTELLIGENCE_SVC_URL + ANALYTICS_SVC_URL + ORCHESTRATION_SVC_URL undocumented in env.example/deployment docs), ISSUE-0019 (tooling guard: amend-over-pushed-commit pattern), ISSUE-0020 (POST /orchestration/generate-plan synchronous in v1; async upgrade deferred to v1.1)
  - **Resolved at Stage 28:** ISSUE-0006 (L3a now uses skill-graph-cache via getSkillGraph())
  - **Resolved at Stage 26:** ISSUE-0005, ISSUE-0007, ISSUE-0008
  - **Resolved at Stage 25 audit:** ISSUE-0012
- Open questions: 0
- Open bugs: 0
- Deviations logged: 6
  - DEV-20260430-1 resolved Stage 15
  - DEV-20260503-2 ongoing v1.1
  - DEV-20260511-1 resolved Stage 22b
  - DEV-20260515-1 self-resolved Stage 25
  - DEV-20260518-1 ongoing — spec §5.1.4 student parameter defect, post-launch spec amendment
  - DEV-20260519-1 ongoing — exam_date column deferred; §12.1 projection branch returns null until v1.1

## Notes for next session

Stage 32 — read DEV_PLAN Stage 32 entry before any work (morning ritual). Stage 32 is a "complete the surface" stage — Intelligence + Analytics endpoints beyond what Stages 26–31 already shipped. Likely lighter scaffold, more route enumeration. Verify DEV_PLAN Stage 32 deliverable list verbatim against arch §4.5 + §4.6 + §4.7 to identify what's already shipped vs what remains. T1–T4 in force from pre-read onward.

Stage 31 retro lesson (b): when a Q resolution changes implementation shape, check test names + doc comments + C-C-D-V Verification section for stale claims before push. Applied at Stage 31: Q-31.7 changed concurrency mechanism; test 6 name held obsolete "SELECT FOR UPDATE" claim; caught at pre-push grep check and renamed in both contract.test.ts + stage-31.md in same commit.

Pre-deploy gate still pending: migrations 0012 + 0013 + 0014 + RLS must be run locally before any deploy (sandbox lacks Docker).

Phase 1 Exit Report at `docs/dev/phase-1-exit-report.md`. Git tag `v1-phase-1` created locally; **push pending approval** — run `git push origin v1-phase-1` when ready.

Q-28.8 deferral: `SkillGraphCache.adjacency` lacks `strength` + `dependency_class` fields (Option B applied). `// Q-28.8:` grep markers at two sites in `intelligence-svc/handlers.ts`. Address in v1.1 if content team adds enriching edges.

Stage 31 Q residuals: Q-31.7 concurrency guard (idx_plan_active + optimistic UPDATE) should be revisited in Stage 32+ if concurrent replan scenarios become a measured concern in production.
