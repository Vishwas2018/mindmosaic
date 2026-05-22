# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: v1.1 pre-polish static audit — ADR-0042 (P1–P8, 2026-05-22); ISSUE-0054 fixed (MCQ scoring key); S7.1 batch-01 8 items in draft
- Next stage: v1.1 Polish — **Cluster A sketch gate next** (ErrorState + UpgradeState component API + ASCII layout). Cluster order: A → (B + D parallel) → C → E → F → matrix sweep. ADR-0043 binding (proposed).
- v1 build window: **CLOSED** — 49/49 stages (Days 1–65 of 75; 10 days banked unused)
- Active branch: `v1.1/exam-content` — 26 commits ahead of origin/main (9376d98 v1.0.0):
  a7a43d0 v1.1-S1 prep · e76dbfc v1.1-S1 impl · c4c868e v1.1-S1 chore · 3c1afe0 v1.1-S2 prep · 0bdd43b v1.1-S2 impl · f72a7a8 v1.1-S2 chore · ac36e80 ISSUE-0037 remediation · 560e2d2 v1.1-S3 prep · 96b19b5 v1.1-S3 impl · ca9c670 v1.1-S3 chore · 2faeb65 v1.1-S4 prep · b8b8290 v1.1-S4 impl · 5c9692f v1.1-S4 chore · 7b63e2a v1.1-S5 prep · 18aac21 v1.1-S5 impl · efb27e7 v1.1-S5 chore · dc851cf audit+ADR-0040 · b3eb668 ISSUE-0042 fix · 27ded4d ISSUE-0042 docs close · 3340c93 v1.1-S6 prep · 28e85e2 v1.1-S6 impl · 8c86690 v1.1-S6 chore · 4453ddc S7-prep step 1a · bd3a310 S7-prep step 1b feat · 5dd8f4e S7-prep step 1b chore · a5140e0 S7-prep step 1c feat · this chore
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
- Stages closed: **v1: 49/49 closed; v1.1: 6/7 closed (S1–S6 complete; S7 in progress — S7-prep steps 1a + 1b + 1c complete; Q-1.1-7.1..9 resolved; S7.1 workflow defined; Gate I next)**

## Test suite

| Suite            | Status       | Count                                                                                                                              | Last run   |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Unit             | ✅ green      | 843 passed / 1 skipped (+ 4 Playwright axe-core test.skip-guarded via ISSUE-0038)                                                | 2026-05-19 |
| Integration      | n/a          | n/a                                                                                                                                | n/a        |
| pgTAP            | ✅ green      | 451/451 (migrations 0001–0020); 0021 + 0022 SQL files on disk (deferred-validation)                                               | 2026-06-07 |
| Contract         | ✅ green      | included in 839 Vitest total                                                                                                       | 2026-05-19 |
| E2E (Vitest)     | ✅ green      | 1/1 (assignments-svc lifecycle)                                                                                                    | 2026-05-23 |
| E2E (Playwright) | ⚠ opt-in     | 13 specs / 19 tests (gated; all test.skip-guarded; ISSUE-0035, ISSUE-0038)                                                        | n/a        |
| RLS              | ✅ green      | 451/451 (53 tables; pgTAP 0001–0020 covers all); 0021 + 0022 deferred-validation                                                  | 2026-06-07 |
| Replay           | ✅ green      | 58/58 assertions + 100 billing-svc replay assertions (2-pass 50-event)                                                            | 2026-06-01 |
| axe-core         | ✅ green      | 31 Vitest files / 75 assertions (Stage 48 sweep); S4+S5 added 2 Playwright axe-core specs / 4 guarded tests pending ISSUE-0038   | 2026-06-07 |

Unit + contract breakdown (full `pnpm -r run test` 2026-05-22 pre-polish audit P8):
159 (@mm/types) + 58 (@mm/sdk) + 75 (@mm/ui) + 118 (@mm/engines) + 9 (@mm/core) + 78 (content-svc) + 48 (assessment-svc) + 53 (intelligence-svc) + 7 (jobs-worker, 1 skipped) + 31 (analytics-svc) + 19 (orchestration-svc) + 25 (assignments-svc incl. e2e) + 17 (notifications-svc) + 7 (users-svc) + 92 (apps/web) + 59 (billing-svc) = **857 passed, 1 skipped** (858 total).

Delta from v1.1-S7-prep step 1b close: **0** — step 1c is a rename sweep (no new tests; existing 843 now test renamed values).

Delta from v1.0.0 baseline (696/697): +143 total since v1.0.0 (+33 v1.1-S1 + +24 v1.1-S2 + +17 v1.1-S3 + +25 v1.1-S4 + +33 v1.1-S5 + +11 v1.1-S6).

## Quality gates

| Gate                | Last status                                                                        | Last run   |
| ------------------- | ---------------------------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7/7 packages with lint scripts; 0 warnings/errors)                      | 2026-05-22 |
| pnpm typecheck      | ✅ green (17/17 packages, 0 turbo-cached — --force run)                           | 2026-05-22 |
| pnpm test           | ✅ green (857 passed / 1 skipped — 858 total Vitest, 0 turbo-cached)             | 2026-05-22 |
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

- ADRs accepted: **42** (ADR-0001 through ADR-0042; ADR-0042 = v1.1 pre-polish static audit P1–P8, 2026-05-22)
- ADRs proposed: **1** (ADR-0043 — v1.1 polish stage binding, proposed 2026-05-22)
- Workspaces: **17** — unchanged
- Issues critical / high / medium / low: **0 / 0 / 23 / 22**
  - Medium (23): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0030, ISSUE-0039, ISSUE-0040, ISSUE-0041, ISSUE-0043, ISSUE-0045, ISSUE-0049, ISSUE-0050, ISSUE-0051, ISSUE-0052, ISSUE-0053, ISSUE-0060 (T3 flag — partition RLS), ISSUE-0061 (ItemCreateDTO z.string() enum gaps), ISSUE-0062 (missing ErrorState primitive), ISSUE-0063 (missing UpgradeState primitive), ISSUE-0067 (local prod build TLS cert) — **note: prior count of 22 was a doc error; corrected to 23**
  - Low (22): ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028, ISSUE-0031, ISSUE-0032, ISSUE-0033, ISSUE-0034, ISSUE-0035, ISSUE-0038, ISSUE-0044, ISSUE-0046, ISSUE-0047, ISSUE-0048, ISSUE-0064 (inline LoadingState), ISSUE-0065 (role=alert overdue banner), ISSUE-0066 (console.warn exam page)
  - Resolved: ISSUE-0005, 0006, 0007, 0008, 0012, 0013, 0018, 0026, 0029, 0036, 0037, 0042 (b3eb668), 0055, 0056, 0058, **0054** (MCQ key fix; 005f466), **0057** (manifest Zod enum tightening; d2cf946), **0059** (template scale; d2cf946)
- Migrations: **0001–0024** (migrations 0001–0020 pgTAP-verified 451/451; 0021 SQL on disk deferred-validation; 0022 adds composer_params + simulation_params jsonb nullable columns — deferred-validation per 0021 pattern; 0023 adds authoring_method NOT NULL to item_version — deferred-validation per 0021 pattern; **0024 renames exam_family enum values naplan→au_numeracy_y5_format + icas→au_math_paper_c_format — deferred-validation per 0021 pattern**)
- Open questions: **1** (Q-1.1-AUDIT-1 — partition RLS access pattern; blocks ISSUE-0060; operator decision required) — Q-1.1-1.0..9 + Q-1.1-2.1..5 + Q-1.1-3.1..5 + Q-1.1-4.1..8 + Q-1.1-5.1..6 + Q-1.1-6.1..8 + Q-1.1-S7-LEGAL-2.1..2.5 + Q-1.1-7.1..9 + Q-1.1-S7-RC.1 + **Q-1.1-POLISH-1..7** all resolved
- Content items: **8 draft** (`au_numeracy_y5_format`, batch-01; review log at `docs/content/reviews/s7.1-batch-01.md`; `review→active` blocked by DEV-20260520-1 legal gate)
- Open bugs: **2** (BUG-0001 route prefix — fixed ab75f14; BUG-0002 migration 0018 duplicate — fixed f6b7f90)
- Deviations logged: **24 total (9 resolved, 15 open)** — unchanged (no new deviations in S6; DEV-20260515-2 honored)
  - DEV-20260607-1 accepted — DEV_PLAN "47 stages" count vs delivered 49
  - DEV-20260607-2 accepted — DEV_PLAN Stage 49 "spec §4" citation error
  - DEV-20260514-1 open — v1.1 exam-content phase inserted ahead of P1.1–P1.7 (ADR-0035)
  - DEV-20260515-1 open — T3 protocol breach on Q-1.1-2.5 self-resolve (process-only, no rework)
  - DEV-20260515-2 open — atomic commit-and-push announcement process fix (tracking only; honored S3–S6)
  - Open carries (v1.1): DEV-20260503-2, DEV-20260519-1, DEV-20260522-1, DEV-20260523-1, DEV-20260524-1, DEV-20260526-1, DEV-20260529-1, DEV-20260530-1, DEV-20260530-2, DEV-20260604-1
- Tag state: `v1-phase-1` pushed (Stage 27). `v1-phase-2-partial` pushed (Stage 41). `v1-phase-4-partial` pushed (Stage 47). **`v1.0.0` on 9376d98 (Stage 49 close commit — push status: unknown — TODO confirm).**
- Branch: `v1.1/exam-content` HEAD = v1.1-S7-prep step 1c chore close commit (this); 26 commits ahead of origin/main.

## Notes for next session

**Polish stage open.** ADR-0043 proposed. Q-1.1-POLISH-1..7 all resolved. 6 clusters (A–F), cluster-by-area commits. +27 min test floor. **Next action: Cluster A sketch gate** — operator must approve ErrorState + UpgradeState component API (props, variants, ASCII layout) before any code begins.

**Cluster plan (ADR-0043 Decision 8):**
- A: `ErrorState` + `UpgradeState` primitives — T5 three-gate (sketch → skeleton → fill)
- B + D: dashboard-errors wiring (isError on 6 widgets + assignments + session-selection + 402 discrimination) + SDK staleTime — parallel after A
- C: backend (assessment-svc idempotency + Zod enum tightening + N+1 batch fix)
- E: a11y (focus management /practice + /exam-sim + role=alert corrections × 2)
- F: loading-consistency (replace 11+ inline skeletons with LoadingState primitive)
- Matrix sweep: cross-cutting 5-state audit pass; gaps fixed inline

**ISSUE-0060 T3 flag open.** P6 scan found parent tables `intelligence_audit_log` + `learning_event` have RLS enabled in migrations 0005/0004. Default partitions may inherit. Operator must confirm whether ISSUE-0060 is a false positive before closing.

**Local prod build (ISSUE-0067).** `pnpm turbo build` fails with Google Fonts TLS cert error on this machine. CI/Vercel unaffected. Workaround: `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm --filter @mm/web run build`.

**S7-prep legal response complete.** Steps 1a + 1b + 1c all landed on `v1.1/exam-content`:
- 1a: spec rename + disclaimers, AI clause, prohibitions, privacy, a11y, jurisdiction (4453ddc)
- 1b: authoring_method provenance column + migration 0023 (bd3a310)
- 1c: exam_family enum rename + migration 0024 (a5140e0 feat + chore)

**S7.1 workflow fully defined.** Q-1.1-7.T1A/T1B/T1C + Q-1.1-7.1..9 all resolved (operator 2026-05-20). Key decisions:
- Authoring: Hybrid — `authoring_method: "ai_assisted_human_reviewed"` on all S7.1 items
- Source format: direct manifest JSON (`docs/content/manifest-format.md`)
- Review artifact: `docs/content/reviews/<batch>.md` using `_template.md` (7-item checklist)
- Import target: local Supabase
- Lifecycle: `draft → review` open; `review → active` blocked on DEV-20260520-1
- Test gate: per-batch `POST /content/import?dry_run=true` zero-rejections
- Commit model: per-batch `content(s7.1): batch N — <strand> <count> items imported`
- Manifests: in-repo at `docs/content/manifests/<batch>.json`
- T5 gates: Gate I (5–10 item pilot dry-run) → Gate II (full 50-item dry-run) → Gate III (live import)

**S7.1 Gate I format review COMPLETE.** Q-1.1-S7-RC.1 Option A resolved (2026-05-20): flat string options + `correct_option_id` (server ground truth). Spec docs corrected (manifest-format.md §3.2/§9, authoring spec §6/§10).

**ISSUE-0054 FILED** — MCQ auto-scoring broken in v1 exam mode (UI sends `{ choice }`, server reads `option_id`; high severity; pre-launch blocker). Not a Gate I/II/III blocker (items land draft). Fix before any item reaches `active` in exam-mode session.

**NEXT: S7.1 Gate I close** — (1) update `docs/content/manifests/s7.1-batch-01-preview.json` with Option A shape + skill remap (Gate I amendments). (2) Gate II dry-run: `POST /content/import?dry_run=true`. DEV-20260520-1 still active.

**ISSUE-0052 FILED** — manifest slug→UUID resolution (post-S7.1 upgrade to `importItems`).
**ISSUE-0053 FILED** — skill graph Probability + Statistics node extension (pre-S7.2+).

**Legal re-review gate (DEV-20260520-1):** `docs/content/specs/australian-y5-numeracy.md` ready for legal re-review. S7.1 authoring proceeds under DEV-20260520-1 tolerance (items may accumulate in `review`; `active` blocked until legal sign-off).

**ISSUE-0051** filed (Q-2.4 carry) — non-enum trademark surfaces (program column, display_name, slugs, feature_key, UI copy). Pre-launch blocker status: TBD by legal re-review. Do not scope remediation until legal direction received.

**S7.1 sub-batch target:** ~50 NAPLAN-style Year 5 Numeracy original items. Author against `docs/content/specs/australian-y5-numeracy.md` → `POST /content/import` (dry-run first) → lifecycle `draft → review → active`. Idempotency-Key required on all live imports.

**ISSUE-0042 CLOSED** (b3eb668 2026-05-19 — content-svc scope). assessment-svc index.ts:222 type-assertion gap carries non-blocking per ADR-0040.

**ISSUE-0050 FILED** (2026-05-19 — cross-import exact-match dedup; Q-1.1-6.7 + Q-1.1-6.8 upgrade path). Post-launch; implement when content bank reaches meaningful size (~100+ items).

**Carry-forward operator follow-ups:**

- **Legal review gate (S7.1 pre-condition).** Review `docs/content/specs/australian-y5-numeracy.md` and confirm sign-off before S7.1 authoring begins. ADR-0041 §Decision 4 records the gate.
- **ISSUE-0038: axe-core live run** on first preview/CI provision. Covers `exam-content-a11y.spec.ts` (S4) + `student-composer-a11y.spec.ts` (S5). Clears when first green run lands. No code action.
- **`.githooks/pre-commit` activation.** Once per clone: `git config core.hooksPath .githooks`.
- **DEV-20260515-1: T3 fidelity reminder.** Classify each Q-* at impl T1 as structural-vs-tight-detail BEFORE deciding self-resolve eligibility.

**Launch-window operational verification (owner: deploy operator):**
- Run k6/session-loop.js (500 VU / 1h) + k6/billing-webhook.js against deployed env
- Run Playwright 13 specs / 19 tests against deployed Supabase (incl. ISSUE-0038 axe-core gate)
- Run scripts/validate-content.ts (requires seeded content, 50 items, 10 misconceptions)
- 24h pipeline.dead_letter.count = 0 soak
- Supabase backup + restore drill (staging project)
- Stripe test-mode invoicing + tax verification
- Log all 8 SLA measurements in docs/dev/perf/measurements.md
- Full checklist: docs/dev/stage-49-exit-report.md §9
