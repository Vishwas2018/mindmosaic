# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 35 — Plan Overrides (2026-05-25)
- Next stage: Stage 36 — Parent Dashboard (Days 50–51, 2-day budget)
- Days remaining (target 75): 26 (Day 49 of 75 complete)
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 in progress: Stages 28–35 all shipped within budget. **+2 days net banked entering Stage 36** (no buffer impact from Stages 28–35).
- Stages closed: 35 of 75.

## Test suite

| Suite           | Status       | Count                          | Last run   |
| --------------- | ------------ | ------------------------------ | ---------- |
| Unit            | ✅ green      | 516 passed / 1 skipped         | 2026-05-25 |
| Integration     | n/a          | n/a                            | n/a        |
| pgTAP           | ✅ green      | 451/451                        | 2026-05-03 |
| Contract        | ✅ green      | 188/188                        | 2026-05-25 |
| E2E (Vitest)    | ✅ green      | 1/1 (assignments-svc lifecycle)| 2026-05-23 |
| E2E (Playwright)| ⚠ opt-in     | 5 specs (gated)                | n/a        |
| RLS             | ✅ green      | 451/451 (53 tables)            | 2026-05-03 |
| Replay          | ✅ green      | 58/58 assertions               | 2026-05-16 |

Unit + contract breakdown (full `pnpm -r run test` output):
102 (@mm/types) + 32 (@mm/sdk) + 67 (@mm/ui) + 115 (@mm/engines) + 24 (content-svc) + 30 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 22 (analytics-svc) + 19 (orchestration-svc) + 19 (assignments-svc contract) + 1 (assignments-svc e2e) + 15 (notifications-svc contract) + 11 (apps/web) = **516 passed, 1 skipped**

Stage 35 adds +11: +10 (orchestration-svc contract tests — 9 → 19) + +1 (@mm/types — PlanOverrideDTOSchema auto-generates 1 new case in schemas.test.ts `X3 exhaustive schema registry` loop).

Contract count = 24 (content-svc) + 30 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 22 (analytics-svc) + 19 (orchestration-svc) + 19 (assignments-svc) + 15 (notifications-svc) = **188** (was 178 at Stage 34 close).

pgTAP/RLS not re-run for Stages 28–35 — no new RLS policies. plan_override table + RLS exists from migration 0005. Stage 35 adds no migrations.

## Quality gates

| Gate                | Last status                                                     | Last run   |
| ------------------- | --------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (15 packages)                                          | 2026-05-25 |
| pnpm typecheck      | ✅ green (15 packages)                                          | 2026-05-25 |
| pnpm test           | ✅ green (516 passed / 1 skipped — full output captured)        | 2026-05-25 |
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

k6 load test (`k6/session-loop.js`) is ready for execution; nightly CI workflow (`.github/workflows/load-test.yml`) will run when `LOAD_TEST_BASE_URL` + `LOAD_TEST_TOKEN` secrets are configured post-deploy.

Stage 34 SLA note: outbox → notifications 5s wall-clock SLA (DEV-20260524-1) cannot be measured in sandbox (pg_cron worst-case ~120s). Contract tests mock the chain directly. Deferred to Stage 41 deploy gate.

## Open items

- ADRs accepted: **33** (ADR-0001 through ADR-0033)
- ADRs proposed: 0
- Workspaces: **15** (notifications-svc added at Stage 34)
- Issues critical / high / medium / low: **0/0/6/10**
  - Medium (6): ISSUE-0009 (IndexedDB + SW shell-cache v1.1 upgrade — DEV_PLAN §5 P1.6), ISSUE-0010 (adaptive section-boundary banner + DTO field — DEV_PLAN §5 P1.7), ISSUE-0011 (deferred content blocks: Results screen 5 stubs (a–e) + Dashboard mastery snapshot (f) — DEV_PLAN §5 P2.10), ISSUE-0014 (exam_date column + UI ingress — v1.1), ISSUE-0021 (auto-groups route shape query-vs-path-param arch drift — v1.1), ISSUE-0023 (Idempotency-Key enforcement deferred — v1.1)
  - Low (10): ISSUE-0013 (evening ritual test count methodology — fix applied from Stage 29), ISSUE-0015 (cohort_metric_cache category mismatch — v1.1), ISSUE-0016 (async_pipeline_event + analytics_audit_log observability parity — v1.1), ISSUE-0017 (high-fatigue alert deferred — v1.1), ISSUE-0018 (undocumented env vars: 5 service URL vars — INTELLIGENCE_SVC_URL, ANALYTICS_SVC_URL, ORCHESTRATION_SVC_URL, ASSESSMENT_SVC_URL, NOTIFICATIONS_SVC_URL), ISSUE-0019 (tooling guard: amend-over-pushed-commit pattern), ISSUE-0020 (POST /orchestration/generate-plan synchronous in v1; async deferred — v1.1), ISSUE-0022 (audit-log cursor pagination deferred to v1.1), ISSUE-0024 (real-time tracking upgrade cron → outbox-driven deferred to v1.1), ISSUE-0025 (notification spam guard: 1h dedup window production-tuning deferred — v1.1)
  - **Resolved at Stage 28:** ISSUE-0006
  - **Resolved at Stage 26:** ISSUE-0005, ISSUE-0007, ISSUE-0008
  - **Resolved at Stage 25 audit:** ISSUE-0012
- Open questions: 0 (Q-35.1–Q-35.4 all resolved)
- Open bugs: 0
- Deviations logged: 10 total (5 resolved, 5 open)
  - DEV-20260430-1 resolved Stage 15
  - DEV-20260503-2 ongoing v1.1 (content.recalibration no-op)
  - DEV-20260511-1 resolved Stage 22b
  - DEV-20260515-1 self-resolved Stage 25
  - DEV-20260518-1 resolved Stage 28 — spec §5.1.4 student parameter defect; code workaround shipped (traverseUpstreamHelper + traverseDownstreamHelper). [Correction 2026-05-25: prior PROJECT_STATE erroneously carried this as "ongoing" — DEVIATIONS.md "Resolved by: Stage 28" is authoritative.]
  - DEV-20260519-1 ongoing — exam_date column deferred; §12.1 projection branch null until v1.1
  - DEV-20260522-1 ongoing v1.1 — auto-groups query-vs-path-param (Stage 37 fix)
  - DEV-20260522-2 resolved Stage 32 — generate-assignment C-C-D-V gate placement error
  - DEV-20260523-1 ongoing v1.1 — Idempotency-Key enforcement deferred (assignments-svc)
  - DEV-20260524-1 ongoing — outbox→notifications 5s SLA not testable in sandbox (pg_cron worst-case ~120s); deferred to Stage 41 deploy gate

## Notes for next session

Stage 36 — Parent Dashboard (Days 50–51, 2-day budget). **First Phase 2 UI stage** — `apps/web` parent dashboard screens.

**Pre-reads required:**
- intelligence-svc `/learner-profile` handler shape (Stage 32) — verbatim DTO fields for dashboard display
- orchestration-svc `/plan/current` handler shape (Stage 31) — `LearningPlanDTO` fields
- notifications-svc `/me` handler shape (Stage 34) — `NotificationsListDTO` fields
- spec section for parent dashboard (§ TBD — verify at morning ritual)
- DEV_PLAN Stage 36 deliverables verbatim

**UI stage discipline differences from service stages:**
- Testing gates: Storybook? visual regression? component contracts? Establish or surface as Q-36.* round-trip at morning ritual if not defined by prior UI stages (Stages 13–27).
- Verification: `pnpm -r run test` still required; UI-specific gates (Playwright specs?) to be confirmed.
- No new Edge Functions expected; Stage 36 is read-only consumer of Stages 31/32/34 APIs.

**T-discipline state for Stage 36:**
- T1: pre-read cites function signatures + prop shapes + DTO fields verbatim (extends to component prop types for UI stages).
- T2-tightened: mid-impl self-resolve Qs filed in same work session. (Stage 35 evidence: first clean stage.)
- T3 Option 3: round-trip required for DTO/scope/schema/auth-model Qs; self-resolve permitted for tight details.
- T4: never `--amend` over pushed commits.
- Stage 33 R5 lesson: cross-service ownership verification before assuming write access.
- Stage 31 retro b: stale-comment guard on copy-paste from prior service/component scaffolds.

**Open carry-forwards:**
- ISSUE-0018: 5 undocumented env vars — address in `docs/dev/deployment.md` at v1 close or Stage 36.
- Pre-deploy gate: migrations 0012–0016 + RLS must be run locally before any deploy (sandbox lacks Docker).
- Phase 1 Exit Report at `docs/dev/phase-1-exit-report.md`. Git tag `v1-phase-1` created locally; **push pending approval**.
- Q-28.8 deferral: `SkillGraphCache.adjacency` lacks `strength` + `dependency_class` fields (Option B applied). `// Q-28.8:` grep markers at two sites in `intelligence-svc/handlers.ts`. Address in v1.1.
- v1.1 self-supersession note: if plan_override row count grows materially, consider migrating deterministic key to a generated column + partial unique index (current JS-side SELECT+filter pattern acceptable for v1 volume).
