# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 15 — AssessmentEngine contract + LinearEngine + engines-client (2026-05-04)
- Next stage: Stage 16 — SkillEngine + DiagnosticEngine (per DEV_PLAN.md). §2A pre-implementation review completed during Stage 15 close session; implementation pending.
- Days remaining (target 75): 62
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3
- Phase 1 begins: Stage 15 (current). Phase 1 buffer: 9 days available.

## Test suite

| Suite        | Status   | Count                | Last run   |
| ------------ | -------- | -------------------- | ---------- |
| Unit         | ✅ green  | 208/208              | 2026-05-04 |
| Integration  | n/a      | n/a                  | n/a        |
| pgTAP        | ✅ green  | 451/451              | 2026-05-03 |
| Contract     | n/a      | n/a                  | n/a        |
| RLS          | ✅ green  | 451/451 (53 tables)  | 2026-05-03 |
| E2E          | n/a      | n/a                  | n/a        |

Unit breakdown: 97 (@mm/types) + 24 (@mm/sdk) + 59 (@mm/ui: 27 axe + 32 functional) + **28 (@mm/engines, NEW Stage 15)**.

@mm/ui count grew from 50 (Stage 14 close) → 59 across post-Stage-14 brand polish commits (`3cdc7b4`, `d19f1b9`, `2ee1fbd`, `ed3c567`): RootErrorFallback + Brand component split-color wordmark + next/image + on-dark variant tests.

pgTAP/RLS not re-run for Stage 15 — no new tables, no new migrations; pure TypeScript stage.

## Quality gates

| Gate                | Last status                        | Last run   |
| ------------------- | ---------------------------------- | ---------- |
| pnpm lint           | ✅ green (7 packages)              | 2026-05-04 |
| pnpm typecheck      | ✅ green (7 packages)              | 2026-05-04 |
| pnpm test           | ✅ green (208/208 unit)             | 2026-05-04 |
| pnpm build          | ✅ green (7 packages)              | 2026-05-04 |
| RLS coverage        | ✅ 53/53 tables enabled + tested   | 2026-05-03 |
| pnpm audit          | unknown — TODO measure              | n/a        |
| pnpm test:migration | ✅ green (10 migrations roundtrip) | 2026-05-03 |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

## Open items

- ADRs accepted: 22 (ADR-0001 through ADR-0022, ADR-0022 added Stage 15)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/0
- Open questions: 0
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 **resolved Stage 15**; DEV-20260503-2 ongoing v1.1)

## Notes for next session

**Stage 15 complete (2026-05-04, commit `14cd96b`):**

- `packages/engines/src/contracts.ts` — `AssessmentEngine` interface (Spec §3.1) + supporting types (`EngineState`/`LinearEngineState`, `TerminationSignal`, `ScoreResult`, `FinalResult`, `EngineResponse`, `SessionContext`, `FrameworkConfig`, `ScoringRules`, `EngineType`); every state-bearing type paired with a Zod schema for jsonb round-trip.
- `packages/engines/src/linear.ts` — `LinearEngine` pure-function namespace (per ADR-0022). `scoreWithConfig` + `terminateWithConfig` for config-aware scoring; bare `score()` is config-free.
- `packages/engines/src/__tests__/linear.test.ts` — 28 tests; includes golden 30-item ICAS session (20/30 → 67% → credit band) and explicit replay-determinism golden test.
- `packages/engines-client/` — new browser-safe package (Bundler module resolution; peer dep `@mm/engines: workspace:*`); resolves DEV-20260430-1 (deferred from Stage 1 per ADR-0001).
- `apps/web/src/lib/engines.ts` — type-only smoke surface validating the resolution chain.
- `next.config.mjs` `transpilePackages` extended to include `@mm/engines-client` + `@mm/engines`.
- ADR-0022 filed: pure-function namespace pattern.

**Stage 15 disciplines now binding for Stage 16+:**

- Pure-function namespaces only (ADR-0022). No classes for engines.
- Clock injected per-call to `getTimeRemaining` + `terminate`; never stored in `EngineState`.
- `EngineState` is JSON-serialisable (no Map/Set/Date/functions); persists into `session_record.engine_state_snapshot jsonb`.
- No `Math.random`, no `Date.now` inside engine bodies.

**Stage 16 pre-cues:**

- §2A pre-implementation review for Stage 16 was produced this session — Q-16.1 through Q-16.13 all answered with defensible defaults; no blockers.
- Key Stage 16 moves required:
  - Widen `TerminationReasonSchema` (+`mastery_reached`, `max_items_reached`, `confidence_threshold_met`).
  - Widen `EngineStateSchema` to a `z.discriminatedUnion('engine_type', [Linear | Skill | Diagnostic])`.
  - Introduce server-side `EngineItem` (extends `ItemDTO` with `skill_ids`, `difficulty`).
  - Extend `EngineResponse` with optional `telemetry?` for the §9.5 cognitive load formula.
  - Lift Stage 15 fixtures into `_fixtures.ts` for reuse across all 3 engine test files.
  - File ADR-0023 for the discriminated-union widening + `EngineItem` introduction.

**Supabase remote project:** https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2)
