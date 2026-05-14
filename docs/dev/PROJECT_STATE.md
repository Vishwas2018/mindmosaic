# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: v1.1-S1 — Question Bank Foundation (2026-05-14)
- Next stage: v1.1-S2 — Practice Exam Composer
- v1 build window: **CLOSED** — 49/49 stages (Days 1–65 of 75; 10 days banked unused)
- Active branch: `v1.1/exam-content` — 3 commits ahead of origin/main (9376d98 v1.0.0): a7a43d0 prep · e76dbfc impl · this chore
- Buffer days consumed total: ~15.5 of 26 allocated (DEV_PLAN §3.1) — v1.1 unbudgeted
- Phase 0 complete: Stages 1–14. Phase 0 buffer at close: 0 of 3 consumed.
- Phase 1 complete: Stages 15–27 (13 stages). Phase 1 buffer at close: **+2 days banked**.
- Phase 2 complete: Stages 28–41 (14 stages). **+5.5 days net banked entering Phase 3/4**.
- Stage 42 actual: 1 day (budget: 2 days). **Phase 4 buffer entering Stage 43: +6.5 days banked**.
- Stage 43 actual: 1 day (budget: 2 days). **Phase 4 buffer entering Stage 44: +7.5 days banked**.
- Stage 44 actual: 1 day (budget: 1 day). **Phase 4 buffer entering Stage 45: +7.5 days banked**.
- Stage 45 actual: 2 days (budget: 2 days). **Phase 4 buffer: +7.5 days banked**.
- Stage 46 actual: 1 day (budget: 1 day). **Phase 4 buffer: +7.5 days banked** (unchanged).
- Stage 47 actual: 1 day (budget: 1 day). **Phase 4 buffer: +7.5 days banked** (unchanged).
- Stage 48 actual: 1 day (budget: 4 days per DEV_PLAN). **Effective buffer entering Stage 49: +10.5 days banked**.
- Stage 49 actual: 1 day (budget: 2 days per DEV_PLAN). **Buffer at v1 close: +10.5 days banked (net unchanged)**.
- v1.1-S1 actual: ~1 day (v1.1 stages unbudgeted in DEV_PLAN).
- Stages closed: **v1: 49/49 closed; v1.1: 1/7 closed (S1 complete)**

## Test suite

| Suite            | Status       | Count                                                                              | Last run   |
| ---------------- | ------------ | ---------------------------------------------------------------------------------- | ---------- |
| Unit             | ✅ green      | 729 passed / 1 skipped (+ 4 Playwright test.skip-guarded)                         | 2026-05-14 |
| Integration      | n/a          | n/a                                                                                | n/a        |
| pgTAP            | ✅ green      | 451/451 (migrations 0001–0020); 021 SQL file on disk (deferred-validation)         | 2026-06-07 |
| Contract         | ✅ green      | included in 729 Vitest total                                                       | 2026-05-14 |
| E2E (Vitest)     | ✅ green      | 1/1 (assignments-svc lifecycle)                                                    | 2026-05-23 |
| E2E (Playwright) | ⚠ opt-in     | 11 specs / 15 tests (gated; all test.skip-guarded; ISSUE-0035)                    | n/a        |
| RLS              | ✅ green      | 451/451 (53 tables; pgTAP 0001–0020 covers all); 0021 policies deferred-validation | 2026-06-07 |
| Replay           | ✅ green      | 58/58 assertions + 100 billing-svc replay assertions (2-pass 50-event)            | 2026-06-01 |
| axe-core         | ✅ green      | 31 test files / 75 assertions — no regressions (Stage 48 sweep)                  | 2026-06-07 |

Unit + contract breakdown (full `pnpm -r run test` output 2026-05-14 v1.1-S1 close):
127 (@mm/types) + 56 (@mm/sdk) + 75 (@mm/ui) + 115 (@mm/engines) + 9 (@mm/core) + 48 (content-svc) + 32 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker) + 31 (analytics-svc) + 19 (orchestration-svc) + 20 (assignments-svc incl. e2e) + 17 (notifications-svc) + 7 (users-svc) + 55 (apps/web) + 59 (billing-svc) = **729 passed, 1 skipped** (730 total).

Delta from v1.0.0 baseline (696/697): +24 content-svc contract tests + 9 @mm/types X3 schema-registry auto-tests = **+33**.

## Quality gates

| Gate                | Last status                                                                        | Last run   |
| ------------------- | ---------------------------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (17 packages)                                                             | 2026-05-14 |
| pnpm typecheck      | ✅ green (17 packages, 0 turbo-cached — --force run per §Close-ritual)            | 2026-05-14 |
| pnpm test           | ✅ green (729 passed / 1 skipped — 730 total Vitest)                              | 2026-05-14 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                                        | 2026-05-16 |
| pnpm build          | ✅ green (exit 0, 21 routes)                                                       | 2026-05-11 |
| RLS coverage        | ✅ 53/53 tables enabled + tested (pgTAP 0001–0020 451/451); 0021 deferred         | 2026-06-07 |
| pnpm audit          | ⚠ 18 findings (0 critical, 6 high, 10 moderate, 2 low) — all v1.1 track          | 2026-06-07 |
| pnpm test:migration | ✅ 451/451 — covers migrations 0001–0020                                          | 2026-06-07 |

## Performance vs BUILD_CONTRACT §10 budgets

All 8 SLA budgets require k6 execution against deployed environment. Deferred to launch-window operational verification.
Reference scripts: `k6/session-loop.js` (session loop) + `k6/billing-webhook.js` (billing, Stage 48).
Full table: `docs/dev/perf/measurements.md`.

| Endpoint                          | Budget p95 | Measured p95                                                 |
| --------------------------------- | ---------- | ------------------------------------------------------------ |
| Item delivery                     | 200 ms     | not measured — launch-window k6 run (requires deployed env) |
| POST /sessions/create             | 1000 ms    | not measured — launch-window k6 run (requires deployed env) |
| POST /sessions/{id}/respond       | 300 ms     | not measured — launch-window k6 run (requires deployed env) |
| POST /sessions/{id}/submit + sync | 5000 ms    | not measured — launch-window k6 run (requires deployed env) |
| Pipeline async                    | 30000 ms   | not measured — launch-window k6 run (requires deployed env) |
| Dashboard load                    | 2000 ms    | not measured — launch-window k6 run (requires deployed env) |
| Billing webhook p95               | 300 ms     | not measured — launch-window k6 run (requires deployed env) |
| Flag propagation p95              | 30 s       | not measured — launch-window k6 run (requires deployed env) |

## Open items

- ADRs accepted: **35** (ADR-0001 through ADR-0035; ADR-0035 accepted at v1.1-S1 close)
- ADRs proposed: 0
- Workspaces: **17** — unchanged
- Issues critical / high / medium / low: **0/0/8/14** — unchanged from v1.0.0 close
  - Medium (8): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0030
  - Low (14): ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028, ISSUE-0031, ISSUE-0032, ISSUE-0033, ISSUE-0034, ISSUE-0035
  - Prior resolved: ISSUE-0005, 0006, 0007, 0008, 0012, 0013, 0018, 0026, 0029, 0036
- Open questions: **0** — Q-1.1-1.0..9 all resolved
- Open bugs: 0
- Deviations logged: **22 total (9 resolved, 13 open)** — +1 DEV-20260514-1 (v1.1-S1 re-prioritization) vs v1.0.0 close
  - DEV-20260607-1 accepted — DEV_PLAN "47 stages" count vs delivered 49
  - DEV-20260607-2 accepted — DEV_PLAN Stage 49 "spec §4" citation error
  - DEV-20260514-1 open — v1.1 exam-content phase inserted ahead of P1.1–P1.7 (ADR-0035)
  - Open carries (v1.1): DEV-20260503-2, DEV-20260519-1, DEV-20260522-1, DEV-20260523-1, DEV-20260524-1, DEV-20260526-1, DEV-20260529-1, DEV-20260530-1, DEV-20260530-2, DEV-20260604-1
- Tag state: `v1-phase-1` pushed (Stage 27). `v1-phase-2-partial` pushed (Stage 41). `v1-phase-4-partial` pushed (Stage 47). **`v1.0.0` on 9376d98 (Stage 49 close commit — push status: unknown — TODO confirm).**
- Branch: `v1.1/exam-content` HEAD = v1.1-S1 chore close commit (this); 3 commits ahead of origin/main.

## Notes for next session

**v1.1-S2 — Practice Exam Composer** is next. Before any code:
- Read `docs/dev/v1.1-phase-plan.md` S2 section in full.
- Read arch session-engine refs (session type enum; existing LinearEngine + AdaptiveEngine session flows).
- Check whether the existing session `mode` or `type` column covers "practice exam" or requires a new enum value — T1 pre-read required before any migration or handler work.
- S2 extends the existing session engine; it is not a rewrite. The question bank CRUD from S1 (item/item_version endpoints) is the content supply side.

**Launch-window operational verification (owner: deploy operator):**
- Run k6/session-loop.js (500 VU / 1h) + k6/billing-webhook.js against deployed env
- Run Playwright 11 specs / 15 tests against deployed Supabase
- Run scripts/validate-content.ts (requires seeded content, 50 items, 10 misconceptions)
- 24h pipeline.dead_letter.count = 0 soak
- Supabase backup + restore drill (staging project)
- Stripe test-mode invoicing + tax verification
- Log all 8 SLA measurements in docs/dev/perf/measurements.md
- Full checklist: docs/dev/stage-49-exit-report.md §9
