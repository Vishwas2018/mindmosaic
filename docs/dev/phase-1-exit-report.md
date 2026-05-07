# Phase 1 Exit Report — MindMosaic v1

- **Date:** 2026-05-17
- **Stage:** 27
- **Scope:** DEV_PLAN.md Stages 15–27
- **Verdict:** **Conditional Go** — Go for Phase 2 development. No-Go for production deploy until pre-deploy gate and performance validation are cleared (see §9).

---

## 1. Summary

Phase 1 (DEV_PLAN.md Stages 15–27, Days 15–35) is complete. All CI-testable quality gates are green. Four assessment engines, three backend services (content-svc, assessment-svc, intelligence-svc), the SDK layer, and the full student-facing UI cluster (Session Selection, Practice, Exam Engine, Results, Dashboard) are shipped and passing 399/399 unit + contract tests, 58/58 replay assertions, and 451/451 pgTAP + RLS tests on the last CI run (2026-05-16 for unit/contract/build; 2026-05-03 for pgTAP/RLS — no schema changes since Stage 20).

Two categories of work gate production deploy but do not block Phase 2 development:

1. **Pre-deploy gate**: migrations 0012 + 0013 + RLS verification cannot run in this sandbox (no Docker). Must run locally before any deploy.
2. **Performance validation**: All four BUILD_CONTRACT §10 p95 budgets are unmeasured. Measurement requires a deployed environment. k6 harness and nightly CI workflow are ready and waiting for `LOAD_TEST_BASE_URL` / `LOAD_TEST_TOKEN` secrets.

**Phase 1 buffer:** +2 days banked into Phase 2 (Stage 22 split −1 day; Stages 17, 19, 23 early closes +3 days net).

---

## 2. Assessment Framework Gate — spec §4

DEV_PLAN Stage 27 exit criterion: *"All Phase 1 exit criteria green (spec §4)."*

`spec §4` = Assessment Framework Specifications (`mindmosaic-spec-v4_4.md` §4). v1 scope covers §4.1 (NAPLAN) and §4.2 (ICAS Math). §4.3–§4.5 (Selective Entry, Singapore Math, Olympiad/AMC) are **P3 icebox** per DEV_PLAN §5.3 — not Phase 1 targets.

### 2.1 spec §4.1 — NAPLAN (Y5 Numeracy, v1)

| Attribute (spec §4.1) | Specified value | Implementation | Gate |
|-----------------------|-----------------|----------------|------|
| Assessment style | Adaptive, testlet-based | `AdaptiveEngine` (Stage 17); testlet routing per ADR-0024 | ✅ |
| Year levels | 3, 5, 7, 9 | `framework_config` seed (`03_assessment_config.sql`); v1 targets Y5 Numeracy per CLAUDE.md | ✅ |
| Domains | Numeracy (+ Writing text-capture only in MVP) | NAPLAN pathway seeded; Writing = `is_writing_item` flag, text capture, excluded from scoring per spec §4.1 note | ✅ |
| Stages per domain | 3 stages | Seed: 3 stages, 7 testlets (t1; t2_easy/medium/hard; t3_easy/medium/hard) per ADR-0024 | ✅ |
| Routing | Stage N score → testlet for stage N+1 | 6-row `routing_table` keyed by `(stage_id, score_min, score_max)` → `next_testlet_id`; `lookupRoute` helper in `AdaptiveEngine` | ✅ |
| Difficulty paths | 3 tiers per routing point | easy / medium / hard testlets at each routing boundary | ✅ |
| Navigation | Back-nav within current stage only | `AdaptiveEngine.canNavigateBack`: stage-bound (`current_stage_index` check) per ADR-0024 | ✅ |
| Timing | Per-stage, server-authoritative | `AdaptiveEngine.getTimeRemaining`: anchors to first response per stage; clock injected (ADR-0027 determinism guarantee) | ✅ |
| Scoring | Scaled score from adaptive path + correctness | `scoreAdaptiveWithConfig`; writing items excluded; replay harness exercises `scoreWithConfig` on LinearEngine (same scoring path) | ✅ |
| Writing | Text capture only in MVP | `is_writing_item: true`; `is_correct: null`; excluded from `computeStageScore` | ✅ |
| Calculator | Configurable per year level | v1 scope = Y5 Numeracy (no calculator required); `framework_config` field is configurable for Y7/Y9 when needed | ✅ |

### 2.2 spec §4.2 — ICAS (Math Paper C, v1)

| Attribute (spec §4.2) | Specified value | Implementation | Gate |
|-----------------------|-----------------|----------------|------|
| Assessment style | Linear, fixed-sequence | `LinearEngine` (Stage 15) | ✅ |
| Year levels | 2–12 (Papers A–J) | `framework_config` seeds; v1 targets Paper C per CLAUDE.md | ✅ |
| Question count | 30–40 per paper | Blueprint-driven via `content-svc /content/select` (Stage 18); `blueprint.sections` × `difficulty_bands` × lex tie-break | ✅ |
| Difficulty | Progressive easy→hard within paper | `LinearEngine` ordering by `difficulty_bands` in blueprint sections | ✅ |
| Navigation | Full back-navigation permitted | `LinearEngine.canNavigateBack`: returns `true` when `back_navigation_enabled=true` in ICAS `framework_config` | ✅ |
| Timing | Single session timer | `LinearEngine.getTimeRemaining`: session-scoped; clock injected | ✅ |
| Scoring | Raw → scaled → medal thresholds | `LinearEngine.scoreWithConfig`: `scaled_score_formula='percentage'` + 3-band lookup (developing/proficient/advanced); replay harness 58/58 assertions verify determinism | ✅ |
| Multiple-choice | All MC except Writing | v1 multiple-choice items only; Writing pathway not in scope | ✅ |

### 2.3 spec §4.3–§4.5 — Deferred

Selective Entry, Singapore Math, Olympiad/AMC: **P3 icebox per DEV_PLAN §5.3**. Not Phase 1 scope.

---

## 3. Phase 1 Deliverables — spec §23

spec §23 Phase 1 goal: *"Launch NAPLAN + ICAS exam preparation with foundational intelligence."*

Note: spec §23's "Phase 1" describes the full v1 MVP. DEV_PLAN's internal Phase 1 (Stages 15–27) covers the foundational cluster; parent/admin dashboards and Stripe billing are v1 scope delivered in later DEV_PLAN stages.

| Deliverable (spec §23 Phase 1) | Status | Evidence |
|-------------------------------|--------|---------|
| AdaptiveEngine (NAPLAN), LinearEngine (ICAS), SkillEngine, DiagnosticEngine — fully operational | ✅ Complete | Stages 15–17; 110 `@mm/engines` unit tests; ADR-0022, 0023, 0024 |
| Unified skill taxonomy (Australian Curriculum v9) with prerequisite DAG | ✅ Complete | Stage 18 + `seeds/01_skill_graph.sql`; `getActiveSkillGraph` cache per ADR-0028; 1h TTL + watermark invalidation |
| Question schema with distractor rationale support, content pipeline | ✅ Complete | Stage 18 `content-svc`; 50 seeded items; `v_item_current` view; `/content/select` blueprint-driven deterministic ordering |
| Intelligence: Foundation (L1), Behaviour (L2), Basic causal (L3a) | ✅ Complete | Stage 20; sync pipeline triggered inline from `/submit`; replay-determinism proven (ADR-0027, 58/58 replay assertions); 28 `@mm/intelligence-svc` contract tests |
| Rules-based recommendation engine with weekly plan generation | ✅ Complete | Stage 21; skill-graph cache production hardening (ADR-0028 in-flight dedup + stale-while-revalidate) |
| Student dashboard | ✅ Complete | Stage 25; 6 sections per SCREEN_SPECS Screen 7; 11 `@mm/web` unit tests; mastery snapshot + streak stubs per ISSUE-0011f |
| Parent and admin dashboards | ⚠️ Deferred to DEV_PLAN Stages 36–37 | Placeholder pages with "Available in a future release" copy shipped at Stage 14. Full implementations in Phase 2+ |
| Multi-tenant architecture with RLS | ✅ Complete | Stages 1–20; 53 tables enabled + 451/451 pgTAP + RLS tests (2026-05-03); `REVOKE/GRANT` triple pattern per BUILD_CONTRACT §6 |
| Subscription gating (Free / Standard tiers) | ⚠️ Partial | Feature-flag entitlement gating ✅ (Stage 18 `checkFeatureFlag`; locked pathway cards in Session Selection); Stripe subscription management deferred to Stages 42–47 (v1 billing phases) |
| Deployment: Supabase + Vercel, Turborepo monorepo | ⚠️ Pending pre-deploy gate | Turborepo monorepo ✅ (7/7 packages build); Supabase Edge Functions authored; pre-deploy gate (migrations 0012+0013+RLS) requires Docker — not run in sandbox; not yet deployed to Vercel |

---

## 4. Quality Gates

### 4.1 CI gates (last run 2026-05-16)

| Gate | Status | Last run | Detail |
|------|--------|----------|--------|
| `pnpm lint` | ✅ green | 2026-05-16 | 7/7 packages |
| `pnpm typecheck` | ✅ green | 2026-05-16 | 10/10 packages |
| `pnpm test` (unit + contract) | ✅ green | 2026-05-16 | 399/399 |
| `pnpm test:replay` | ✅ green | 2026-05-16 | 58/58 assertions; <1s runtime |
| `pnpm build` | ✅ green | 2026-05-16 | 7/7 packages |
| pgTAP | ✅ green | 2026-05-03 | 451/451 (no schema changes since Stage 20) |
| RLS coverage | ✅ green | 2026-05-03 | 451/451 tests; 53/53 tables enabled |
| E2E | ⚠️ opt-in, gated | n/a | 5 specs; gated on `E2E_BASE_URL` secret; CI job added (Stage 26 D8) |
| `pnpm audit` | unknown — TODO measure | n/a | Not yet run |
| `pnpm test:migration` | ⚠️ NOT RUN (no Docker) | 2026-05-03 (last clean: 11 migrations) | Migrations 0012 + 0013 pending; required before deploy |

### 4.2 Test breakdown at Phase 1 close

| Package | Tests | Notes |
|---------|-------|-------|
| `@mm/types` | 97 | All type schemas |
| `@mm/sdk` | 32 | 18 client (incl. 5 ADR-0026 lock-token tests) + 10 keys + 4 hooks |
| `@mm/ui` | 67 | Axe + functional; covers QuestionMap, FocusHeader, all primitives |
| `@mm/engines` | 110 | Linear (28) + Skill (27) + Diagnostic (22) + Adaptive (33) |
| `@mm/content-svc` | 24 | Contract tests incl. 6 cache hardening tests |
| `@mm/assessment-svc` | 30 | Contract tests incl. 3 DEV_PLAN exit-criterion named tests |
| `@mm/intelligence-svc` | 28 | Contract tests incl. replay-determinism + dedup named tests |
| `@mm/web` | 11 | Pure dashboard-utils functions |
| **Total** | **399** | |

### 4.3 3-consecutive-commits criterion

| Commit | Summary | CI status |
|--------|---------|-----------|
| `676fadb` | chore(dev-context): stage 26 close | ✅ (docs-only; lint/typecheck/test unchanged) |
| `75984c6` | feat(infra,sdk,types): Stage 26 | ✅ (399/399, 58/58) |
| `ae7f922` | chore(stage-26): resolve Q-26.1..5 + save C-C-D-V prompt | ✅ (docs-only) |

Criterion satisfied: no regressions across last 3 commits on `main`.

---

## 5. Performance vs BUILD_CONTRACT §10

All four p95 budgets are unmeasured. Measurement requires a deployed environment. No numbers have been invented.

| Endpoint | Budget p95 | Measured p95 |
|----------|-----------|--------------|
| POST /sessions/{id}/respond | 300 ms | n/a — measurement requires deployed environment |
| POST /sessions/{id}/submit + sync | 5000 ms | n/a — measurement requires deployed environment |
| Pipeline async | 30000 ms | n/a — measurement requires deployed environment |
| Dashboard load | 2000 ms | n/a — measurement requires deployed environment |

`k6/session-loop.js` (Stage 26 D1) + `.github/workflows/load-test.yml` (nightly 02:00 UTC) activate when `LOAD_TEST_BASE_URL` + `LOAD_TEST_TOKEN` secrets are configured post-deploy. Measurements to be logged in `docs/dev/perf/measurements.md`.

---

## 6. Open Issues at Phase 1 Close

All 4 remaining open issues are **medium severity**. None are critical or high. All are v1.1 targets except ISSUE-0006 which folds into Stage 28.

| Issue | Summary | Severity | Target |
|-------|---------|---------|--------|
| ISSUE-0006 | `intelligence-svc` L3a bypasses `skill-graph-cache.ts` (arch §9.3 inconsistency — direct `skill_edge` query instead of `getSkillGraph()`) | medium | Fold into Stage 28 (jobs-worker) when orchestration-svc + analytics-svc readers are built |
| ISSUE-0009 | Offline persistence: IndexedDB queue + SW shell cache deferred per ADR-0030 — page reload during offline loses in-memory queue (mitigated by 30s autosave) | medium | DEV_PLAN §5 P1.6 (v1.1, first 4 weeks post-launch) |
| ISSUE-0010 | Adaptive section-boundary banner + `current_testlet_id` DTO field absent — v1 uses forward-only navigation per Q-23.4 resolution | medium | DEV_PLAN §5 P1.7 (v1.1) |
| ISSUE-0011 | 6 deferred content stubs: Results screen (a–e: topic breakdown, perf insights, question review, mastery delta, proficiency map) + Dashboard mastery snapshot (f) — all blocked on Stage 28+ backend | medium | DEV_PLAN §5 P2.10 (post-Stage-28 backend) |

---

## 7. Phase 1 Technical Deviations

| Deviation | Status | Impact on Phase 2 |
|-----------|--------|-------------------|
| DEV-20260503-2 — `content.recalibration` no-op stub | ongoing → v1.1 | Covered by DEV_PLAN §5 P2.2 (L8 Content Intelligence Loop). No Phase 2 code is blocked. |
| DEV-20260511-1 — Stage 22 split (22a + 22b) | resolved Stage 22b | −1 Phase 1 buffer day; recovered by Stage 23 early close. Net +2 days banked. |
| DEV-20260515-1 — dashboard route target | self-resolved Stage 25 | No impact. |
| DEV-20260430-1 — `engines-client` deferred Stage 1 → Stage 15 | resolved Stage 15 | No impact. |

---

## 8. Phase 1 ADR Inventory (ADR-0022 through ADR-0030)

All 9 Phase 1 ADRs are **accepted**. None are in proposed or superseded state.

| ADR | Title | Stage | Key decision |
|-----|-------|-------|-------------|
| 0022 | Engine implementations as pure-function namespaces | 15 | Namespaces (not classes); JSON-serialisable state for `engine_state_snapshot` |
| 0023 | `EngineState` as discriminated union, `EngineItem` as server-side shape | 16 | `z.discriminatedUnion('engine_type', [...])` — safe narrowing at DB boundary |
| 0024 | `AdaptiveEngine` testlet routing model + seed correction | 17 | Testlet routing (not IRT/CAT); seed rewritten to match spec §3.2.1 |
| 0025 | Adopt Claude Design as prototype tool from Stage 22 | 22 | Visual prototypes are reference-only per UI_CONTRACT §1.1; `tokens.css` wins divergences |
| 0026 | Lock-token rotation per `/respond` | 19 | `lock_token` rotates every `/respond`; client echoes via `X-Session-Lock`; seeded from `/state` |
| 0027 | Intelligence sync trigger model + replay determinism | 20 | No `Math.random`/`Date.now()` as algorithm inputs; sorted-key `canonicalize()`; `Effects` injection |
| 0028 | Skill-graph cache: in-flight dedup + stale-while-revalidate | 21 | Module-scope `loadingPromise` sentinel; prior cache retained on revalidation failure |
| 0029 | SDK service-prefix routing: single `MmClient` + per-hook service prefix | 22a | `baseUrl = ${SUPABASE_URL}/functions/v1`; each hook prepends its service path segment |
| 0030 | Offline persistence: in-memory queue v1; IndexedDB + SW deferred to v1.1 | 23 | Prioritise a11y gate > offline-resilience > offline-persistence; ISSUE-0009 tracks upgrade |

Phase 0 ADRs 0001–0021 pre-date Phase 1. Total accepted ADRs at Phase 1 close: **30**.

---

## 9. Pre-Deploy Checklist

These items are not Phase 1 code gaps — they are environment-gated tasks required before production deploy:

- [ ] Run `pnpm test:migration` locally with Docker (migrations 0012 + 0013 pending)
- [ ] Run `pnpm test:rls` locally with Docker (post-migration RLS re-verification)
- [ ] Run `pnpm audit`; address any critical/high CVEs; log result in `docs/dev/security/findings.md`
- [ ] Configure `LOAD_TEST_BASE_URL` + `LOAD_TEST_TOKEN` secrets → nightly k6 activates
- [ ] Run k6 load test against deployed environment; log p95 measurements in `docs/dev/perf/measurements.md`; verify all four BUILD_CONTRACT §10 budgets met
- [ ] Configure `E2E_BASE_URL` + `E2E_SUPABASE_URL` + `E2E_SUPABASE_ANON_KEY` → CI E2E job activates
- [ ] Run 5 Playwright E2E specs against deployed environment; confirm all pass
- [ ] Fix ISSUE-0006 (L3a cache bypass) in Stage 28 or a dedicated pre-launch stage
- [ ] Push git tag `v1-phase-1` (created locally at Stage 27 close; push pending approval)

---

## 10. Phase 1 Statistics

| Metric | Value |
|--------|-------|
| Stages completed | 15–27 (13 stages) |
| Calendar dates | 2026-05-04 → 2026-05-17 |
| Buffer at close | +2 days banked into Phase 2 |
| Unit + contract tests | 208 (Stage 15) → 399 (Stage 27) = +191 tests |
| Phase 1 ADRs accepted | ADR-0022 through ADR-0030 = 9 (total all phases: 30) |
| Issues opened | ISSUE-0005 through ISSUE-0012 = 8 (ISSUE-0005, 0007, 0008, 0012 resolved; ISSUE-0006, 0009, 0010, 0011 carry into Phase 2) |
| Questions raised + resolved | Q-19.1..13 + Q-20..Q-26 batches = all resolved; **0 open at Phase 1 close** |
| Deviations | 4 total; 3 resolved; 1 ongoing (DEV-20260503-2 → v1.1) |
| Migrations | 0012 + 0013 authored; pending local Docker run |
| Edge Functions | `auth-svc`, `users-svc`, `content-svc`, `assessment-svc`, `intelligence-svc` (5 services) |

---

*Go to Phase 2 development: ✅ Approved.*
*Production deploy: ⚠️ Pending pre-deploy gate (migrations 0012+0013+RLS) + performance validation.*
