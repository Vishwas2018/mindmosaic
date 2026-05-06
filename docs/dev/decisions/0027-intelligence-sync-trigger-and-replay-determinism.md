# ADR-0027 — Intelligence Sync Trigger Model + Replay Determinism Discipline

- Status: accepted
- Date: 2026-05-08
- Stage: 20
- Tags: backend | data | security | dx

## Context

Stage 20 ships `intelligence-svc` and the synchronous L1+L2+L3a pipeline. Before
implementation, §2A pre-implementation review surfaced eight intertwined
questions that all relate to one cluster of decisions: **how the pipeline is
triggered, how it stays deterministic across replays, and how it is bounded
against re-processing by Stage 28's eventual jobs-worker.** Filing one ADR
keeps the trade-offs visible together rather than scattering them across seven
independent records.

The relevant authorities, with their tensions:

- **Spec §7.2 line 997** mandates that the synchronous portion (steps 1, 2, 3a)
  "must complete before submit response is returned" — direct inline coupling
  from `assessment-svc /submit` to `intelligence-svc /process-session/{id}`.
- **Spec §21.0.2 line 2877** prohibits "synchronous inter-service HTTP calls."
- **Arch §5.1 (M5-corrected) trigger flow** describes
  submit → outbox → dispatcher → worker → intelligence-svc — *async via outbox*.
- **Arch §4.5** lists `POST /intelligence/process-session/{id}` with `service`
  auth (no constraint on caller).
- **Arch §5.2** records idempotency keys (`foundation:{session_id}`,
  `behaviour:{session_id}`, `causal_scoped:{session_id}`) for retry de-dup.
- **Spec §7.4.2** stamps `algorithm_version` in every audit-log row for replay
  safety.
- **Spec §7.6** schema embeds `guess_probability` in the answer event's
  metadata — but `learning_event` is **immutable** per OWNERS.md (`assessment-svc`
  WRITE row).
- **Spec §8.1, §9.2–§9.5, §9.6, §10.2** define the formulas; §9.6 specifies
  the year-level-keyed defaults blend formula.
- **Existing migration 0010** wires a cron job that drains
  `outbox_event 'session.submitted'` rows into `job_queue 'pipeline.run_sync'`
  rows, but **`jobs-worker` is not built until Stage 28**. Without coordination,
  every submit produces an orphan job that Stage 28's worker would later
  re-execute against intelligence-svc — re-doing work and risking
  non-deterministic divergence if the algorithm has shipped a minor bump in
  between.
- **`distractor_rationale` JSON shape** is not specified by any spec table;
  the seed at `supabase/seeds/02_content.sql:357–364` is the de-facto schema.

This ADR resolves Q-20.3, Q-20.6, Q-20.7, Q-20.11, Q-20.12, Q-20.13, Q-20.15.
Q-20.1, Q-20.2, Q-20.4, Q-20.5, Q-20.8, Q-20.9, Q-20.10, Q-20.14 hold their
§2A defaults and live in `docs/dev/QUESTIONS.md`; they are referenced here
by number but not separately argued.

## Options considered

### A. Trigger model — inline HTTP from `/submit`

1. **Inline HTTP** (chosen). `assessment-svc/submit` HTTP-calls intelligence-svc
   between the `session_record` UPDATE and the response. On success →
   `pipeline_status='sync_complete'`. On any failure → keeps `'pending'`; the
   Stage 10 outbox dispatcher's `pipeline.run_sync` job becomes the retry path
   (Stage 28+ worker eventually picks it up). 4000 ms HTTP timeout to leave 1 s
   safety margin under `/submit`'s 5 s p95 budget.
2. **Outbox-only / dispatcher-mediated.** No inline call; Stage 28 worker does
   it all. Pros: consistent with §21.0.2 letter. Cons: violates §7.2 line 997
   (sync-before-submit-returns); also blocks Stage 20 exit criterion
   ("Sync p95 < 3s") since dispatcher cron is every minute (ADR-0018).
3. **Direct DB call** (intelligence logic embedded in assessment-svc). Cons:
   smashes the OWNERS.md write-ownership boundary; `intelligence-svc` becomes
   library code that ships nowhere.

### B. Re-processing idempotency strategy

1. **Audit-log dedup at handler entry** (chosen). intelligence-svc selects
   `intelligence_audit_log` rows for `(session_id, algorithm_version)`; if
   any row exists with `event_type='session.processed'`, returns 200
   `already_processed` without writing. Stage 28's worker will re-issue the
   same call after the inline run completes; the dedup makes that second call
   a no-op.
2. **Separate `intelligence_run_marker` table.** A purpose-built marker row
   per `(session_id, algorithm_version)`. Cleaner separation of concerns but
   adds a table for a problem the audit log already encodes.
3. **Trust UPSERT semantics + skip dedup.** Every write is UPSERT, so
   re-processing converges. But `learning_event` (Q-20.12=A: new event_type
   `'behaviour_signal'`) is append-only — UPSERT doesn't apply; second run
   would duplicate behaviour_signal rows, violating replay determinism.

### C. `guess_probability` storage location (Q-20.12)

1. **A — New `learning_event_type` enum value `'behaviour_signal'`** (chosen).
   Migration 0013 ALTERs the enum and INSERTs one new `learning_event` row per
   answer response carrying `metadata.guess_probability` (and other Layer 2
   per-response signals). Preserves `learning_event` immutability — new rows,
   not UPDATEs. One `learning_event_type` enum value covers all per-response
   L2 signals (current and future) without further migrations.
2. **B — Relax `learning_event` mutability for the metadata column.** UPDATE
   the answer row's metadata. Cheapest in code. Cons: violates OWNERS.md
   immutability invariant; sets a precedent that erodes the audit-log
   guarantee.
3. **C — Aggregate-only in v1.** Skip per-response storage; write only
   `behaviour_profile.avg_guess_rate`. Defer per-response to v1.1. Cons:
   contradicts DEV_PLAN Stage 20 deliverables ("per-response `guess_probability`
   in `learning_event.metadata`") and removes a signal teachers would benefit
   from in v1 (per-response guess flagging surfaces in §9.2's "take a break"
   nudge and teacher reports).

### D. `algorithm_version` format (Q-20.3)

1. **`intelligence-vN.M.P` semver string** (chosen). Initial `intelligence-v1.0.0`.
   Major bumps on output-shape changes (audit-log schema migration), minor on
   formula changes (e.g., adjusting weights in mastery formula §8.1), patch on
   bugfix (e.g., off-by-one in 14-day velocity window).
2. Hash-of-source-code. Pros: automatic; never forgotten. Cons: opaque to
   humans; breaks on whitespace edits; can't span engines/intelligence
   boundary cleanly.
3. Stage-tag (e.g., `stage-20`). Cons: collides on every minor formula tweak
   inside a stage.

### E. §21.0.2 reconciliation (Q-20.6)

1. **§7.2 wins as the more-specific section** (chosen). The submit→pipeline
   call is the *one* officially-blessed sync-inter-service-HTTP exception, and
   it is justified by §7.2's explicit "must complete before submit response is
   returned" sentence. §21.0.2's prohibition continues to bind every other
   inter-service call.
2. Reject §7.2 in favour of §21.0.2 → forces Option-A.2 in (A) above. See cons
   there.
3. Edit the spec to align. Out of scope for Stage 20; would require product-
   owner sign-off and is the kind of edit the BUILD_CONTRACT explicitly
   reserves for major version bumps of the spec.

### F. `distractor_rationale` shape (Q-20.11)

1. **Document the seed-de-facto shape**:
   `{ [choice_id: string]: { misconception_id: string } }` with absent entries
   for untagged choices (chosen, since seeds use `jsonb_strip_nulls`).
2. Define a richer schema with `explanation`/`severity`/etc. Out of scope;
   Stage 20 only consumes `misconception_id`.

### G. `intelligence_audit_log.input_snapshot` scope (Q-20.13)

1. **Per-skill aggregates** (chosen): `{ skills: [{ skill_id, attempts,
   correct, mastery_before, mastery_after, ... }] }` sorted by `skill_id ASC`.
   Hash-friendly; bounded; deterministic.
2. Full session_response payload. Cons: bloats partition; ordering of rows is
   non-deterministic without explicit sort.

### H. Sync HTTP timeout + error fallback (Q-20.15)

1. **4000 ms timeout, soft fail to `'pending'`** (chosen). Any timeout / 4xx
   / 5xx / network error → return submit success with `pipeline_status='pending'`
   and a logged warning; the outbox dispatcher's queued job becomes the retry
   path (Stage 28+).
2. Hard-fail the submit on intelligence-svc error. Cons: surfaces a
   non-user-facing concern (post-completion analytics) as a user-visible
   submit failure; the user already finished their session.

## Decision

- **Trigger model:** inline HTTP from `/submit` to
  `POST /intelligence/process-session/{id}` (option A.1). The submit→pipeline
  call is the §7.2-blessed exception to §21.0.2 (option E.1).
- **Re-processing idempotency:** audit-log dedup at handler entry on
  `(session_id, algorithm_version)` (option B.1).
- **`guess_probability` storage:** Q-20.12=A. Migration 0013 ALTERs
  `learning_event_type` enum to add `'behaviour_signal'`; one `learning_event`
  row INSERTed per response carrying L2 per-response signals in
  `metadata`. Preserves immutability (option C.A).
- **`algorithm_version`:** `intelligence-vN.M.P` semver, initial
  `intelligence-v1.0.0` (option D.1). Stored as a constant in
  `_shared/intelligence-helpers.ts`.
- **`distractor_rationale` shape:** seed-de-facto
  `{ [choice_id]: { misconception_id } }` codified here (option F.1).
- **`intelligence_audit_log.input_snapshot` scope:** per-skill aggregates,
  sorted by `skill_id ASC`, canonicalised (option G.1).
- **Sync HTTP timeout + fallback:** 4000 ms, soft fail to `'pending'`
  (option H.1).

## Rationale

The cluster makes sense together because every choice has to coexist with
**replay determinism** — Stage 20's hardest exit criterion. Replay determinism
demands that *running the same input twice produces byte-identical output*. The
audit-log dedup (B) prevents Stage 28's worker from running a second pass that
might use a bumped `algorithm_version` and diverge. The semver
`algorithm_version` (D) gives us the dedup key. The append-only-via-new-row
treatment of `guess_probability` (C.A) prevents the second pass from creating
duplicate `learning_event` rows. The audit-log input scope as sorted aggregates
(G) keeps the hash inputs deterministic. The 4 s timeout (H) draws the
boundary at which the inline path gives up cleanly to the queued retry path
without dragging the user-facing submit response down with it.

§21.0.2 is read as forbidding sync HTTP for *core flow* (request handling
within a service) — its placement in the "Service Interaction Rules" section
supports that reading. The submit→pipeline edge is post-completion analytics,
not core flow; §7.2 explicitly carves out this sync requirement and the
3 s SLA depends on it. We treat this as the lone exception and are explicit
about the boundary.

Q-20.12=A was chosen over the cheaper relax-immutability path (B) because
`learning_event` is the *only* per-response audit trail in the system; relaxing
its immutability invariant is the kind of decision that takes years to
re-tighten. The aggregate-only path (C) was rejected because per-response
guess flagging is a v1 user-visible feature (§9.2 "take a break" nudge,
teacher report flagging) and deferring it to v1.1 means shipping v1 without
a load-bearing teacher signal. Migration 0013 is small (one ALTER TYPE),
fully covered by the existing pgTAP suite pattern, and irreversible only in
the sense that v1.1 may add additional event_types — never remove this one.

## Consequences

### Positive

- One source of truth for the seven decisions; reviewers see the trade-offs
  together, not scattered across seven mini-ADRs.
- Replay determinism is achievable: dedup + canonicalised inputs + UPSERT
  writes + append-only-via-new-row.
- Stage 28 worker pickup of the orphan jobs is provably a no-op without
  any worker-side logic — the dedup lives in intelligence-svc and is
  agnostic to caller.
- `learning_event` immutability invariant survives Q-20.12.

### Negative

- The §21.0.2 exception is now codified; future stages adding
  inline-inter-service-HTTP must also extend this ADR (or supersede it),
  not silently broaden the door.
- `algorithm_version` must be hand-bumped on every formula change. Forgetting
  to bump means a new run with new behaviour gets de-duplicated against the
  old run — a silent correctness bug. Mitigation: add a CI check post-Stage 26
  that grep-asserts the constant is referenced in any commit touching
  intelligence formula files.
- Migration 0013 needs `pnpm test:migration` against Docker locally before
  deploy (sandbox lacks Docker — same caveat as 0012).

### Follow-ups

- **Stage 28** (jobs-worker): the worker calling
  `POST /intelligence/process-session/{id}` will hit the audit-log dedup; no
  worker-side logic needed.
- **Stage 26** (load test + replay determinism): the dedicated replay-
  determinism integration test must verify byte-identical output across
  two consecutive inline runs. Stage 20 ships this test; Stage 26 extends to
  50 sessions.
- **v1.1**: if more L2 per-response signals emerge, they live in the same
  `'behaviour_signal'` event_type with new `metadata` keys — no further
  enum migration needed.
- **`algorithm_version` bump policy** must be added to BUILD_CONTRACT next
  time it is opened (post-Stage 27 Phase 1 review).

## Implementation notes

Files (Stage 20 implementation):
- `supabase/migrations/0013_behaviour_signal_event_type.sql` (+ down)
- `supabase/functions/intelligence-svc/{index.ts, handlers.ts, package.json,
  tsconfig.json, __tests__/contract.test.ts}`
- `supabase/functions/_shared/intelligence-helpers.ts`
  (`canonicalize`, `sortBySkillId`, `walkPrereqsDepth1`, `ALGORITHM_VERSION`,
  `yearLevelDefaults`)
- `supabase/functions/assessment-svc/handlers.ts` (`submitSession` patch +
  inline HTTP call to intelligence-svc with 4 s timeout)
- `supabase/functions/assessment-svc/__tests__/contract.test.ts` (sync_complete
  / pending fallback / re-process idempotency tests)
- `apps/web/playwright/e2e/session-flow.spec.ts` (assert
  `pipeline_status='sync_complete'`)

Commit: TBD (Stage 20 implementation commit).
Related: Q-20.1..15 (resolved), ADR-0017 (cron policy), ADR-0018 (cron cadence),
ADR-0023 (EngineState union), ADR-0026 (lock-token rotation),
ISSUE-0005 (env hygiene — separate concern).
