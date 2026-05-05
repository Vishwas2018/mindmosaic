# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 19 — Assessment Service + session lifecycle + first Playwright e2e (2026-05-08)
- Next stage: Stage 20 — Intelligence Service Sync (L1 + L2 + L3a) (Day 25, 1-day budget)
- Days remaining (target 75): 51
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 stages closed: 15, 16, 17, 18, 19 (of 13). Phase 1 buffer: 9 days available (effectively +2 banked — Stages 17 and 19 each closed in single sessions vs 2-day budgets).
- **assessment-svc operational; full session lifecycle green.** Stage 20 wires intelligence-svc inline sync into `/submit`, transitioning `pipeline_status` from `'pending'` to `'sync_complete'` on the e2e path.

## Test suite

| Suite        | Status   | Count               | Last run   |
| ------------ | -------- | ------------------- | ---------- |
| Unit         | ✅ green  | 334/334             | 2026-05-08 |
| Integration  | n/a      | n/a                 | n/a        |
| pgTAP        | ✅ green  | 451/451             | 2026-05-03 |
| Contract     | ✅ green  | 44/44               | 2026-05-08 |
| RLS          | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E          | ⚠ opt-in | 1 spec (gated)      | n/a        |

Unit + contract breakdown: 97 (@mm/types) + 24 (@mm/sdk) + 59 (@mm/ui: 27 axe + 32 functional) + 110 (@mm/engines: 28 linear + 27 skill + 22 diagnostic + 33 adaptive) + 18 (@mm/content-svc: 13 endpoint contract + 5 cache) + **26 (@mm/assessment-svc: 5 createSession + 6 respondToSession + 4 submitSession + 3 checkpointSession + 2 resumeSession + 1 abandonSession + 2 listRecentSessions + 3 idempotency middleware)**.

Contract count = 18 (content-svc) + 26 (assessment-svc) = 44.

E2E: `apps/web/playwright/e2e/session-flow.spec.ts` is `test.skip()`-guarded on `E2E_BASE_URL` / `E2E_TEST_PATHWAY_ID` / `E2E_SUPABASE_ANON`. Browser install via `pnpm exec playwright install chromium`. CI integration deferred to Stage 26 per Q-19.9.

pgTAP/RLS not re-run for Stage 19 — only changes are an RPC widening (`create_session_response_atomic` gains `p_engine_state jsonb`) and the `idx_session_one_active` unique-index assertion was already covered in Stage 4 pgTAP. **`pnpm test:migration` for migration 0012 must be run locally** (sandbox lacks Docker; see DAILY_LOG caveats).

## Quality gates

| Gate                | Last status                         | Last run   |
| ------------------- | ----------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)               | 2026-05-08 |
| pnpm typecheck      | ✅ green (9 packages)               | 2026-05-08 |
| pnpm test           | ✅ green (334/334 unit + contract)  | 2026-05-08 |
| pnpm build          | ✅ green (7 packages)               | 2026-05-08 |
| RLS coverage        | ✅ 53/53 tables enabled + tested    | 2026-05-03 |
| pnpm audit          | unknown — TODO measure              | n/a        |
| pnpm test:migration | ⚠ NOT RUN for 0012 (sandbox no Docker) | 2026-05-03 (last clean: 11 migrations) |

`@mm/assessment-svc` has typecheck + test scripts only (Q-19.12) — no build/lint, Deno-only deploy path. Workspace count is now 9 (was 8); typecheck runs in 9/9.

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

Latency measurement begins Stage 26 (load test). Stage 19 contract tests assert correctness, not p95.

## Open items

- ADRs accepted: 26 (ADR-0001 through ADR-0026; ADR-0026 added Stage 19 morning for lock-token rotation per respond)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/0
- Open questions: 0 (Q-19.1..13 all resolved 2026-05-08)
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 resolved Stage 15; DEV-20260503-2 ongoing v1.1)

## Notes for next session

Stage 20 morning. Also: Day 19 evening Claude Design repo
connection per ADR-0025 — connect mindmosaic to claude.ai/design,
scope apps/web + packages/ui only. Verify §1.3 checklist in
CLAUDE_DESIGN_PROMPTS.md. Run `pnpm test:migration` locally
against migration 0012 before any deploy.
