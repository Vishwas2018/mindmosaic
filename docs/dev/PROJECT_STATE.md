# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 1 — Monorepo & Tooling (2026-04-30)
- Next stage: Stage 2 — Migration 0001 — Enums + Tenancy + Auth
- Days remaining (target 75): 74
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3

## Test suite

| Suite        | Status | Count | Last run |
| ------------ | ------ | ----- | -------- |
| Unit         | ✅ green | 0 (pass-with-no-tests) | 2026-04-30 |
| Integration  | n/a    | n/a   | n/a |
| pgTAP        | n/a    | n/a   | n/a |
| Contract     | n/a    | n/a   | n/a |
| RLS          | n/a    | n/a   | n/a |
| E2E          | n/a    | n/a   | n/a |

## Quality gates

| Gate            | Last status | Last run |
| --------------- | ----------- | -------- |
| pnpm lint       | ✅ green (6/6 workspaces) | 2026-04-30 |
| pnpm typecheck  | ✅ green (6/6 workspaces) | 2026-04-30 |
| pnpm test       | ✅ green (6/6 workspaces) | 2026-04-30 |
| pnpm build      | ✅ green (6/6 workspaces) | 2026-04-30 |
| RLS coverage    | n/a — no migrations yet   | n/a |
| pnpm audit      | unknown — TODO measure    | n/a |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a |
| Pipeline async                    | 30000 ms   | n/a |
| Dashboard load                    | 2000 ms    | n/a |

## Open items

- ADRs accepted: 1 (ADR-0001)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/0
- Open questions: 0
- Open bugs: 0
- Deviations logged: 1 (DEV-20260430-1)

## Notes for next session

- Stage 2 is Migration 0001 — Enums + Tenancy + Auth per DEV_PLAN.md §2.
- Supabase project exists: https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2).
- Stage 2 is a schema/policy stage → must run §2A pre-implementation review before C-C-D-V.
- Stage 2 needs Supabase CLI (v2.96.0 confirmed) and Docker (v29.3.1 confirmed).
- Reminder: pnpm test:rls and pnpm test:migration scripts not yet wired (Stage 2 must add them).
- ADR-0001 commit SHA: to be updated after first push.
- Vite CJS deprecation warning in vitest output is cosmetic — address in Stage 11 when real tests are written (add vitest.config with `pool: 'forks'` or ESM mode).
