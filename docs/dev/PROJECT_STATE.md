# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 12 — SDK + API Client (packages/sdk) (2026-05-03)
- Next stage: Stage 13 — packages/ui Primitives + Design Tokens + axe-core Gate
- Days remaining (target 75): 64
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3

## Test suite

| Suite        | Status   | Count     | Last run   |
| ------------ | -------- | --------- | ---------- |
| Unit         | ✅ green  | 121/121   | 2026-05-03 |
| Integration  | n/a      | n/a       | n/a        |
| pgTAP        | ✅ green  | 451/451   | 2026-05-03 |
| Contract     | n/a      | n/a       | n/a        |
| RLS          | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E          | n/a      | n/a       | n/a        |

Unit breakdown: 97 (@mm/types) + 24 (@mm/sdk: 13 client + 9 keys + 2 hooks jsdom)

## Quality gates

| Gate            | Last status | Last run   |
| --------------- | ----------- | ---------- |
| pnpm lint       | ✅ green (7/7 packages) | 2026-05-03 |
| pnpm typecheck  | ✅ green (7/7 packages) | 2026-05-03 |
| pnpm test       | ✅ green (121/121 unit) | 2026-05-03 |
| pnpm build      | ✅ green (cached from Stage 1) | 2026-04-30 |
| RLS coverage    | ✅ 53/53 tables enabled + tested | 2026-05-03 |
| pnpm audit      | unknown — TODO measure | n/a |
| pnpm test:migration | ✅ green (roundtrip up→down→up, 10 migrations) | 2026-05-03 |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

## Open items

- ADRs accepted: 19 (ADR-0001 through ADR-0019)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/1
- Open questions: 0
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 ongoing Stage 15; DEV-20260503-2 ongoing v1.1)

## Notes for next session

**Stage 12 complete (2026-05-03):**
- packages/sdk: MmClient (raw fetch, no library), SDKResponse<T> wrapper (ADR-0019), APIError shape (X1).
- X-Trace-Id on all requests; response header preferred (X2). X-Client-Version = SCHEMA_VERSION (X3/G3).
- Idempotency-Key threading: mutations accept `{ idempotencyKey?: string }`; auto-generated via useRef; JSDoc warns not retry-safe without stable key (X3).
- MmClientProvider via React.createElement (no JSX, no tsconfig jsx change).
- 5 hook groups: identity, content, session, intelligence, orchestration (Q3 revision — no speculative stubs).
- mmKeys factory with .all()/.byId() hierarchy for 7 domains (X4).
- 24 SDK tests: 13 client (incl. X5 SCHEMA_VERSION drift guard), 9 keys, 2 hooks (jsdom).
- ADR-0019: SDKResponse<T> = { data: T; traceId: string } precedent for all future SDK methods.
- Lint fixes: removed useless try/catch (X1), dropped `_data` param from ack schemas (parse(): void).
- children?: ReactNode optional in MmClientProviderProps (createElement TS compatibility).
- Commit: 0c3b311

**ISSUE-0004 (open, low):** outbox_event 7-day cleanup. Stage 14 close. Add pg_cron job
`outbox.cleanup` DELETE WHERE processed_at < now() - interval '7 days'.

**Pre-existing partition RLS advisory:**
intelligence_audit_log_default + learning_event_default reported RLS-disabled by supabase db query.
These are pg_partman default partitions (Stage 5/6). Application code routes through parent tables
(RLS-enabled). Not a blocking issue.

**DEV-20260430-1:** ongoing, resolves Stage 15.
**DEV-20260503-2:** ongoing, resolves v1.1 (content.recalibration stub).

**cron.schedule() pattern (ADR-0017):** Stage 9 onwards uses cron.schedule() / cron.unschedule()
public API. Avoid direct INSERT into cron.job.

**Supabase remote project:** https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2)
