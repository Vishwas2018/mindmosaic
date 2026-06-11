# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: v1.1 in-scope E2E gate — **CLOSED 2026-06-11** (16 passed / 4 skipped / 0 failed; Option-A thin merge gate met — see Notes)
- Next stage: post-merge backlog — Cluster B / Q-1.1-POLISH-B1, mocked-supabase/contract sweep, legal re-review (DEV-20260520-1), content activation, Stripe live keys (see Notes)
- v1 build window: **CLOSED** — 49/49 stages (Days 1–65 of 75; 10 days banked unused)
- Active branch: `v1.1/exam-content` — 72 commits ahead of origin/main (9376d98 v1.0.0) — recount 2026-06-05 (`git rev-list --count HEAD ^origin/main`):
  a7a43d0 v1.1-S1 prep · e76dbfc v1.1-S1 impl · c4c868e v1.1-S1 chore · 3c1afe0 v1.1-S2 prep · 0bdd43b v1.1-S2 impl · f72a7a8 v1.1-S2 chore · ac36e80 ISSUE-0037 remediation · 560e2d2 v1.1-S3 prep · 96b19b5 v1.1-S3 impl · ca9c670 v1.1-S3 chore · 2faeb65 v1.1-S4 prep · b8b8290 v1.1-S4 impl · 5c9692f v1.1-S4 chore · 7b63e2a v1.1-S5 prep · 18aac21 v1.1-S5 impl · efb27e7 v1.1-S5 chore · dc851cf audit+ADR-0040 · b3eb668 ISSUE-0042 fix · 27ded4d ISSUE-0042 docs close · 3340c93 v1.1-S6 prep · 28e85e2 v1.1-S6 impl · 8c86690 v1.1-S6 chore · 4453ddc S7-prep step 1a · bd3a310 S7-prep step 1b feat · 5dd8f4e S7-prep step 1b chore · a5140e0 S7-prep step 1c feat · (S7-prep step 1c chore) · 5144b9a Cluster A · 9705579 Cluster B · 3a2fca6 Cluster C · 4353d78 Cluster D · 5e158f8 Cluster E · e525d2a Cluster F · 57c3b95 Cluster G · 8e83552 polish chore · 62d16b1 framework_config.config · 6a4dc83 pgTAP unlock · dd33739 ISSUE-0074 fix-1 · 7629b5c ISSUE-0074 fix-2 · d3d76cd G2+G3 E2E · (this chore)
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
| Unit             | ✅ green      | 946 passed / 2 skipped / 0 failed                                                                                                 | 2026-06-05 |
| Integration      | n/a          | n/a                                                                                                                                | n/a        |
| pgTAP            | ✅ green      | 468/468 (migrations 0001–0027; 0021–0027 unlocked 2026-06-04, +17 from 0021 fixture unlock)                                      | 2026-06-04 |
| Contract         | ✅ green      | included in 946 Vitest total                                                                                                       | 2026-06-05 |
| E2E (Vitest)     | ✅ green      | 1/1 (assignments-svc lifecycle)                                                                                                    | 2026-05-23 |
| E2E (Playwright) | ✅ green      | in-scope family-beta: 16 passed / 4 skipped / 0 failed; out-of-scope specs `test.skip`'d w/ ISSUE-0085–0088 refs                  | 2026-06-11 |
| RLS              | ✅ green      | 468/468 (53 tables + _default partitions; pgTAP 0001–0027 covers all incl. 0025 deny-all)                                        | 2026-06-04 |
| Replay           | ✅ green      | 58/58 assertions + 100 billing-svc replay assertions (2-pass 50-event)                                                            | 2026-06-01 |
| axe-core         | ✅ green      | 31 Vitest files / 75 assertions (Stage 48 sweep); S4+S5 added 2 Playwright axe-core specs / 4 guarded tests pending ISSUE-0038   | 2026-06-07 |

Unit + contract breakdown (full `pnpm -r test` 2026-06-05 recount; jobs-worker +1 vs 2026-05-24 baseline):
162 (@mm/types) + 81 (@mm/sdk) + 81 (@mm/ui) + 118 (@mm/engines) + 9 (@mm/core) + 78 (content-svc) + 50 (assessment-svc) + 53 (intelligence-svc) + 7 (jobs-worker, 1 skipped) + 31 (analytics-svc) + 19 (orchestration-svc) + 27 (assignments-svc) + 17 (notifications-svc) + 7 (users-svc) + 147 (apps/web, 1 skipped) + 59 (billing-svc) = **946 passed, 2 skipped, 0 failed** (948 total).

## Quality gates

| Gate                | Last status                                                                        | Last run   |
| ------------------- | ---------------------------------------------------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7/7 packages with lint scripts; 0 warnings/errors)                      | 2026-05-24 |
| pnpm typecheck      | ✅ green (17/17 packages, 0 turbo-cached — --force run)                           | 2026-06-05 |
| pnpm test           | ✅ green (946 passed / 2 skipped / 0 failed)                                      | 2026-06-05 |
| pnpm test:replay    | ✅ green (58/58 assertions)                                                        | 2026-05-16 |
| pnpm build          | ❌ BLOCKED — local TLS cert issue (Google Fonts); CI/Vercel unaffected (ISSUE-0067) | 2026-05-22 |
| RLS coverage        | ✅ 53/53 tables + _default partitions enabled + tested (pgTAP 0001–0027 468/468)  | 2026-06-04 |
| pnpm audit          | ⚠ 18 findings (0 critical, 6 high, 10 moderate, 2 low) — all v1.1 track          | 2026-06-07 |
| pnpm test:migration | ✅ 468/468 — covers migrations 0001–0027                                          | 2026-06-04 |

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

- ADRs accepted: **45** (ADR-0001 through ADR-0045; ADR-0044 = framework_config.config column 2026-06-03; ADR-0045 = verify_jwt=false service-only functions 2026-06-04)
- ADRs proposed: **0**
- Workspaces: **17** — unchanged
- Issues critical / high / medium / low: **1 / 0 / 16 / 24**
  - Critical (1): ISSUE-0075 (BOOT_ERROR — local-only blocker; Norton SSL inspection incompatible with edge-runtime compiled CA bundle; merge gate moves to CI E2E via ISSUE-0079)
  - Medium (16): ISSUE-0009, ISSUE-0010, ISSUE-0011, ISSUE-0014, ISSUE-0021, ISSUE-0023, ISSUE-0027, ISSUE-0030, ISSUE-0049, ISSUE-0050, ISSUE-0051, ISSUE-0052, ISSUE-0053, ISSUE-0060 (resolved-pending-rerun), ISSUE-0071 (new partitions born RLS-disabled), ISSUE-0079 (CI E2E merge gate)
  - Low (24): ISSUE-0015, ISSUE-0016, ISSUE-0017, ISSUE-0019, ISSUE-0020, ISSUE-0022, ISSUE-0024, ISSUE-0025, ISSUE-0028, ISSUE-0031, ISSUE-0032, ISSUE-0033, ISSUE-0034, ISSUE-0035, ISSUE-0038, ISSUE-0044, ISSUE-0066, ISSUE-0067 (local prod build TLS cert), ISSUE-0069 (preview carry), ISSUE-0070 (preview carry), ISSUE-0072 (full_name/display_name key mismatch), ISSUE-0076 (deno vendor — post-merge DX, not pre-merge gate), ISSUE-0077 (selectItems 500 — TBD pending CI E2E run), ISSUE-0078 (pgTAP column-assertion sweep)
  - Resolved 2026-06-03/04: ISSUE-0074 (fetchContentSelect 401 — commits dd33739 + 7629b5c, ADR-0045)
  - Resolved by A–G: ISSUE-0039, 0040, 0041, 0043, 0045, 0046, 0047, 0061, 0062, 0063, 0064, 0065, 0068
- Migrations: **0001–0027** (0001–0020 pgTAP-verified; 0021 content_authoring; 0022 composer/simulation jsonb; 0023 authoring_method NOT NULL; 0024 exam_family rename; **0025 _default partition RLS deny-all**; **0026 public-schema grants to service_role/authenticated/anon**; **0027 framework_config.config jsonb NOT NULL + backfill**)
- Open questions: **1** (Q-1.1-AUDIT-1 — partition RLS access pattern; blocks ISSUE-0060; operator decision required)
- Content items: **8 draft** (`au_numeracy_y5_format`, batch-01; review log at `docs/content/reviews/s7.1-batch-01.md`; `review→active` blocked by DEV-20260520-1 legal gate)
- Open bugs: **2** (BUG-0001 route prefix — fixed ab75f14; BUG-0002 migration 0018 duplicate — fixed f6b7f90)
- Deviations logged: **24 total (9 resolved, 15 open)** — unchanged

## Notes for next session

**v1.1 in-scope E2E gate — CLOSED 2026-06-11.** Family-beta in-scope Playwright set green: **16 passed / 4 skipped / 0 failed**. The 4 skips are out-of-scope deferred surfaces, each `test.skip`'d with an ISSUE ref: assignment publish (ISSUE-0085), student-assignments empty Assigned-tab copy (ISSUE-0086), teacher-student-detail not-found (ISSUE-0087, incl. a strict-mode locator one-liner for un-skip), plus the pre-existing teacher-student-detail page-structure skip; billing-svc `/billing/subscription` 500 filed as ISSUE-0088 (deferred billing surface, background failures only). ISSUE-0075 remains a **local-only** DX blocker (Norton SSL) — not the merge gate, which ran via the CI/deployed path.

**Closed E2E cascade — six-commit arc** (in order): `cc47394` (CORS scoping) → `8226574` (slug→UUID + `CreateSessionRequest` contract) → `be49c91` (Next 14 sync params + dead-mock removal) → `66ad67b` (ISO 8601 datetime offsets across DTO/engine contracts) → `a66df58` (practice/results spec alignment) → `350ab43` (skip out-of-scope deferred specs). Plus `ad21e03` (submit terminal CAS, ISSUE-0043 concurrent-submit residual) and `b782754` (R-DIAG-5 instrumentation removal — zero refs repo-wide).

**Option-A thin-merge decision (2026-06-11).** Merge gate = in-scope E2E green + R-DIAG-5 canary removal + ISSUE-0043 disposition (resolved + CAS-hardened) + this docs ritual. Explicitly **post-merge**, not gating: Cluster B / Q-1.1-POLISH-B1, the mocked-supabase/contract sweep, legal re-review, Stripe live-key wiring, content activation.

**Carry-forward (still open post-merge):**
- **Mocked-supabase / contract sweep** — handler contract tests use hand-crafted mock rows that bypass DB column + wire-shape validation; the ISO-8601 datetime-offset class fixed in `66ad67b` is a concrete instance of the same masking pattern (cf. ADR-0044 `framework_config.config` and the pgTAP-side ISSUE-0078). Sweep `.from('<table>').select(...)` / DTO datetime fields against real shapes.
- **Legal re-review (DEV-20260520-1)** — `review→active` content promotion blocked until sign-off.
- **Content activation** — 8 draft items (`au_numeracy_y5_format`, batch-01) gated behind the legal sign-off above.
- **Stripe live keys** — billing surface (Stages 42–47) not wired in family-beta; see ISSUE-0088.

**ISSUE-0075 (critical) — H1 E2E gate local-blocked by Norton SSL.** Confirmed local-only blocker on this dev machine. Norton Web/Mail Shield SSL/TLS inspection issues a non-Mozilla CA cert for `esm.sh`; edge-runtime v1.73.13 uses compiled-in `webpki-roots` and rejects it. All vendor bypass attempts failed (ROUND H2). Vendor partial (deno.json + vendor/ + deno.lock) discarded in ROUND I-CLEANUP 2026-06-05.
- **Local unblock:** Norton Docker Desktop exclusion (Norton GUI → Firewall → Application exception for Docker Desktop). After exclusion: `docker restart supabase_edge_runtime_mindmosaic` and re-run H1.
- **Merge gate:** moves to CI E2E (ISSUE-0079) — GitHub Actions runners have no Norton. Implement ISSUE-0079 before merge.

**ISSUE-0079 (medium) — CI E2E merge gate (NEW).** Set up GitHub Actions Playwright against Vercel preview. Pre-merge requirement replacing local H1. ISSUE-0077 (selectItems 500) resolves when CI E2E run completes clean.

**ISSUE-0076 (low):** Demoted to post-merge DX. Vendor does not activate until edge-runtime upgrade supports `vendor:true` in worker context; not a merge-gate prerequisite.

**ISSUE-0060 T3 flag — resolved-pending-rerun.** Q-1.1-AUDIT-1 operator decision still required before fully closing.

**Local prod build (ISSUE-0067) still blocked.** TLS cert issue unchanged. Workaround: `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm turbo build` (local only).

**S7.1 Gate I still pending.** Q-1.1-S7-RC.1 Option A resolved. Gate I next: update `docs/content/manifests/s7.1-batch-01-preview.json` with Option A shape + skill remap, then Gate II dry-run `POST /content/import?dry_run=true`.

**Legal re-review gate (DEV-20260520-1):** `review→active` blocked until sign-off.

**Launch-window operational verification (owner: deploy operator):**
- Run k6/session-loop.js (500 VU / 1h) + k6/billing-webhook.js against deployed env
- Run Playwright 13 specs / 20 tests against deployed Supabase (incl. ISSUE-0038 axe-core gate)
- Run scripts/validate-content.ts (requires seeded content, 50 items, 10 misconceptions)
- 24h pipeline.dead_letter.count = 0 soak
- Supabase backup + restore drill (staging project)
- Stripe test-mode invoicing + tax verification
- Log all 8 SLA measurements in docs/dev/perf/measurements.md
- Full checklist: docs/dev/stage-49-exit-report.md §9
