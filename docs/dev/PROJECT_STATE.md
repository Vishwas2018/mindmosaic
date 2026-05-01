# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 2 — Migration 0001 — Enums + Tenancy + Auth (2026-05-01)
- Next stage: Stage 3 — Migration 0002 — Content & Skill Graph
- Days remaining (target 75): 73
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3

## Test suite

| Suite        | Status   | Count     | Last run   |
| ------------ | -------- | --------- | ---------- |
| Unit         | ✅ green  | 0 (pass-with-no-tests) | 2026-05-01 |
| Integration  | n/a      | n/a       | n/a        |
| pgTAP        | ✅ green  | 65/65     | 2026-05-01 |
| Contract     | n/a      | n/a       | n/a        |
| RLS          | ✅ green  | 65/65 (7 tables) | 2026-05-01 |
| E2E          | n/a      | n/a       | n/a        |

## Quality gates

| Gate            | Last status | Last run   |
| --------------- | ----------- | ---------- |
| pnpm lint       | ✅ green (6/6 workspaces) | 2026-05-01 |
| pnpm typecheck  | ✅ green (6/6 workspaces) | 2026-05-01 |
| pnpm test       | ✅ green (6/6 workspaces) | 2026-05-01 |
| pnpm build      | ✅ green (cached from Stage 1) | 2026-04-30 |
| RLS coverage    | ✅ 7/7 tables enabled + tested | 2026-05-01 |
| pnpm audit      | unknown — TODO measure | n/a |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

## Open items

- ADRs accepted: 6 (ADR-0001 through ADR-0006)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/1/0
- Open questions: 0
- Open bugs: 0
- Deviations logged: 1 (DEV-20260430-1)

## Notes for next session

- Stage 3 is Migration 0002 — Content & Skill Graph per DEV_PLAN.md §2 Stage 3.
- Stage 3 is a schema/policy stage → must run §2A pre-implementation review before C-C-D-V.
- Stage 3 risk is MEDIUM (recursive CTE for cycle detection). Budget extra test time.
- **Stage 5 forward-flag**: Stage 5 must extend UTA-table RLS policies (tenant, user_profile,
  parent_student_link, class_group, class_student, feature_flag) with per-role SELECT granularity.
  ADR-0004 and ISSUE-0001 document the gap. Reminder: include this in Stage 5 §2A plan under
  item (c) RLS policy plan.
- Supabase project: https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2).
- pgTAP patterns established in Stage 2 (no skeleton needed in later §2A reviews unless new):
  - SELECT isolation: `SET ROLE authenticated; SELECT set_config(...); SELECT is(COUNT(*)::int, ...)`
  - DML deny (silent): `WITH x AS (UPDATE/DELETE ... RETURNING 1) SELECT is((SELECT COUNT(*)::int FROM x), 0, ...)`
  - DML deny (raises): `SELECT throws_ok(sql, '42501', NULL, description)`
  - Trigger sentinel: insert with `updated_at = '2000-01-01'`; assert `> '2000-01-01'` after UPDATE
  - handle_new_user raises: `SELECT throws_like(sql, '%ERROR_CODE%', description)`
