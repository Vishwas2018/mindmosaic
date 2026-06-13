# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed: v1.1 family beta merge gate — **MET 2026-06-12** (CI run 27415500129, SHA 7a2a7c0; 16/18 in-scope E2E green, 2 skipped with ISSUE refs)
- Next stage: Manual merge v1.1/exam-content → main; tag `v1.1-beta-rc1`; then non-code blockers (content activation, Stripe live keys) before going live
- Active branch: `v1.1/exam-content` — **119 commits ahead of origin/main** (9376d98 v1.0.0)
- v1 build window: **CLOSED** — 49/49 stages (Days 1–65 of 75; 10 days banked unused)
- v1.1 stages closed: v1.1-S1 through v1.1-S6 + Polish Clusters A–G + E2E gate (Option-A) + ISSUE-0090/0091 debugging arc
- Buffer days consumed total: ~16.5 of 26 allocated (DEV_PLAN §3.1) — v1.1 unbudgeted

## Test suite

| Suite            | Status       | Count                                                                                                              | Last run   |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| Unit             | ✅ green      | ~952 passed (946 baseline 2026-06-05 + ~6 new from ISSUE-0090/0091 fixes — TODO recount)                         | 2026-06-12 |
| Integration      | n/a          | n/a                                                                                                                | n/a        |
| pgTAP            | ✅ green      | 468/468 (migrations 0001–0027; unchanged)                                                                         | 2026-06-04 |
| Contract         | ✅ green      | included in unit total                                                                                             | 2026-06-12 |
| E2E (Vitest)     | ✅ green      | 1/1 (assignments-svc lifecycle)                                                                                    | 2026-05-23 |
| E2E (Playwright) | ✅ green      | in-scope family-beta: 16 passed / 2 skipped / 0 failed (CI run 27415500129, SHA 7a2a7c0)                         | 2026-06-12 |
| RLS              | ✅ green      | 468/468 (53 tables + _default partitions; pgTAP 0001–0027 covers all incl. 0025 deny-all)                        | 2026-06-04 |
| Replay           | ✅ green      | 58/58 assertions + 100 billing-svc replay assertions (2-pass 50-event)                                            | 2026-06-01 |
| axe-core         | ✅ green      | 31 Vitest files / 75 assertions; 2 Playwright axe-core specs / 4 guarded tests pending ISSUE-0038                | 2026-06-07 |

web Vitest (measured 2026-06-12 local run): **148 passed / 1 skipped**.

Unit breakdown (2026-06-05 baseline; SDK/assessment-svc counts updated per R-BETA-MERGE-PREP prompt):
~84 (@mm/sdk) + ~52 (assessment-svc) + 148 (@mm/web) + remaining packages ≈ 952 total — TODO full recount with `pnpm -r test`.

## Quality gates

| Gate                | Last status                                                                        | Last run   |
| ------------------- | ---------------------------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (CI 27415500129)                                                          | 2026-06-12 |
| pnpm typecheck      | ✅ green (CI 27415500129; 17/17 packages)                                          | 2026-06-12 |
| pnpm test           | ✅ green (CI 27415500129 unit job passed; web vitest 148/149 local)                | 2026-06-12 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                                        | 2026-05-16 |
| pnpm build          | ❌ BLOCKED — local TLS cert issue (Google Fonts); CI/Vercel unaffected (ISSUE-0067) | 2026-05-22 |
| RLS coverage        | ✅ 53/53 tables + _default partitions enabled + tested (pgTAP 0001–0027 468/468)  | 2026-06-04 |
| pnpm audit          | ⚠ 18 findings (0 critical, 6 high, 10 moderate, 2 low) — all v1.1 track          | 2026-06-07 |
| pnpm test:migration | ✅ 468/468 — covers migrations 0001–0027                                          | 2026-06-04 |
| E2E (CI Playwright) | ✅ green — 16/18 in-scope specs passed (CI run 27415500129, SHA 7a2a7c0)          | 2026-06-12 |

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

- ADRs accepted: **45** (ADR-0001 through ADR-0045; unchanged)
- ADRs proposed: **0**
- Workspaces: **17** — unchanged
- Issues critical / high / medium / low: **1 / 0 / 13 / 27**
  - Critical (1): ISSUE-0075 (BOOT_ERROR — local-only; Norton SSL; CI E2E unaffected)
  - Medium (13): ISSUE-0009, 0010, 0011, 0014, 0021, 0023, 0027, 0030, 0049, 0050, 0051, 0052, 0053 (ISSUE-0071 downgraded — now post-beta; ISSUE-0079 resolved via CI E2E; ISSUE-0082 still open medium — axe footer contrast)
  - Low (27): ISSUE-0015, 0016, 0017, 0019, 0020, 0022, 0024, 0025, 0028, 0031, 0032, 0033, 0034, 0035, 0038, 0044, 0066, 0067, 0069, 0070, 0072, 0076, 0078, 0082, 0092, 0094, 0095, 0096
  - Resolved 2026-06-12: ISSUE-0089, 0090, 0091, 0093
  - Resolved 2026-06-03/04: ISSUE-0074
  - Resolved by A–G: ISSUE-0039, 0040, 0041, 0043, 0045, 0046, 0047, 0061, 0062, 0063, 0064, 0065, 0068
- Migrations: **0001–0027** (unchanged)
- Open questions: **1** (Q-1.1-AUDIT-1 — partition RLS access pattern; operator decision required)
- Content items: **8 draft** (`au_numeracy_y5_format`, batch-01; `review→active` blocked by DEV-20260520-1 legal gate)
- Open bugs: **2** (BUG-0001, BUG-0002 — both fixed; status tracking only)
- Deviations logged: **24 total (9 resolved, 15 open)** — unchanged

## Notes for next session

**Family beta merge gate MET — 2026-06-12.** CI run 27415500129 (SHA 7a2a7c0): all 6 jobs green; 16/18 in-scope Playwright specs passed; 2 skipped with ISSUE refs (ISSUE-0085 assignment publish, ISSUE-0086 student-assignments empty tab).

**Next action (manual):** Open GitHub PR `v1.1/exam-content → main` titled "v1.1 family beta merge". PR draft: `docs/dev/pr-drafts/v1.1-family-beta-merge.md`. After merge, tag the commit `v1.1-beta-rc1`.

**Deferred to v1.1.1 (explicitly punted, not blocking family beta):**
- Cluster B/C/D consumer wiring (ISSUE-0090 practice MCQ feedback panel, ISSUE-0091 error surface improvements)
- ISSUE-0092: E2E_TEST_PATHWAY_ID half-wired in 3 specs
- ISSUE-0094: typed `SessionExhaustedError` refactor (tech debt)
- ISSUE-0095: manual End-session early-exit E2E coverage
- ISSUE-0096: supabase/setup-cli@v1 Node.js 20 deprecation bump (hard deadline: 2026-09-16 runner removal)
- Mocked-supabase / contract sweep (datetime-offset class; ISSUE-0078)
- Q-1.1-AUDIT-1: partition RLS operator decision
- Legal re-review (DEV-20260520-1)

**Non-code blockers before going live (post-merge, pre-family-beta public access):**
1. Content activation — 8 draft items gated behind DEV-20260520-1 legal sign-off; insert `pathway_naplan_y5` feature_flag row (ISSUE-0089 launch-runbook item).
2. Stripe live keys — billing surface (Stages 42–47) not wired for family-beta; configure before any paid tier is offered.

**ISSUE-0075 (critical) — local-only DX blocker.** Norton SSL inspection blocks local Edge Function cold boot. CI (no Norton) is the merge gate. Local unblock: Norton Docker Desktop exclusion (Norton GUI → Firewall → Application exception for Docker Desktop).

**ISSUE-0096 (low) — supabase/setup-cli@v1 must be bumped before 2026-09-16** (Node.js 20 runner removal). Track as CI maintenance item for v1.1.1.

**S7.1 Gate I still pending.** Q-1.1-S7-RC.1 Option A resolved. Gate I next: update `docs/content/manifests/s7.1-batch-01-preview.json` with Option A shape + skill remap, then Gate II dry-run `POST /content/import?dry_run=true`.
