# ADR-0026 — Lock-token rotation per respond (assessment-svc)

- Status: accepted
- Date: 2026-05-08
- Stage: 19
- Tags: backend | concurrency

## Context

Spec §3.4 establishes the session state machine and §3.6.2 specifies that
`POST /sessions/{id}/respond` carries an `expected_version` field tied to
the optimistic lock on `session_record.version`. Arch §4.4 lists
`X-Session-Lock` as a required header on `/respond`. The schema already
provides the column (`session_record.lock_token uuid`,
`0004_sessions_events.sql:48`), and `@mm/types/src/session.ts` exposes
`lock_token: string` on `CreateSessionResponse` and `SessionStateDTO`.
Neither spec nor arch pins down the **lifecycle** of the token: single
issuance at create vs rotation per respond vs time-windowed rotation.

The single-active-session invariant (spec §3.4 + DB partial unique index
`idx_session_one_active`) is the primary correctness rail. A stale tab
holding a token from before a successful respond can still POST a
duplicate response — `expected_version` will catch it on most paths, but
NOT on /checkpoint (which never bumps version per ADR-C3) and NOT on
/abandon (terminal transition, no version-gated read). The token is the
secondary rail that closes those gaps.

Stage 19 is also the first of several v1 services that need the same
shape (assignments-svc Stage 27+, billing-svc Stage 42+ for resumable
checkout). Codifying the rotation rule as a service pattern now avoids
re-litigating it per service.

## Options considered

1. **Single token at create, valid for full session.** Pros: simpler
   client code; one round-trip for token at session start. Cons: stale
   tab can still hit /checkpoint or /abandon with an outdated state-of-
   world; no defence-in-depth beyond `expected_version`.
2. **Rotate token on every successful create / respond / resume.** Pros:
   stale-tab requests fail fast at the lock check before any DB write;
   defence-in-depth on /checkpoint and /abandon; cheap (one column update
   already happening as part of the response RPC, plus an extra UPDATE
   for non-RPC paths). Cons: client must thread the new token through;
   extra surface in every response DTO (already present in
   `RecordResponseResponse.lock_token`? — no, only in Create/State; needs
   widening).
3. **Time-windowed token (rotate every N seconds).** Pros: bounds stale-
   tab window without per-request rotation. Cons: arbitrary N; clock-
   sync issues; no real concurrency benefit over Option 2.

## Decision

Use **Option 2.** Server rotates `lock_token` on every successful
`/sessions/create`, `/sessions/{id}/respond`, and `/sessions/{id}/state`
(resume). Client echoes the current token via `X-Session-Lock` on
`/respond`, `/checkpoint`, `/abandon`. Mismatch returns
`409 LOCK_CONFLICT`.

## Rationale

- Defence-in-depth at the **request boundary** (cheap header check)
  before incurring the cost of `expected_version` validation inside the
  RPC. Catches stale-tab POSTs without consuming a connection-level
  lock.
- Closes the gap on /checkpoint and /abandon, neither of which is
  protected by `expected_version`.
- Aligns with the single-active-session invariant: a session has exactly
  one valid live token at any instant; replays of an old token fail
  unambiguously.
- Reuses the existing `session_record.lock_token` column — no migration.
- Establishes a service pattern for assignments-svc (Stage 27+) and any
  other Edge Function that owns resumable per-user state.
- Cost is bounded: one extra DB write per non-RPC mutation path
  (/checkpoint, /abandon, /resume); on the /respond hot path the token
  rotation can ride on the same UPDATE the widened RPC already performs
  (Q-19.1).

## Consequences

- **Positive:** stale-tab double-submit fails at the gateway, not the
  RPC. /checkpoint and /abandon get the same protection /respond has via
  `expected_version`. Service pattern documented for Stages 27+, 42+.
- **Positive:** `RecordResponseResponse` gains a `lock_token: string`
  field — clients always know the next valid token without a separate
  /state round-trip.
- **Negative:** clients must thread the new token through every request.
  SDK should hide this behind a session handle so callers don't manage
  it manually. This adds one item to the Stage 22+ frontend surface.
- **Negative:** `RecordResponseResponseSchema` in `@mm/types/src/session.ts`
  needs widening (add `lock_token: z.string()`). One-line change with
  consumer impact only at the test surface in v1.
- **Follow-ups:**
  - Stage 19: implement rotation in assessment-svc handlers; widen
    `RecordResponseResponseSchema`.
  - Stage 22+: SDK convenience wrapper that auto-threads `X-Session-Lock`
    + `expected_version` so the React hook layer doesn't see them.
  - Stage 27 assignments-svc: inherit this pattern for `/assignments/{id}/start`
    and any future resumable assignment state.
  - Stage 42+ billing-svc: apply the same rotation to resumable checkout
    sessions if Stripe's idempotency story isn't sufficient.

## Implementation notes

Files (Stage 19 commit): `supabase/functions/assessment-svc/handlers.ts`,
`supabase/functions/assessment-svc/index.ts`,
`packages/types/src/session.ts` (widen `RecordResponseResponseSchema`).
Commit: <Stage 19 single atomic commit, sha tbd>.
Related: ADR-0016 (service-owned state machine), ADR-0019 (SDK envelope),
spec §3.4 / §3.6.2, arch §4.4. Q-19.4 in `docs/dev/QUESTIONS.md`.
