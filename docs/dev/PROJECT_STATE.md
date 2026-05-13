# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 48 — Hardening Pass (2026-06-07)
- Next stage: Stage 49 — Launch Gate Review + v1.0.0 Tag (Day 73 per DEV_PLAN; actual Day 65 — 10.5 days ahead of schedule)
- Days remaining (target 75): 10 (Day 65 of 75 complete)
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 complete: Stages 28–41 (14 stages). **+5.5 days net banked entering Phase 3/4**.
- Stage 42 actual: 1 day (budget: 2 days, 1 day under). **Phase 4 buffer entering Stage 43: +6.5 days banked**.
- Stage 43 actual: 1 day (budget: 2 days, 1 day under). **Phase 4 buffer entering Stage 44: +7.5 days banked**.
- Stage 44 actual: 1 day (budget: 1 day, on budget). **Phase 4 buffer entering Stage 45: +7.5 days banked**.
- Stage 45 actual: 2 days (budget: 2 days, on budget). **Phase 4 buffer: +7.5 days banked**.
- Stage 46 actual: 1 day (budget: 1 day, on budget). **Phase 4 buffer: +7.5 days banked** (unchanged).
- Stage 47 actual: 1 day (budget: 1 day audit, on budget). **Phase 4 buffer: +7.5 days banked** (unchanged).
- Stage 48 actual: 1 day (budget: 4 days per DEV_PLAN, 3 days under). **Effective buffer entering Stage 49: +10.5 days banked**.
- Stages closed: 48 of 75.

## Test suite

| Suite           | Status       | Count                                                              | Last run   |
| --------------- | ------------ | ------------------------------------------------------------------ | ---------- |
| Unit            | ✅ green      | 696 passed / 1 skipped (+ 4 Playwright test.skip-guarded)         | 2026-06-05 |
| Integration     | n/a          | n/a                                                                | n/a        |
| pgTAP           | ✅ green      | 451/451 (migrations 0001–0020)                                     | 2026-06-07 |
| Contract        | ✅ green      | included in 696 Vitest total                                       | 2026-06-05 |
| E2E (Vitest)    | ✅ green      | 1/1 (assignments-svc lifecycle)                                    | 2026-05-23 |
| E2E (Playwright)| ⚠ opt-in     | 11 specs / 15 tests (gated; all test.skip-guarded; ground truth confirmed Stage 48 — ISSUE-0035) | n/a |
| RLS             | ✅ green      | 451/451 (53 tables; pgTAP 0001–0020 covers all)                    | 2026-06-07 |
| Replay          | ✅ green      | 58/58 assertions + 100 billing-svc replay assertions (2-pass 50-event) | 2026-06-01 |
| axe-core        | ✅ green      | 31 test files / 75 assertions — no regressions (Stage 48 sweep)   | 2026-06-07 |

Unit + contract breakdown (full `pnpm -r run test` output 2026-06-05 Stage 46 close — unchanged at Stages 47–48):
118 (@mm/types) + 56 (@mm/sdk) + 75 (@mm/ui) + 115 (@mm/engines) + 9 (@mm/core) + 24 (content-svc) + 32 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 31 (analytics-svc) + 19 (orchestration-svc) + 20 (assignments-svc incl. e2e) + 17 (notifications-svc: 15 prior + 2 stage46) + 7 (users-svc) + 55 (apps/web) + 59 (billing-svc: 14 webhook + 21 stage43 + 18 stage44 + 6 stage46) = **696 passed, 1 skipped** (697 total).

## Quality gates

| Gate                | Last status                                                              | Last run   |
| ------------------- | ------------------------------------------------------------------------ | ---------- |
| pnpm lint           | ✅ green (17 packages)                                                   | 2026-06-05 |
| pnpm typecheck      | ✅ green (17 packages, 0 turbo-cached — --force run per §Close-ritual)  | 2026-06-05 |
| pnpm test           | ✅ green (696 passed / 1 skipped — 697 total Vitest)                    | 2026-06-05 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                              | 2026-05-16 |
| pnpm build          | ✅ green (exit 0, 21 routes)                                             | 2026-05-11 |
| RLS coverage        | ✅ 53/53 tables enabled + tested (pgTAP 0001–0020 451/451)              | 2026-06-07 |
| pnpm audit          | ⚠ 18 findings (0 critical, 6 high, 10 moderate, 2 low) — all v1.1 track | 2026-06-07 |
| pnpm test:migration | ✅ 451/451 — covers migrations 0001–0020 (ISSUE-0036 schema drift fixed) | 2026-06-07 |

## Performance vs BUILD_CONTRACT §10 budgets

All 8 SLA budgets require k6 execution against deployed environment. Deferred to Stage 49.
Reference scripts: `k6/session-loop.js` (session loop) + `k6/billing-webhook.js` (billing, NEW Stage 48).
Full table: `docs/dev/perf/measurements.md`.

| Endpoint                          | Budget p95 | Measured p95                                                 |
| --------------------------------- | ---------- | ------------------------------------------------------------ |
| Item delivery                     | 200 ms     | not measured — Stage 49 k6 run (requires deployed env) |
| POST /sessions/create             | 1000 ms    | not measured — Stage 49 k6 run (requires deployed env) |
| POST /sessions/{id}/respond       | 300 ms     | not measured — Stage 49 k6 run (requires deployed env) |
| POST /sessions/{id}/submit + sync | 5000 ms    | not measured — Stage 49 k6 run (requires deployed env) |
| Pipeline async                    | 30000 ms   | not measured — Stage 49 k6 run (requires deployed env) |
| Dashboard load                    | 2000 ms    | not measured — Stage 49 k6 run (requires deployed env) |
| Billing webhook p95               | 300 ms     | not measured — Stage 49 k6 run (requires deployed env) |
| Flag propagation p95              | 30 s       | not measured — Stage 49 k6 run (requires deployed env) |

## Open items

- ADRs accepted: **34** (ADR-0001 through ADR-0034) — unchanged Stage 48 (no new ADR required)
- ADRs proposed: 0
- Workspaces: **17** — unchanged Stage 48
- Issues critical / high / medium / low: **0/0/8/14** — ISSUE-0035 (low) + ISSUE-0036 (medium, resolved) added Stage 48
  - Medium (8): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0030
  - Low (14): ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028, ISSUE-0031, ISSUE-0032, ISSUE-0033, ISSUE-0034, ISSUE-0035
  - Resolved at Stage 48: ISSUE-0036 (pgTAP schema drift — medium, fixed same stage)
  - Prior resolved: ISSUE-0005, 0006, 0007, 0008, 0012, 0026, 0013, 0018, 0029
- Open questions: **0** — Q-48.1..6 all resolved at Stage 48
- Open bugs: 0
- Deviations logged: 19 total (8 resolved, 11 open) — DEV-20260606-2 added Stage 48 prep
  - DEV-20260430-1 resolved Stage 15
  - DEV-20260511-1 resolved Stage 22b
  - DEV-20260515-1 self-resolved Stage 25
  - DEV-20260518-1 resolved Stage 28
  - DEV-20260522-2 resolved Stage 32
  - DEV-20260511-2 self-resolved Stage 40
  - DEV-20260527-1 resolved Stage 41 (documentation side — deployment.md)
  - DEV-20260524-1 resolved Stage 41 (close-ritual cache-bust canonised)
  - DEV-20260503-2 ongoing v1.1
  - DEV-20260519-1 ongoing — exam_date column deferred
  - DEV-20260522-1 ongoing v1.1 — auto-groups route shape
  - DEV-20260523-1 ongoing v1.1 — Idempotency-Key enforcement
  - DEV-20260524-1 ongoing — PathwayReadiness from learner profile, not analytics-svc (DEV-20260526-1)
  - DEV-20260529-1 ongoing — 5-step wizard vs 4-step SCREEN_SPECS §22 (Stage 39)
  - DEV-20260530-1 ongoing — tab labels Assigned/In Progress/Completed vs spec
  - DEV-20260530-2 ongoing — Review button vs dropdown (Stage 40)
  - DEV-20260604-1 ongoing — spec §25.6 cancel path drift; v1.1 spec reconciliation (no Stage 49 action)
  - DEV-20260606-1 accepted — tag name v1-phase-4-slice → v1-phase-4-partial (immutable)
  - DEV-20260606-2 ongoing — mid-session pull discipline note (Codespace sync drift)
- Tag state: `v1-phase-1` pushed to origin (Stage 41). `v1-phase-2-partial` pushed (Stage 41). `v1-phase-4-partial` pushed (Stage 47). `v1.0.0` pending Stage 49 approval.

## Notes for next session

Stage 49 — Launch Gate Review + v1.0.0 Tag (Day 73 per DEV_PLAN; actual Day 65 — 10.5 days ahead of schedule).

**Stage 49 launch gate checklist (DEV_PLAN Stage 49 verbatim):**
1. All Phase 4 slice exit criteria met ✅ (Stage 47 Phase 4 Exit Report)
2. Load test at 500 concurrent green for 1 hour ⏸ (k6/session-loop.js; requires deployed env)
3. pipeline.dead_letter.count = 0 for 24h ⏸ (requires deployed env; 24h soak)
4. Backup + restore drill completed ⏸ (requires deployed Supabase project)
5. Stripe taxes + invoicing verified in test mode ⏸ (requires Stripe test env)
6. Content seeded: 50 items, 10 misconceptions ⏸ (scripts/validate-content.ts; requires seeded env)
7. pnpm audit: 18 findings logged, all v1.1 track ✅ (docs/dev/security/findings.md)
8. .env.example complete ✅
9. pgTAP 451/451 vs 0001–0020 ✅
10. axe-core 31/31 test files ✅

Key gate deliverables: `docs/dev/PROJECT_STATE.md` final snapshot, `docs/dev/DAILY_LOG.md` final entry, launch gate checklist pass, `git tag -a v1.0.0 + push`.

**Sandbox work that CAN be done at Stage 49:**
- PROJECT_STATE final snapshot
- DAILY_LOG final entry
- Conditional Go verdict (if infrastructure gates remain env-gated)
- v1.0.0 tag commit + push (upon operator "create the tag")

**Operational items (deployed env):**
- Run k6/session-loop.js (500 VU / 1h) + k6/billing-webhook.js
- Run Playwright 11 specs / 15 tests
- Validate content (validate-content.ts)
- 24h dead-letter soak
- Backup drill
- Stripe test-mode verification
