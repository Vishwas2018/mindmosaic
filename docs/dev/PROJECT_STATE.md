# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 18 — Content Service + skill-graph cache (2026-05-07)
- Next stage: Stage 19 — Assessment Service (Days 23–24, 2-day budget)
- Days remaining (target 75): 59
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 stages closed: 15, 16, 17, 18 (of 13). Phase 1 buffer: 9 days available.
- **All 4 v1 engines complete + content read path operational.** Stage 19 wires assessment-svc to invoke content-svc's `/content/select` and the engines.

## Test suite

| Suite        | Status   | Count               | Last run   |
| ------------ | -------- | ------------------- | ---------- |
| Unit         | ✅ green  | 308/308             | 2026-05-07 |
| Integration  | n/a      | n/a                 | n/a        |
| pgTAP        | ✅ green  | 451/451             | 2026-05-03 |
| Contract     | ✅ green  | 18/18               | 2026-05-07 |
| RLS          | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E          | n/a      | n/a (Stage 19)      | n/a        |

Unit breakdown: 97 (@mm/types) + 24 (@mm/sdk) + 59 (@mm/ui: 27 axe + 32 functional) + 110 (@mm/engines: 28 linear + 27 skill + 22 diagnostic + 33 adaptive) + **18 (@mm/content-svc: 13 endpoint contract + 5 cache)**.

Contract tests are a new gate as of Stage 18 — they live inside `@mm/content-svc` and run via `pnpm test`. Stage 19+ Edge Functions should adopt the same handler-split pattern (`index.ts` for Deno dispatcher, `handlers.ts` for pure Node-testable logic).

pgTAP/RLS not re-run for Stages 15–18 — Stages 15–17 were pure TypeScript; Stage 18 added a content-svc Edge Function but no migrations or new tables.

## Quality gates

| Gate                | Last status                        | Last run   |
| ------------------- | ---------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)              | 2026-05-07 |
| pnpm typecheck      | ✅ green (8 packages)              | 2026-05-07 |
| pnpm test           | ✅ green (308/308 unit)             | 2026-05-07 |
| pnpm build          | ✅ green (7 packages)              | 2026-05-07 |
| RLS coverage        | ✅ 53/53 tables enabled + tested   | 2026-05-03 |
| pnpm audit          | unknown — TODO measure              | n/a        |
| pnpm test:migration | ✅ green (10 migrations roundtrip) | 2026-05-03 |

`@mm/content-svc` has typecheck + test scripts only — no build/lint (Deno-only deploy path). Workspace count is now 8 (was 7); typecheck runs in 8/8.

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

## Open items

- ADRs accepted: 24 (ADR-0001 through ADR-0024; no new ADRs in Stage 18 per Q-18.11)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/0
- Open questions: 0
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 resolved Stage 15; DEV-20260503-2 ongoing v1.1)

## Notes for next session

Day 19 evening (or earliest available evening): connect mindmosaic
repo to Claude Design at claude.ai/design. Subdirectories apps/web
+ packages/ui only — NOT the full monorepo. Verify auto-derived
design system against §1.3 checklist in CLAUDE_DESIGN_PROMPTS.md.
First prototype use Stage 22 (Session Selection), Day 22.
