# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 22a — SDK service-prefix routing + MmClientProvider wired (2026-05-11)
- Next stage: Stage 22b — Session Selection + Practice screens (carry-forward from DEV-20260511-1; budget 1 day)
- Days remaining (target 75): 48
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 stages closed: 15, 16, 17, 18, 19, 20, 21, **22a** (Stage 22 split into 22a + 22b per DEV-20260511-1). Phase 1 buffer: **9 days available**; **+1 net banked** (was +2 from Stages 17 + 19 single-session closes; **−1 spent on the Stage 22 split** per DEV-20260511-1; Stages 20 + 21 + 22a closed in single sessions against 1-day budgets — neutral on the buffer).
- **SDK ↔ Edge Function routing reconciled.** ADR-0029 single-client + per-hook service-prefix pattern landed at Stage 22a. All 17 SDK hook calls now prepend a service prefix per OWNERS.md ownership; 2 path body fixes per Q-22.2 (assessment-svc `POST /sessions/create` + `GET /sessions/{id}`). `MmClientProvider` mounted in `apps/web/src/providers/Providers.tsx` with refresh-safe `getToken`. Stage 22b screens (Session Selection + Practice) consume the reconciled SDK tomorrow.

## Test suite

| Suite       | Status   | Count               | Last run   |
| ----------- | -------- | ------------------- | ---------- |
| Unit        | ✅ green  | 375/375             | 2026-05-11 |
| Integration | n/a      | n/a                 | n/a        |
| pgTAP       | ✅ green  | 451/451             | 2026-05-03 |
| Contract    | ✅ green  | 82/82               | 2026-05-10 |
| RLS         | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E         | ⚠ opt-in | 1 spec (gated)      | n/a        |

Unit + contract breakdown: 97 (@mm/types) + **27 (@mm/sdk: 13 client + 10 keys + 4 hooks — was 24; +3 from Q-22.1 `useListRecentSessions` hook + key + carry-forward)** + 59 (@mm/ui: 27 axe + 32 functional) + 110 (@mm/engines: 28 linear + 27 skill + 22 diagnostic + 33 adaptive) + 24 (@mm/content-svc: 13 endpoint contract + 11 cache — 5 Stage 18 + 6 Stage 21 hardening) + 30 (@mm/assessment-svc: 5 createSession + 6 respondToSession + 8 submitSession + 3 checkpointSession + 2 resumeSession + 1 abandonSession + 2 listRecentSessions + 3 idempotency middleware) + 28 (@mm/intelligence-svc: 9 helpers + 1 dedup + 4 L1 + 5 L2 + 3 L3a + 2 audit-log + 1 replay-determinism + 3 error paths).

Contract count = 24 (content-svc) + 30 (assessment-svc) + 28 (intelligence-svc) = 82.

E2E: `apps/web/playwright/e2e/session-flow.spec.ts` is `test.skip()`-guarded on `E2E_BASE_URL` / `E2E_TEST_PATHWAY_ID` / `E2E_SUPABASE_ANON`. Submit assertion accepts both `'sync_complete'` and `'pending'` (Stage 20 soft-fallback). CI integration deferred to Stage 26 per Q-19.9. Stage 22b will add `practice-flow.spec.ts` against the same env-guard pattern.

pgTAP/RLS not re-run for Stage 22a — no schema changes (SDK + apps/web only). **Pre-deploy gate from Stages 19+20 still applies**: `pnpm test:migration` for migrations 0012 + 0013 and `pnpm test:rls` must be run locally before any deploy (sandbox lacks Docker; see DAILY_LOG caveats).

## Quality gates

| Gate                | Last status                              | Last run   |
| ------------------- | ---------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)                    | 2026-05-11 |
| pnpm typecheck      | ✅ green (10 packages)                   | 2026-05-11 |
| pnpm test           | ✅ green (375/375 unit + contract)       | 2026-05-11 |
| pnpm build          | ✅ green (7 packages)                    | 2026-05-11 |
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

- ADRs accepted: **29** (ADR-0001 through ADR-0029; ADR-0029 added Stage 22a morning for single MmClient + per-hook service-prefix routing).
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/2/0 (ISSUE-0005 — `apps/web/.env.local.example` hygiene, medium; ISSUE-0006 — intelligence-svc L3a bypasses skill-graph cache, medium, pre-launch)
- Open questions: 0 (Q-19.1..13 resolved 2026-05-08; Q-20.1..15 resolved 2026-05-09; Q-21.1..5 resolved 2026-05-09; **Q-22.1..3 resolved 2026-05-11**)
- Open bugs: 0
- Deviations logged: **3** (DEV-20260430-1 resolved Stage 15; DEV-20260503-2 ongoing v1.1; **DEV-20260511-1 — Stage 22 split, resolved by Stage 22b**)

## Notes for next session

Stage 22b morning. Session Selection + Practice screens per `docs/prompts/2026-05-11_stage-22a.md` scope (22b carry-forward) — full C-C-D-V also saved at `docs/prompts/2026-05-12_stage-22b.md`. **MmClient + provider now wired; SDK hooks resolve service paths correctly.** Visual references unchanged from Stage 22 plan: SCREEN_SPECS §8 + §10 (authoritative), UI_CONTRACT (tokens, primitives, shells, states matrix, a11y, motion budget), `docs/mockups/05-student-home.html` + `08-practice.html` (Phase 0 baseline), `docs/design/prototypes/stage-24_results-flagship.{html,jsx}` (visual bar — but tokens diverge; tokens.css wins), `docs/design/prototypes/external/portal-codebase-2026-05-06/` `StudentHome.jsx` + `StudentPractice.jsx` (architecture-divergent — visual layout reference only per INDEX.md prohibition list, never copy code in). Pre-deploy gate: `pnpm test:migration` for **0012 + 0013** and `pnpm test:rls` still pending local Docker run before any deploy.
