# QUESTIONS.md — open questions for spec/product owner

> Resolved → ## Resolved with answer + date.
> Use the template from CLAUDE.md §Templates.

## Open

<!-- none -->

## Resolved

### Q-19.13 — Mock-Supabase Proxy reuse strategy

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: Stage 18 `content-svc/__tests__/contract.test.ts:54–82`
- Question: Copy-paste the callable-Proxy mock into assessment-svc tests, or hoist
  to a shared `_test-helpers/` module?
- Why ambiguous: First reuse instance — DRY vs co-location is a judgement call.
- Blocking? no
- Code affected: `supabase/functions/_test-helpers/`,
  `supabase/functions/content-svc/__tests__/contract.test.ts`,
  `supabase/functions/assessment-svc/__tests__/contract.test.ts`
- Status: resolved
- Resolution (2026-05-08): Hoist to `supabase/functions/_test-helpers/mock-supabase.ts`.
  content-svc test imports from there (no behaviour change). DRY beats co-location
  with two consumers; test-only utility, no runtime impact.

### Q-19.12 — `@mm/assessment-svc` package script set

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: Stage 18 precedent (`@mm/content-svc`); BUILD_CONTRACT §9
- Question: Should assessment-svc have lint/build scripts in addition to typecheck/test?
- Why ambiguous: Edge Function packages deploy via Supabase CLI, not pnpm build.
- Blocking? no
- Code affected: `supabase/functions/assessment-svc/package.json`
- Status: resolved
- Resolution (2026-05-08): typecheck + test only. Matches content-svc; no value in
  adding lint that wasn't there for content-svc. ESLint not configured for Edge
  Function code in v1.

### Q-19.11 — Rate-limit bucket key shape

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: arch §4.13; `0011_rate_limit_fn_outbox_cleanup.sql:9` `fn_check_rate_limit`
- Question: Bucket key format for `/sessions/respond` etc — composite endpoint:scope
  string vs structured?
- Why ambiguous: arch §4.13 specifies limits but not key shape.
- Blocking? no
- Code affected: `supabase/functions/_shared/rate-limit.ts` callers in
  assessment-svc handlers
- Status: resolved
- Resolution (2026-05-08): `<endpoint>:<student_id>` as `bucket_key` text;
  `window_start = date_trunc('minute', now())`. Matches existing
  `fn_check_rate_limit(p_bucket_key, p_window_start, p_limit)` signature and
  `rate_limit_bucket(bucket_key, window_start)` PK.

### Q-19.10 — Stage 19 commit boundary

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: BUILD_CONTRACT §11.1 (one stage = one atomic commit)
- Question: Single atomic commit or split (migration separately, then svc + e2e)?
- Why ambiguous: Stage 19 is 2 days of work touching migration, _shared/,
  assessment-svc, apps/web Playwright — large diff.
- Blocking? no
- Code affected: git history
- Status: resolved
- Resolution (2026-05-08): Single atomic commit per BUILD_CONTRACT §11.1. Stage
  atomicity over PR-size aesthetics. Pre-implementation artefacts (this commit:
  ADR-0026, QUESTIONS resolutions, C-C-D-V archive) are doc-only and travel in
  a separate `chore(stage-19)` commit ahead of the implementation.

### Q-19.9 — Playwright setup scope for first e2e

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: DEV_PLAN.md Stage 19 deliverables ("Playwright e2e — signup → session
  create → 5 responses → submit → score returned")
- Question: Full Playwright setup (devDep + config + browser install + spec)
  or minimal SDK-CLI substitute?
- Why ambiguous: First e2e adds substantial setup overhead for a single happy-path.
- Blocking? no
- Code affected: `apps/web/package.json`, `apps/web/playwright.config.ts`,
  `apps/web/playwright/e2e/session-flow.spec.ts`
- Status: resolved
- Resolution (2026-05-08): Full Playwright setup. DEV_PLAN explicitly lists the
  e2e as a deliverable; the config + spec is reusable across Stages 22–25 frontend
  stages. CI integration deferred to Stage 26 (load-test stage). Browser install
  via `pnpm exec playwright install chromium`, documented at evening close.

### Q-19.8 — First-item provisioning model on `/sessions/create`

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: DEV_PLAN.md Stage 19 ("atomic write of session_record + first item");
  spec §3.6.1 `CreateSessionResponse`
- Question: Single multi-step DB transaction (across HTTP to content-svc) or
  multi-phase with idempotency-key + partial-unique-index as safety net?
- Why ambiguous: Edge Functions can't easily span a DB transaction across an
  HTTP call to another service.
- Blocking? no
- Code affected: `supabase/functions/assessment-svc/handlers.ts` createSession
- Status: resolved
- Resolution (2026-05-08): Multi-phase, with idempotency-key + the existing
  `idx_session_one_active` partial unique index (`0004_sessions_events.sql:76`)
  as the safety net. INSERT session_record(status=created) → HTTP /content/select
  → UPDATE engine_state + transition to active → return first item. Duplicate
  create via stale tab fails on the partial unique index; replay of the same
  Idempotency-Key returns the cached response.

### Q-19.7 — content-svc call from session-create

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: spec §21.0.2 ("No synchronous inter-service HTTP calls"); Stage 18
  Q-18.8 (content-svc `/content/select` is service-role only)
- Question: HTTP fetch to content-svc `/content/select` (sync) or inline the
  selection logic into assessment-svc?
- Why ambiguous: spec §21.0.2 prohibits sync inter-service HTTP for *core flow*;
  session-create is a one-off boundary call.
- Blocking? no
- Code affected: `supabase/functions/assessment-svc/handlers.ts` createSession
- Status: resolved
- Resolution (2026-05-08): HTTP fetch to content-svc with `x-mm-service-role`
  header (env: `SUPABASE_SERVICE_ROLE_KEY`). Mirrors Stage 18 contract; avoids
  forking the selection handler. session-create is a one-off (5/min rate limit
  per arch §4.13) so the round-trip cost is bounded. If perf concerns surface
  under load (Stage 26), revisit and inline.

### Q-19.6 — EngineState boundary parse on read

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: ADR-0023 (EngineState discriminated union); CLAUDE.md (Zod at every
  API boundary)
- Question: `EngineStateSchema.parse()` on every read of
  `session_record.engine_state_snapshot`, or trust the DB and cast?
- Why ambiguous: Edge Function is the only writer (Pattern G RLS), so a cast
  is *technically* safe; but the discipline elsewhere is parse-on-boundary.
- Blocking? no
- Code affected: `supabase/functions/assessment-svc/handlers.ts` (every handler
  that reads engine state)
- Status: resolved
- Resolution (2026-05-08): `EngineStateSchema.parse()` on every read. ~1ms cost
  per respond; well within BUILD_CONTRACT §10 budget. Boundary discipline is
  uniform across the codebase; carving an exception here invites drift.

### Q-19.5 — Optimistic-lock failure semantics on `/respond`

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: DEV_PLAN.md Stage 19 exit criterion ("Version conflict surfaces 409");
  `create_session_response_atomic` raises `VERSION_CONFLICT` (P0001)
- Question: Surface 409 to client (client refreshes via /state and retries) or
  server-side retry?
- Why ambiguous: Server retry could mask transient races, but also masks genuine
  concurrent-tab bugs.
- Blocking? no
- Code affected: `supabase/functions/assessment-svc/handlers.ts` respondToSession
- Status: resolved
- Resolution (2026-05-08): Surface 409 `CONFLICT`. Client must GET /sessions/{id}/state
  and retry with the refreshed version + lock_token. Per DEV_PLAN exit criterion
  named test. Server-side retry would paper over genuine concurrent-tab bugs.

### Q-19.4 — Lock-token rotation lifecycle

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: arch §4.4 (`X-Session-Lock` required header); spec §3.4 (single-active-
  session invariant); `session_record.lock_token uuid` column already present
- Question: Single token at create vs rotate per respond vs time-windowed rotation?
- Why ambiguous: Spec/arch reference the column but don't pin lifecycle.
- Blocking? no (defaults to single-token if not addressed, but weakens
  /checkpoint and /abandon)
- Code affected: `supabase/functions/assessment-svc/handlers.ts`,
  `packages/types/src/session.ts` (`RecordResponseResponseSchema` widening)
- Status: resolved
- Resolution (2026-05-08): Rotate `lock_token` on every successful create /
  respond / resume. Client echoes via `X-Session-Lock`; mismatch → 409
  `LOCK_CONFLICT`. Codified as a service pattern in **ADR-0026** for inheritance
  by assignments-svc (Stage 27+) and billing-svc (Stage 42+).

### Q-19.3 — Idempotency middleware vs in-handler

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: arch §7.3 (Idempotency Flow); `api_idempotency_key` table at
  `0004_sessions_events.sql:164`
- Question: Build a reusable `_shared/idempotency.ts` middleware or implement
  in-handler per endpoint?
- Why ambiguous: First idempotency-bearing service in v1 — pattern not yet
  established.
- Blocking? no
- Code affected: `supabase/functions/_shared/idempotency.ts` (NEW),
  `supabase/functions/assessment-svc/index.ts`
- Status: resolved
- Resolution (2026-05-08): `_shared/idempotency.ts` middleware
  `withIdempotency(client, req, tenantId, endpoint, handler) → Response` per
  arch §7.3. Reusable for assignments-svc (Stage 27+), billing-svc (Stage 42+),
  orchestration-svc.

### Q-19.2 — Sync pipeline trigger in `/submit` (Stage 19 vs Stage 20 split)

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: DEV_PLAN.md Stage 19 deliverables ("/submit writes outbox_event +
  invokes sync pipeline inline"); spec §21.0.2 ("No synchronous inter-service
  HTTP calls"); arch §4.5 (`/intelligence/process-session/{id}` service-role
  inline from submit); Stage 20 owns intelligence-svc
- Question: Stage 19 invokes intelligence-svc inline (with stub), behind feature
  flag, best-effort, or outbox-only?
- Why ambiguous: intelligence-svc doesn't exist until Stage 20; spec §21.0.2 vs
  arch §4.5 wording reads contradictory at first glance.
- Blocking? yes (changes /submit's response shape and the e2e assertion)
- Code affected: `supabase/functions/assessment-svc/handlers.ts` submitSession,
  e2e spec
- Status: resolved
- Resolution (2026-05-08): Outbox-only for Stage 19; no intelligence-svc stub.
  `/submit` writes `outbox_event` with `aggregate_type='session_record'`,
  `event_type='session.submitted'`, returns `pipeline_status='pending'`. e2e
  asserts the outbox row exists with `processed_at IS NULL`. Stage 20 wires the
  inline sync HTTP call and flips `pipeline_status` to `'sync_complete'`.

### Q-19.1 — Persisting `engine_state_snapshot` on `/respond` atomically

- Date raised: 2026-05-08 (Stage 19 §2A)
- Asked of: self
- Source: `create_session_response_atomic` at `0004_sessions_events.sql:287`
  does not write `engine_state_snapshot`; replay determinism (DEV_PLAN Stage 26)
  requires engine-state ↔ session-response atomicity
- Question: Add a second non-atomic UPDATE, widen the RPC signature, or add a
  separate version-checked update RPC?
- Why ambiguous: RPC predates engines (Stage 4); atomicity vs migration churn
  tradeoff.
- Blocking? yes (replay determinism gate at Stage 26 depends on this)
- Code affected: `supabase/migrations/0012_assessment_svc_rpc_widen.sql` (NEW),
  `supabase/functions/assessment-svc/handlers.ts` respondToSession
- Status: resolved
- Resolution (2026-05-08): Migration 0012 widens the RPC signature to take
  `p_engine_state jsonb` as the 11th parameter; UPDATE clause writes
  `engine_state_snapshot = p_engine_state` in the same transaction as the
  version bump. Down migration restores the Stage 4 10-arg signature. pgTAP
  roundtrip extends to 12/12.

### Q-0001 — shadcn/ui integration approach for packages/ui

- Date raised: 2026-05-03 (Stage 13)
- Asked of: product owner
- Source: CLAUDE.md tech stack "Tailwind + shadcn/ui" vs BUILD_CONTRACT §9 (no shadcn reference)
- Question: Should Stage 13 primitives be built via (A) shadcn CLI vendoring, (B) Radix UI deps
  directly, or (C) pure Tailwind + React?
- Why ambiguous: shadcn is a codegen CLI, not a runtime dep. Our token system diverges heavily from
  shadcn defaults. Arch and BUILD_CONTRACT don't mention shadcn directly.
- Blocking? yes
- Assumed answer if proceeding: Option B (Radix directly)
- Code affected: all of packages/ui/src/
- Status: resolved
- Resolution: Option B approved by product owner 2026-05-03. Radix is the headless a11y layer
  shadcn wraps. Custom token system gains nothing from shadcn defaults. Lower dep graph, no CLI
  registry, identical a11y. ADR-0020 filed. CLAUDE.md tech stack updated to "Tailwind + Radix UI
  primitives". Commit: Stage 13 commit.
