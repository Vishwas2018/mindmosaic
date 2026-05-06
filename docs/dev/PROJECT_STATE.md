# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 20 — intelligence-svc sync L1+L2+L3a + replay determinism (2026-05-09)
- Next stage: Stage 21 — Skill Graph Cache Production Hardening (Day 26, 1-day budget)
- Days remaining (target 75): 50
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 stages closed: 15, 16, 17, 18, 19, 20 (of 13). Phase 1 buffer: 9 days available; **+2 banked** from Stages 17 + 19 (single-session closes vs 2-day budgets); Stage 20 also closed in a single session against a 1-day budget — neutral on the buffer.
- **intelligence-svc operational; full sync pipeline green.** assessment-svc/submit calls intelligence-svc inline (4s timeout, soft-fall back to `pipeline_status='pending'` on timeout/error per Q-20.15). Replay-determinism integration test passes byte-identical assertion across 2 runs (DEV_PLAN exit criterion met).

## Test suite

| Suite       | Status   | Count               | Last run   |
| ----------- | -------- | ------------------- | ---------- |
| Unit        | ✅ green  | 366/366             | 2026-05-09 |
| Integration | n/a      | n/a                 | n/a        |
| pgTAP       | ✅ green  | 451/451             | 2026-05-03 |
| Contract    | ✅ green  | 76/76               | 2026-05-09 |
| RLS         | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E         | ⚠ opt-in | 1 spec (gated)      | n/a        |

Unit + contract breakdown: 97 (@mm/types) + 24 (@mm/sdk) + 59 (@mm/ui: 27 axe + 32 functional) + 110 (@mm/engines: 28 linear + 27 skill + 22 diagnostic + 33 adaptive) + 18 (@mm/content-svc: 13 endpoint contract + 5 cache) + 30 (@mm/assessment-svc: 5 createSession + 6 respondToSession + **8 submitSession** + 3 checkpointSession + 2 resumeSession + 1 abandonSession + 2 listRecentSessions + 3 idempotency middleware) + **28 (@mm/intelligence-svc: 9 helpers + 1 dedup + 4 L1 + 5 L2 + 3 L3a + 2 audit-log + 1 replay-determinism + 3 error paths)**.

Contract count = 18 (content-svc) + 30 (assessment-svc) + 28 (intelligence-svc) = 76.

E2E: `apps/web/playwright/e2e/session-flow.spec.ts` is `test.skip()`-guarded on `E2E_BASE_URL` / `E2E_TEST_PATHWAY_ID` / `E2E_SUPABASE_ANON`. Submit assertion now accepts both `'sync_complete'` and `'pending'` (sync-complete when intelligence-svc reachable; pending under the soft-fallback path). CI integration deferred to Stage 26 per Q-19.9.

pgTAP/RLS not re-run for Stage 20 — only schema change is migration 0013 (`ALTER TYPE learning_event_type ADD VALUE IF NOT EXISTS 'behaviour_signal'`), which doesn't touch RLS or any pgTAP fixtures. **`pnpm test:migration` for 0012 (Stage 19) AND 0013 (Stage 20) must be run locally** (sandbox lacks Docker; see DAILY_LOG caveats for both stages).

## Quality gates

| Gate                | Last status                              | Last run   |
| ------------------- | ---------------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)                    | 2026-05-09 |
| pnpm typecheck      | ✅ green (10 packages)                   | 2026-05-09 |
| pnpm test           | ✅ green (366/366 unit + contract)       | 2026-05-09 |
| pnpm build          | ✅ green (7 packages)                    | 2026-05-09 |
| RLS coverage        | ✅ 53/53 tables enabled + tested         | 2026-05-03 |
| pnpm audit          | unknown — TODO measure                   | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012 + 0013 (sandbox no Docker) | 2026-05-03 (last clean: 11 migrations) |

`@mm/intelligence-svc` has typecheck + test scripts only (Q-19.12 precedent) — no build/lint, Deno-only deploy path. Workspace count is now **10** (was 9); typecheck runs in 10/10.

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

Latency measurement begins Stage 26 (load test). Stage 20 contract tests assert correctness + replay determinism (byte-identical UPSERT payloads across 2 runs), not p95. The 4s `AbortController` timeout on the inline intelligence-svc call (Q-20.15) leaves a 1s safety margin under the 5s `/submit` p95 budget — empirical p95 verified at Stage 26.

## Open items

- ADRs accepted: 27 (ADR-0001 through ADR-0027; ADR-0027 added Stage 20 morning for algorithm_version + §21.0.2 sync exception + re-processing idempotency + Q-20.12=A `'behaviour_signal'` enum + audit-log scope + distractor shape + timeout fallback)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/1/0 (ISSUE-0005 — `apps/web/.env.local.example` hygiene, medium severity, deferred to a separate chore commit no earlier than Stage 24 audit)
- Open questions: 0 (Q-19.1..13 all resolved 2026-05-08; Q-20.1..15 all resolved 2026-05-09)
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 resolved Stage 15; DEV-20260503-2 ongoing v1.1)

## Notes for next session

Stage 21 morning. Pre-deploy gate: run `pnpm test:migration` for **0012 (Stage 19 deferred) AND 0013 (Stage 20)** locally against Docker before any deploy. Also `pnpm test:rls`. Phase 1 buffer: 9/9 banked, +2 from Stages 17/19.
