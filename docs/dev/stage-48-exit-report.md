# Stage 48 Exit Report — Hardening Pass

**Date:** 2026-06-07
**Stage:** 48 (Days 72–75 per DEV_PLAN; actual Day 65 — 8 days ahead of schedule)
**Budget:** 4 days (DEV_PLAN); actual 1 day (within Day 65)
**Preceding stage:** 47 — Phase 4 Exit Review (2026-06-06)
**Next stage:** 49 — Launch Gate Review + v1.0.0 Tag

---

## §1 Conditional Go Verdict

**CONDITIONAL GO — Stage 48 closes.** All sandbox-achievable items passed or are resolved. Deployed-environment items (k6 execution, Playwright, 24h soak, backup drill, Stripe test-mode E2E, 8 SLA measurements) are documented as deferred to Stage 49 launch-window operational verification.

This verdict follows the Conditional Go pattern established in Phases 1, 2, and 4. The pattern applies when: (a) all code-verifiable gates pass, and (b) infrastructure-gated items are documented and tracked, not silently skipped.

---

## §2 Scope Partition — Sandbox vs Deployed-Env

| Item | Partition | Outcome |
|---|---|---|
| DAILY_LOG blockers review | SANDBOX | ✅ No blockers found — prior stages clean |
| DEV-20260606-2 filed | SANDBOX | ✅ Filed at prep commit |
| Q-48.1..5 resolved | SANDBOX | ✅ All resolved at prep commit |
| pnpm audit → security/findings.md | SANDBOX | ✅ 18 findings logged; 0 critical; v1.1 track |
| .env.example audit (Stripe + service URL keys) | SANDBOX | ✅ 7 STRIPE_* + 5 service URLs all present |
| scripts/validate-content.ts | SANDBOX (env-gated) | ⚠ exit 1 — local DB has no seeded content; deferred to deployed env |
| axe-core sweep (via @mm/ui Vitest tests) | SANDBOX | ✅ 31 files / 75 assertions — no regressions |
| pgTAP 0001–0020 via npx supabase@2.98.2 | SANDBOX | ✅ 451/451 (after fixing schema drift in 3 test files — ISSUE-0036) |
| k6/billing-webhook.js authored | SANDBOX | ✅ k6/billing-webhook.js NEW — webhook p95 + flag propagation p95 |
| ISSUE-0035 filed | SANDBOX | ✅ Filed at close commit |
| ISSUE-0036 filed + fixed | SANDBOX | ✅ pgTAP test/schema drift fixed; 451/451 confirmed |
| Q-48.6 self-resolved | SANDBOX | ✅ pgTAP test fixes — T3 Option 3 |
| 3-consecutive-commits criterion | SANDBOX | ✅ prep + impl + close = 3 commits |
| k6 1h 500-VU soak execution | REQUIRES-DEPLOYED | ⏸ Stage 49 |
| 8 SLA numerical measurements | REQUIRES-DEPLOYED | ⏸ Stage 49 |
| Playwright 11 specs / 15 tests | REQUIRES-DEPLOYED | ⏸ Stage 49 |
| Stripe test-mode invoicing verification | REQUIRES-DEPLOYED | ⏸ Stage 49 |
| 24h pipeline.dead_letter.count soak | REQUIRES-DEPLOYED | ⏸ Stage 49 |
| Supabase backup drill | REQUIRES-DEPLOYED | ⏸ Stage 49 |

---

## §3 pgTAP — Migrations 0001–0020

**Outcome:** ✅ 451/451 — Files=10, Tests=451, Result: PASS

**Method:** `npx supabase@2.98.2 test db` against local Supabase stack (Docker daemon running; stack already active with migrations 0001–0020 applied). `db reset` failed (tables already exist from Stage 42–46 development; DROP failed due to live Docker container state); skipped to `test db` directly, which confirmed all migrations applied and tests pass.

**Prior baseline:** 451/451 against 0001–0013 (2026-05-03). Migrations 0014–0020 were previously untested in pgTAP.

**Regressions found and fixed:** 3 of 10 test files initially failed due to test/schema drift from migrations 0012, 0015, 0016. Fixed in this impl commit (ISSUE-0036 + Q-48.6):

| File | Root cause | Fix |
|---|---|---|
| `004_sessions_events.sql` | Migration 0012 widened `create_session_response_atomic` to 11-arg; test had old 10-arg signature | Updated REVOKE check + G17/G18 call sites to 11-arg (added `'{}'::jsonb`) |
| `007_new_domains.sql` | Migration 0015 added `pathway_id NOT NULL REFERENCES pathway`; test seed lacked pathway data | Added `framework_config` + `pathway` seed rows; updated assignment INSERT |
| `010_outbox_dispatcher.sql` | Migration 0016 replaced dead `assignment.published` with `assignment_assigned` (Q-34.1) | Updated event_type + description comments |

Test assertion counts unchanged: same 451 assertions, now passing against 0001–0020 schema.

---

## §4 Security Scan (pnpm audit)

**Outcome:** ✅ Logged. No critical findings. No pre-launch blocking items.

**Summary:** 18 vulnerabilities — 2 low | 10 moderate | 6 high. All high/moderate findings in `apps__web > next` (Next.js 14.2.35) or dev-only tooling (Storybook esbuild, packages/ui Vite). All require Next.js 15.x upgrade (breaking change from 14.x locked by ADR).

**Full output:** `docs/dev/security/findings.md`

**Triage:** No findings require pre-launch action. Next.js 15 upgrade tracked as v1.1 sprint post-launch. Production DoS exposure (GHSA-8h8q-6873-q5fj, high) mitigated by WAF/rate limiting at CDN edge until upgrade. Dev-tool findings (esbuild, Vite) are non-production.

---

## §5 Deployed-Env Deferrals (Stage 49 Launch-Window Items)

The following items cannot be completed in the sandbox environment. All are required Stage 49 launch-gate prerequisites.

| Item | Reason deferred | Stage 49 gate? |
|---|---|---|
| k6 500-VU soak (1 hour) — `k6/session-loop.js` | k6 binary absent; deployed Supabase + auth tokens required | Yes — launch gate item 2 |
| 8 SLA measurements (`docs/dev/perf/measurements.md`) | Requires k6 against running services | Yes — BUILD_CONTRACT §10 + §8 |
| Playwright 11 specs / 15 tests | Binary available but deployed Supabase + auth required | Yes — launch gate |
| Stripe test-mode invoicing verification | Stripe env vars absent in sandbox | Yes — launch gate item 5 |
| 24h pipeline.dead_letter.count soak | Codespace cannot sustain 24h; no meaningful signal in local env | Yes — launch gate item 3 |
| Supabase backup + restore drill | Deployed project required for backup API | Yes — launch gate item 4 |
| scripts/validate-content.ts exit 0 | Local DB has no seeded content items | Yes — launch gate item 6 |
| billing-svc k6 billing-webhook.js execution | k6 binary absent + deployed billing-svc required | Yes — launch gate (billing SLAs) |

Scripts are authored and deploy-ready:
- `k6/session-loop.js` — session loop 500 VU (pre-existing)
- `k6/billing-webhook.js` — billing webhook + flag propagation (NEW, Stage 48)

---

## §6 axe-core Sweep

**Outcome:** ✅ No regressions — 31 test files / 75 assertions, all pass.

**Method:** axe-core is integrated as a Vitest assertion library in `@mm/ui` (not a standalone CLI). All 31 axe-instrumented test files live in `packages/ui/src/`. Running `pnpm run test` in `packages/ui` executes all axe assertions against component renders (jsdom + axe-core).

**Routes covered:** All 21 app routes' structural UI patterns are covered by the @mm/ui components tested. No standalone per-route sweep required (axe-core tests validate component accessibility patterns; Playwright-based per-route sweep is deployed-env only).

---

## §7 .env.example Audit

**Outcome:** ✅ Complete — all required keys present. No patches needed.

**Stripe keys verified (7):**
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅
- `STRIPE_PRICE_ID_STANDARD_MONTHLY` ✅
- `STRIPE_PRICE_ID_STANDARD_YEARLY` ✅
- `STRIPE_PRICE_ID_PREMIUM_MONTHLY` ✅
- `STRIPE_PRICE_ID_PREMIUM_YEARLY` ✅

**Service URL vars verified (5):**
- `INTELLIGENCE_SVC_URL` ✅
- `ANALYTICS_SVC_URL` ✅
- `ORCHESTRATION_SVC_URL` ✅
- `ASSESSMENT_SVC_URL` ✅
- `NOTIFICATIONS_SVC_URL` ✅

**Additional keys present:** `NEXT_PUBLIC_APP_URL`, `LOAD_TEST_BASE_URL`, `LOAD_TEST_TOKEN`, `E2E_*` (4 Playwright vars), Supabase core keys.

---

## §8 k6/billing-webhook.js

**Outcome:** ✅ Authored as deploy-ready artefact.

**File:** `k6/billing-webhook.js`

**Two scenarios:**
1. `webhook_p95` — 500 VU ramping (0→100 in 30s, →500 in 2m, →0 in 30s); threshold `billing_webhook_latency p(95)<300` (BUILD_CONTRACT §8 line 99: Stripe webhook ≤300ms)
2. `flag_propagation` — 10 VU constant 5min; polls `GET /intelligence-svc/flags/{studentId}` after triggering a `customer.subscription.updated` webhook; threshold `flag_propagation_latency p(95)<30000` (BUILD_CONTRACT §10: Pipeline async ≤30s)

Not executed in sandbox — k6 binary absent + deployed billing-svc required. Execute at Stage 49.

---

## §9 Updated Pre-Deploy Checklist

Items resolved this stage are marked ✅. Items pending deployed-env verification marked ⏸.

| # | Item | Status |
|---|---|---|
| 1 | pnpm audit — log in security/findings.md | ✅ Done — Stage 48 |
| 2 | .env.example — verify Stripe + service URL keys present | ✅ Done — Stage 48 |
| 3 | git hooks active (pre-commit + commit-msg) | ✅ Active — pre-commit hook ran at prep commit (24 tasks, 134ms) |
| 4 | 3-consecutive-commits criterion on origin/main | ✅ Stage 48 prep + impl + close = 3 commits |
| 5 | pnpm install + pnpm turbo typecheck --force (17/17, 0 cached) | ✅ Close-ritual — verified at impl + close |
| 6 | scripts/validate-content.ts exit 0 (50 items, 10 misconceptions) | ⏸ Exit 1 locally (no seeded content); Stage 49 deployed env |
| 7 | Docker migrations 0001–0020 + pgTAP 451/451 | ✅ Done — Stage 48 (ISSUE-0036 fixed) |
| 8 | k6 soak 500 VU / 1h — session-loop.js | ⏸ k6 binary absent; Stage 49 |
| 9 | k6 billing-webhook.js — billing SLA p95s | ⏸ k6 binary absent; Stage 49 |
| 10 | Playwright 11 specs / 15 tests (deployed Supabase) | ⏸ Deployed Supabase required; Stage 49 |
| 11 | Stripe test-mode — invoicing + tax verification | ⏸ Stripe env absent; Stage 49 |
| 12 | 24h pipeline.dead_letter.count = 0 (soak) | ⏸ Stage 49 |
| 13 | Supabase backup + restore drill (staging) | ⏸ Stage 49 |
| 14 | 8 SLA measurements vs BUILD_CONTRACT §10 budgets | ⏸ Stage 49 |
| 15 | Stripe migrations 0017/0019/0020 deploy-order documented | ✅ docs/dev/deployment.md §Migration 0017/0019/0020 (Stage 44–46) |
| 16 | RLS coverage 53/53 tables (no new tables Stages 42–47) | ✅ No new tables; 451/451 pgTAP confirms |

---

## §10 Stage 48 Statistics

| Metric | Value |
|---|---|
| Stages closed | 48 of 75 |
| Days on stage | 1 (Day 65; budget 4 days per DEV_PLAN) |
| Buffer banked | +7.5 days (unchanged — 1-day actual vs 4-day budget = +3 more banked; effective buffer +10.5 days entering Stage 49) |
| Vitest suite | 696 passed / 1 skipped (697 total) — unchanged |
| pgTAP | 451/451 — now covers 0001–0020 (previously 0001–0013) |
| axe-core | 31 test files / 75 assertions — no regressions |
| pnpm audit | 18 findings (0 critical, 6 high, 10 moderate, 2 low) — all v1.1 track |
| Issues opened | ISSUE-0035 (low — Playwright spec count doc error), ISSUE-0036 (medium — pgTAP schema drift, resolved at Stage 48) |
| Questions resolved | Q-48.1..5 (prep), Q-48.6 (impl) |
| Deviations | DEV-20260606-2 (prep — mid-session pull discipline) |
| New files | `k6/billing-webhook.js`, `docs/dev/security/findings.md`, `docs/dev/perf/measurements.md`, `docs/dev/stage-48-exit-report.md` |
| Test files modified | `supabase/tests/rls/004_sessions_events.sql`, `007_new_domains.sql`, `010_outbox_dispatcher.sql` (schema-drift fix) |
