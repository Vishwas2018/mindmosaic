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

**Stage 18 complete (2026-05-07, commit `d3543c5`):**

- 7 read endpoints in `supabase/functions/content-svc/`: `/pathways`, `/pathways/{slug}`, `/assessment-profiles`, `/content/items/{id}`, `/content/select`, `/content/search`, `/skill-graphs/active`.
- Skill-graph cache in `supabase/functions/_shared/skill-graph-cache.ts` — module-scope singleton, watermark check on every request + 1h TTL ceiling. Pure-function loader interface (`SkillGraphCacheLoader`) for clean test injection.
- `/content/select` returns `EngineItem[]` (per Q-18.8) with adaptive testlet metadata (testlet_id, stage_id, is_writing_item) for NAPLAN pathways per ADR-0024.
- 18 contract tests (13 endpoint + 5 cache) with all three DEV_PLAN exit criteria as named tests.
- New workspace package `@mm/content-svc` — typecheck + test only, Deno-only deploy.

**Established patterns now binding (cumulative through Stage 18):**

- **Edge Function split (Stage 18):** `index.ts` (Deno dispatcher with URL imports) + `handlers.ts` (pure Node-testable logic). Stage 19+ Edge Functions should adopt.
- **Mock client via callable Proxy** for contract tests. Pattern in `content-svc/__tests__/contract.test.ts:54–82`. Reusable for any Postgrest-chained builder.
- **Pure-function namespaces only** (ADR-0022) for engines.
- **`EngineState` discriminated union by `engine_type`** (ADR-0023). 4 arms now (linear, skill, diagnostic, adaptive). Repair adds the 5th in v1.1.
- **`EngineItem`** is the server-side item shape (ADR-0023, Stage 17 ADR-0024 added testlet metadata). Wire `ItemDTO` stays lean.
- **Routing-table lookups throw on ambiguous matches** (Q-17.9).
- **Lex tie-break by `item_id` ASC** for deterministic content selection (Q-18.4).
- **Cache invalidation = watermark check on every request + 1h TTL ceiling** (Q-18.6).

**Stage 19 pre-cues:**

- Highest risk in Phase 1 ("most complex service" per DEV_PLAN). 2-day budget (Days 23–24).
- Endpoints: `/sessions/create` (idempotency-keyed, feature-gated, atomic write of `session_record` + first item), `/sessions/{id}/respond` (X-Session-Lock + expected_version + atomic 4-table write via `create_session_response_atomic` RPC), `/sessions/{id}/submit` (terminal + outbox_event + inline sync pipeline; idempotency-keyed), `/sessions/{id}/checkpoint` (upsert-only autosave, never bumps version), `/sessions/{id}/state` (resume), `/sessions/{id}/abandon`, `/sessions/recent`.
- Calls **content-svc `/content/select`** (Stage 18 service-role endpoint) on session create.
- Instantiates engines from `@mm/engines` per `pathway.engine_type` and threads `EngineState` through respond/submit cycles. `engine_state_snapshot jsonb` column on `session_record` already exists (arch §5).
- Adopts Stage 18's handler-split pattern (`index.ts` + `handlers.ts`).
- First Playwright e2e test of the build: signup → session create → 5 responses → submit → score returned.
- Exit criteria: version conflict surfaces 409; idempotency replay returns cached response; one-active-session DB-enforced; e2e passes end-to-end.
- §2A review will likely surface Q-19.N decisions around: idempotency key persistence, lock-token rotation, optimistic-lock failure semantics (retry vs reject), engine state serialization at the assessment-svc boundary.

**Supabase remote project:** https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2)
