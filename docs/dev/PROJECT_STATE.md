# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 5 + Audit Day 1 — Migration 0004 — Sessions + Canonical Events (2026-05-02)
- Next stage: Stage 6 — Migration 0005 — Intelligence Foundation (L1 Foundation Layer)
- Days remaining (target 75): 71
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3

## Test suite

| Suite        | Status   | Count     | Last run   |
| ------------ | -------- | --------- | ---------- |
| Unit         | ✅ green  | 0 (pass-with-no-tests) | 2026-05-02 |
| Integration  | n/a      | n/a       | n/a        |
| pgTAP        | ✅ green  | 240/240   | 2026-05-02 |
| Contract     | n/a      | n/a       | n/a        |
| RLS          | ✅ green  | 240/240 (28 tables) | 2026-05-02 |
| E2E          | n/a      | n/a       | n/a        |

## Quality gates

| Gate            | Last status | Last run   |
| --------------- | ----------- | ---------- |
| pnpm lint       | ✅ green (18/18, cached) | 2026-05-02 |
| pnpm typecheck  | ✅ green (18/18, cached) | 2026-05-02 |
| pnpm test       | ✅ green (18/18, cached) | 2026-05-02 |
| pnpm build      | ✅ green (cached from Stage 1) | 2026-04-30 |
| RLS coverage    | ✅ 28/28 tables enabled + tested | 2026-05-02 |
| pnpm audit      | unknown — TODO measure | n/a |
| pnpm test:migration | ✅ green (roundtrip up→down→up) | 2026-05-02 |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

## Open items

- ADRs accepted: 12 (ADR-0001 through ADR-0012)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/1
- Open questions: 0
- Open bugs: 0
- Deviations logged: 1 (DEV-20260430-1, ongoing — resolves Stage 15)

## Notes for next session

**Stage 6 is Migration 0005 — Intelligence Foundation (L1 Foundation Layer).** Schema/policy stage
→ §2A pre-implementation review required before C-C-D-V.

**ISSUE-0002 (low, open):** Stage 2/3 helpers (`auth_tenant_id`, `auth_user_id`, `auth_role`,
`fn_user_in_my_tenant`, `fn_class_in_my_tenant`, `fn_graph_version_is_published`) are missing
`REVOKE EXECUTE FROM anon`. Remediation is a small follow-up migration. Due before Stage 10 audit.
Any new SECURITY DEFINER function created in Stage 6+ must use the triple-REVOKE pattern per the
updated BUILD_CONTRACT §6 + §10.

**A2 forward-flag (from §2A Stage 5):** student_select policy intentionally omitted from
`parent_student_link` and `class_student`. Server-side joins handle indirect reads. Stage 17 must
verify this gap does not become a security issue as the application layer evolves.

**learning_event PK is composite (id, created_at):** application queries by `id` alone work fine
(PostgreSQL will scan partitions). Any hypothetical FK to `learning_event(id)` from a future table
would need to include `created_at`. No such FK exists in v1.

**`intelligence_audit_log` (Stage 6) will also be partitioned monthly** — apply ADR-0012 rule
preemptively: `PRIMARY KEY (id, created_at)` and include `created_at` in any UNIQUE index.

**pgTAP pattern correction (BUG-D):** the Stage 4 PROJECT_STATE pattern entry for
"Function raises (code check)" listed `throws_ok(sql, 'PCODE', description)` as a 3-arg errcode
check. This is wrong — the 3-arg form checks the message, not just the errcode. Correct pattern:
`throws_ok(sql, 'PCODE', 'ERROR_KEY', description)` (4-arg). Or use `throws_like(sql,
'%ERROR_KEY%', description)` for message-pattern matching without errcode assertion.

**pgTAP patterns established through Stage 5 (skeleton not needed in §2A unless NEW pattern):**
- SELECT isolation: `SET ROLE authenticated; SELECT set_config(...); SELECT is(COUNT(*)::int, ...)`
- DML deny (silent): `WITH x AS (UPDATE/DELETE ... RETURNING 1) SELECT is(..., 0, ...)`
- DML deny (raises INSERT): `SELECT throws_like(sql, '%row-level security%', description)`
- Trigger sentinel: insert with `updated_at = '2000-01-01'`; assert `> '2000-01-01'` after UPDATE
- Function raises (errcode + message): `SELECT throws_ok(sql, 'PCODE', 'MESSAGE_KEY', description)`
- Function raises (message pattern only): `SELECT throws_like(sql, '%MESSAGE_KEY%', description)`
- Function success: `SELECT lives_ok($$SELECT fn()$$, description)`
- Permission check (no-execute): `SELECT is(has_function_privilege('role', 'public.fn(type)', 'execute'), false, description)`
- Helper output check: `SELECT is(fn() @> ARRAY['uuid'::uuid], true, description)`
- Optimistic-lock: call atomic fn with stale version → `throws_ok(sql, 'P0001', 'VERSION_CONFLICT', description)`
- Dedup unique index: `throws_like($$INSERT...$$, '%duplicate key%', description)`
- Partial unique index (one-active): `throws_like($$INSERT...$$, '%duplicate key%', description)`

**Supabase remote project:** https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2)

**DEV-20260430-1 audit status (Audit Day 1 — 2026-05-02):** reviewed and ongoing; resolves Stage 15
per ADR-0001. No action needed until Stage 15.

**ADR-0009 table-classification heuristic (Stages 5–10):** A table is platform-catalog if it has
no `tenant_id` column. A table is tenant-scoped if it has `tenant_id`. See ADR-0009 follow-ups.

**Stage 14 forward-flag (pathway.required_feature_key convention):** Stage 14 seeders must
populate `pathway.required_feature_key` for every pathway. Recommended convention:
`pathway.feature.<exam_family>.<program>` (paid); `pathway.feature.public` (free-tier).
Stage 19 assessment-svc treats 'public' as always-granted. No CHECK constraint in Migration 0003.
