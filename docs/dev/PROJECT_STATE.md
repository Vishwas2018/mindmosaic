# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: v1.1 Polish — Clusters A–G (2026-05-24)
- Next stage: v1.1 preview/E2E gate — axe-core live run (ISSUE-0038), Playwright 19 tests, deploy to preview env
- v1 build window: **CLOSED** — 49/49 stages (Days 1–65 of 75; 10 days banked unused)
- Active branch: `v1.1/exam-content` — 33 commits ahead of origin/main (9376d98 v1.0.0):
  a7a43d0 v1.1-S1 prep · e76dbfc v1.1-S1 impl · c4c868e v1.1-S1 chore · 3c1afe0 v1.1-S2 prep · 0bdd43b v1.1-S2 impl · f72a7a8 v1.1-S2 chore · ac36e80 ISSUE-0037 remediation · 560e2d2 v1.1-S3 prep · 96b19b5 v1.1-S3 impl · ca9c670 v1.1-S3 chore · 2faeb65 v1.1-S4 prep · b8b8290 v1.1-S4 impl · 5c9692f v1.1-S4 chore · 7b63e2a v1.1-S5 prep · 18aac21 v1.1-S5 impl · efb27e7 v1.1-S5 chore · dc851cf audit+ADR-0040 · b3eb668 ISSUE-0042 fix · 27ded4d ISSUE-0042 docs close · 3340c93 v1.1-S6 prep · 28e85e2 v1.1-S6 impl · 8c86690 v1.1-S6 chore · 4453ddc S7-prep step 1a · bd3a310 S7-prep step 1b feat · 5dd8f4e S7-prep step 1b chore · a5140e0 S7-prep step 1c feat · (S7-prep step 1c chore) · 5144b9a Cluster A · 9705579 Cluster B · 3a2fca6 Cluster C · 4353d78 Cluster D · 5e158f8 Cluster E · e525d2a Cluster F · 57c3b95 Cluster G · (this chore)
- Buffer days consumed total: ~16.5 of 26 allocated (DEV_PLAN §3.1) — v1.1 unbudgeted
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
- v1.1-S1 through v1.1-S6 actual: ~1 day each. (v1.1 stages unbudgeted in DEV_PLAN.)
- Stages closed: **v1: 49/49 closed; v1.1: 6/7 closed (S1–S6 complete; S7 in progress — S7-prep steps 1a + 1b + 1c complete; Q-1.1-7.1..9 resolved; S7.1 workflow defined; Gate I next); Polish: Clusters A–G complete (ADR-0043 accepted)**

## Test suite

| Suite            | Status       | Count                                                                                                                              | Last run   |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Unit             | ✅ green      | 945 passed / 2 skipped / 0 failed                                                                                                 | 2026-05-24 |
| Integration      | n/a          | n/a                                                                                                                                | n/a        |
| pgTAP            | ✅ green      | 451/451 (migrations 0001–0020); 0021 + 0022 SQL files on disk (deferred-validation)                                               | 2026-06-07 |
| Contract         | ✅ green      | included in 945 Vitest total                                                                                                       | 2026-05-24 |
| E2E (Vitest)     | ✅ green      | 1/1 (assignments-svc lifecycle)                                                                                                    | 2026-05-23 |
| E2E (Playwright) | ⚠ opt-in     | 13 specs / 19 tests (gated; all test.skip-guarded; ISSUE-0035, ISSUE-0038)                                                        | n/a        |
| RLS              | ✅ green      | 451/451 (53 tables; pgTAP 0001–0020 covers all); 0021 + 0022 deferred-validation                                                  | 2026-06-07 |
| Replay           | ✅ green      | 58/58 assertions + 100 billing-svc replay assertions (2-pass 50-event)                                                            | 2026-06-01 |
| axe-core         | ✅ green      | 31 Vitest files / 75 assertions (Stage 48 sweep); S4+S5 added 2 Playwright axe-core specs / 4 guarded tests pending ISSUE-0038   | 2026-06-07 |

Unit + contract breakdown (full `pnpm -r test` 2026-05-24 post-Cluster-G + BUG-0003 fix):
162 (@mm/types) + 81 (@mm/sdk) + 81 (@mm/ui) + 118 (@mm/engines) + 9 (@mm/core) + 78 (content-svc) + 50 (assessment-svc) + 53 (intelligence-svc) + 6 (jobs-worker, 1 skipped) + 31 (analytics-svc) + 19 (orchestration-svc) + 27 (assignments-svc) + 17 (notifications-svc) + 7 (users-svc) + 147 (apps/web, 1 skipped) + 59 (billing-svc) = **945 passed, 2 skipped, 0 failed** (947 total).

Delta from pre-polish corrected baseline (854 / 1 skipped — ISSUE-0048 corrected): **+91 passed** (+3 types, +23 sdk, +6 ui, +2 assessment-svc, +2 assignments-svc, +55 web) across Clusters A–G. Floor target was +27; delivered +91.

## Quality gates

| Gate                | Last status                                                                        | Last run   |
| ------------------- | ---------------------------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7/7 packages with lint scripts; 0 warnings/errors)                      | 2026-05-24 |
| pnpm typecheck      | ✅ green (17/17 packages, 0 turbo-cached — --force run)                           | 2026-05-22 |
| pnpm test           | ✅ green (945 passed / 2 skipped / 0 failed)                                      | 2026-05-24 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                                        | 2026-05-16 |
| pnpm build          | ❌ BLOCKED — local TLS cert issue (Google Fonts); CI/Vercel unaffected (ISSUE-0067) | 2026-05-22 |
| RLS coverage        | ✅ 53/53 tables enabled + tested (pgTAP 0001–0020 451/451); 0021 + 0022 deferred  | 2026-06-07 |
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

- ADRs accepted: **43** (ADR-0001 through ADR-0043; ADR-0043 = v1.1 polish stage binding, accepted 2026-05-24)
- ADRs proposed: **0**
- Workspaces: **17** — unchanged
- Issues critical / high / medium / low: **0 / 0 / 15 / 20**
  - Medium (15): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0030, ISSUE-0049, ISSUE-0050, ISSUE-0051, ISSUE-0052, ISSUE-0053, ISSUE-0060 (T3 flag — partition RLS), ISSUE-0067 (local prod build TLS cert)
  - Low (20): ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028, ISSUE-0031, ISSUE-0032, ISSUE-0033, ISSUE-0034, ISSUE-0035, ISSUE-0038, ISSUE-0044, ISSUE-0048 (resolved this chore), ISSUE-0066, ISSUE-0069 (preview carry), ISSUE-0070 (preview carry)
  - Resolved by A–G: ISSUE-0039, 0040, 0041, 0043, 0045, 0046, 0047, 0061, 0062, 0063, 0064, 0065, 0068
- Migrations: **0001–0024** (migrations 0001–0020 pgTAP-verified 451/451; 0021 SQL on disk deferred-validation; 0022 adds composer_params + simulation_params jsonb nullable columns — deferred-validation per 0021 pattern; 0023 adds authoring_method NOT NULL to item_version — deferred-validation per 0021 pattern; **0024 renames exam_family enum values naplan→au_numeracy_y5_format + icas→au_math_paper_c_format — deferred-validation per 0021 pattern**)
- Open questions: **1** (Q-1.1-AUDIT-1 — partition RLS access pattern; blocks ISSUE-0060; operator decision required)
- Content items: **8 draft** (`au_numeracy_y5_format`, batch-01; review log at `docs/content/reviews/s7.1-batch-01.md`; `review→active` blocked by DEV-20260520-1 legal gate)
- Open bugs: **2** (BUG-0001 route prefix — fixed ab75f14; BUG-0002 migration 0018 duplicate — fixed f6b7f90)
- Deviations logged: **24 total (9 resolved, 15 open)** — unchanged

## Notes for next session

**Next: v1.1 preview/E2E gate.** Polish stage (Clusters A–G) complete. ADR-0043 accepted. 13 issues closed across A–G; +91 tests (854→945, floor target +27). Carries to preview gate: ISSUE-0069 (F5/F7 visual fidelity), ISSUE-0070 (AT announcement), ISSUE-0038 (axe-core live run).

**ISSUE-0060 T3 flag open.** Operator decision required on partition RLS false-positive before closing.

**Local prod build (ISSUE-0067) still blocked.** TLS cert issue unchanged. Workaround: `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm turbo build` (local only).

**S7.1 Gate I still pending.** Q-1.1-S7-RC.1 Option A resolved. Gate I next: update `docs/content/manifests/s7.1-batch-01-preview.json` with Option A shape + skill remap, then Gate II dry-run `POST /content/import?dry_run=true`.

**Legal re-review gate (DEV-20260520-1):** `review→active` blocked until sign-off.

**Launch-window operational verification (owner: deploy operator):**
- Run k6/session-loop.js (500 VU / 1h) + k6/billing-webhook.js against deployed env
- Run Playwright 13 specs / 19 tests against deployed Supabase (incl. ISSUE-0038 axe-core gate)
- Run scripts/validate-content.ts (requires seeded content, 50 items, 10 misconceptions)
- 24h pipeline.dead_letter.count = 0 soak
- Supabase backup + restore drill (staging project)
- Stripe test-mode invoicing + tax verification
- Log all 8 SLA measurements in docs/dev/perf/measurements.md
- Full checklist: docs/dev/stage-49-exit-report.md §9
