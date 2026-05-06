# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 21 — Skill Graph Cache Production Hardening (2026-05-10)
- Next stage: Stage 22 — Session Selection + Practice screens (Day 27, 1-day budget; first UI stage since Stage 14)
- Days remaining (target 75): 49
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 stages closed: 15, 16, 17, 18, 19, 20, 21 (of 13). Phase 1 buffer: 9 days available; **+2 banked** from Stages 17 + 19 (single-session closes vs 2-day budgets); Stages 20 + 21 also closed in single sessions against 1-day budgets — neutral on the buffer.
- **Skill-graph cache hardened**. ADR-0028 in-flight Promise sentinel + stale-while-revalidate landed at Stage 21; Stage 18's cache module is now production-correct under autoscale + transient-DB-failure scenarios. intelligence-svc L3a still bypasses the cache (ISSUE-0006, deferred pre-launch).

## Test suite

| Suite       | Status   | Count               | Last run   |
| ----------- | -------- | ------------------- | ---------- |
| Unit        | ✅ green  | 372/372             | 2026-05-10 |
| Integration | n/a      | n/a                 | n/a        |
| pgTAP       | ✅ green  | 451/451             | 2026-05-03 |
| Contract    | ✅ green  | 82/82               | 2026-05-10 |
| RLS         | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E         | ⚠ opt-in | 1 spec (gated)      | n/a        |

Unit + contract breakdown: 97 (@mm/types) + 24 (@mm/sdk) + 59 (@mm/ui: 27 axe + 32 functional) + 110 (@mm/engines: 28 linear + 27 skill + 22 diagnostic + 33 adaptive) + **24 (@mm/content-svc: 13 endpoint contract + 11 cache — 5 Stage 18 + 6 Stage 21 hardening)** + 30 (@mm/assessment-svc: 5 createSession + 6 respondToSession + 8 submitSession + 3 checkpointSession + 2 resumeSession + 1 abandonSession + 2 listRecentSessions + 3 idempotency middleware) + 28 (@mm/intelligence-svc: 9 helpers + 1 dedup + 4 L1 + 5 L2 + 3 L3a + 2 audit-log + 1 replay-determinism + 3 error paths).

Contract count = 24 (content-svc) + 30 (assessment-svc) + 28 (intelligence-svc) = 82.

E2E: `apps/web/playwright/e2e/session-flow.spec.ts` is `test.skip()`-guarded on `E2E_BASE_URL` / `E2E_TEST_PATHWAY_ID` / `E2E_SUPABASE_ANON`. Submit assertion accepts both `'sync_complete'` and `'pending'` (Stage 20 soft-fallback). CI integration deferred to Stage 26 per Q-19.9.

pgTAP/RLS not re-run for Stage 21 — no schema changes (cache hardening is in-process Edge Function code only). **Pre-deploy gate from Stages 19+20 still applies**: `pnpm test:migration` for migrations 0012 + 0013 and `pnpm test:rls` must be run locally before any deploy (sandbox lacks Docker; see DAILY_LOG caveats).

## Quality gates

| Gate                | Last status                              | Last run   |
| ------------------- | ---------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)                    | 2026-05-10 |
| pnpm typecheck      | ✅ green (10 packages)                   | 2026-05-10 |
| pnpm test           | ✅ green (372/372 unit + contract)       | 2026-05-10 |
| pnpm build          | ✅ green (7 packages)                    | 2026-05-10 |
| RLS coverage        | ✅ 53/53 tables enabled + tested         | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                   | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012 + 0013 (sandbox no Docker) | 2026-05-03 (last clean: 11 migrations) |

`@mm/content-svc`, `@mm/assessment-svc`, `@mm/intelligence-svc` all have typecheck + test scripts only (Q-19.12 precedent) — Deno-only deploy path. Workspace count: 10 (unchanged from Stage 20).

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

Latency measurement begins Stage 26 (load test). Stage 21 contract tests assert correctness + the watermark synthetic cost gate (mean over 100 iterations < 50 ms — 10× margin per Q-21.2). Real <5 ms watermark cost gate moves to Stage 26 against a warm Postgres pool.

## Open items

- ADRs accepted: 28 (ADR-0001 through ADR-0028; ADR-0028 added Stage 21 morning for skill-graph cache in-flight sentinel + stale-while-revalidate)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/2/0 (ISSUE-0005 — `apps/web/.env.local.example` hygiene, medium; ISSUE-0006 — intelligence-svc L3a bypasses skill-graph cache, medium, pre-launch)
- Open questions: 0 (Q-19.1..13 resolved 2026-05-08; Q-20.1..15 resolved 2026-05-09; Q-21.1..5 resolved 2026-05-09)
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 resolved Stage 15; DEV-20260503-2 ongoing v1.1)

## Notes for next session

Stage 22 morning. **First UI stage since Stage 14** — Phase 1 UI cluster begins (Stages 22–25). Visual reference: `docs/design/prototypes/stage-24_results-flagship.{html,jsx}` sets the bar (Path B baseline). For Stage 22 specifically, `docs/mockups/05-student-home.html` + `docs/mockups/08-practice.html` remain visual reference per UI_CONTRACT §1.1; consider whether to run Claude Design prototypes for Session Selection + Practice ahead of implementation (quota status: ~24% remaining pre-Thu reset, may have refilled). Pre-deploy gate: `pnpm test:migration` for **0012 + 0013** and `pnpm test:rls` still pending local Docker run before any deploy.
