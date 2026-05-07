# ADR-0030 — Offline persistence shape: in-memory queue for v1; IndexedDB + service worker deferred to v1.1

- Status: accepted
- Date: 2026-05-13
- Stage: 23
- Tags: frontend | offline | a11y

## Context

Stage 23 (Exam Engine) is the highest-risk v1 UI per DEV_PLAN.md:618
and the merge-blocker a11y gate per UI_CONTRACT §7.1. UI_CONTRACT §5.1
calls for an offline-resilient flow:

- Service worker caches the session shell.
- Responses queued to IndexedDB with idempotency keys.
- `OfflineBanner` visible at bottom of screen.
- Reconnect replays queue; on success, shows toast "Synced".
- **Do not block the user from answering while offline.**

DEV_PLAN.md Stage 23 risk note states explicitly: *"If slipping,
simplify offline queue (accept minimal replay) but DO NOT compromise
a11y gate."* The 3-day budget is for the whole Exam Engine surface,
not for offline alone. A full IndexedDB queue + service worker shell
cache is ~1.5 days of work on its own (queue helper + idempotency-key
dedup contract test + service worker registration + shell-cache
strategy + reconnect replay + e2e verification of the disable-network
flow). Spending half the stage on offline plumbing while a11y is the
non-negotiable exit criterion (axe-core zero serious/critical on every
question state, keyboard-only 30-item completion) inverts the priority
DEV_PLAN sets.

Stage 22b's §2A walkthrough already proved the value of surfacing
plumbing-vs-screens scope before coding (DEV-20260511-1). The same
discipline applies here: lock the offline-shape decision in writing
before any line of Exam Engine code is written, so the shape can't
quietly grow during implementation.

There is no prior ADR pinning the offline shape. Arch v2.0 §5.3
(degraded mode) names "stale data, queued writes, replay on reconnect"
as the v1 contract but doesn't pin the persistence layer.

## Options considered

### A. Full IndexedDB queue + service worker with shell-cache + replay-on-reconnect with idempotency-key dedup

Closest to the UI_CONTRACT §5.1 description. Uses
`navigator.serviceWorker.register('/sw.js')` with a runtime caching
strategy for the session shell + a queue-replay strategy for
`/respond` POSTs. IndexedDB stores `{idempotency_key, body, attempts}`
per queued respond; reconnect drains the queue oldest-first.

Pros:
- Survives page reload during offline (queue is persistent).
- Survives browser restart during offline.
- Closest to the spec's literal text.

Cons:
- ~1.5 days of work on its own (queue lib + service worker + shell
  cache + idempotency dedup contract + replay e2e). Forces compression
  of a11y polish + the QuestionMap component into 1.5 days, which is
  exactly what DEV_PLAN's risk note warns against.
- Service worker introduces a class of bugs (stale shell, registration
  flakes during dev, scope mismatches under Next 14 App Router) that
  v1 does not need.
- IndexedDB itself is fine, but pairing it with service worker for
  shell caching is the part that bloats.

### B. In-memory queue + `online`/`offline` event listeners + replay on reconnect with idempotency-key dedup *(chosen)*

A small in-memory `Array<QueuedRespond>` lives on the Exam Engine
page (or a context just under it). Each `/respond` attempt gets an
idempotency key generated up-front; on `navigator.onLine === false`
or an explicit network failure, the call is queued and the page shows
the `OfflineBanner` at the bottom. Question display + option selection
remain interactive (per UI_CONTRACT §5.1: "Do not block the user from
answering while offline"). On `window.addEventListener('online', ...)`,
the queue drains oldest-first via the existing `useRecordResponse`
hook; idempotency keys prevent duplicate writes if the network blip
flapped.

Pros:
- Fits in ~0.5 day. Leaves 2.5 days for the Exam Engine surface
  proper, where a11y + question map + timer + autosave + submit
  dialog actually live.
- No new infrastructure (no IndexedDB helper, no service worker, no
  next-pwa). The implementation is a `useState` + two effect
  listeners + a `useRef` queue + a small `OfflineBanner` component.
- Idempotency-key contract is preserved — Stage 19 already enforces
  dedup at assessment-svc, so the queue doesn't introduce a new dedup
  surface.
- No service-worker class of bugs.

Cons:
- **Page reload during offline = lost queue.** This is the only real
  loss vs option A. Acceptable given:
  - DEV_PLAN explicitly permits "simplified offline queue (accept
    minimal replay)".
  - Exam takers don't typically reload mid-exam — the autosave
    pattern (every 30s + on blur) means the worst case is losing
    the last < 30s of in-flight respond writes.
  - The session resume flow (`GET /sessions/{id}/state`, Stage 19)
    rehydrates the working item and version on next mount, so a
    page reload during offline produces a cold cache but a correct
    resume path once back online.
- Survival across browser restart requires the user to reopen and
  click resume; this is a degradation, not a corruption.

### C. No queue; show OfflineBanner and disable Submit until reconnect

Strictly: blocks user from answering while offline. Violates
UI_CONTRACT §5.1's "Do not block the user from answering while
offline" rule. Also fails DEV_PLAN exit criterion: *"Offline:
disable network mid-session, answer 3 items, re-enable, verify
replay."* Rejected.

## Decision

Use **Option B**: in-memory queue + `online`/`offline` event
listeners + replay on reconnect with idempotency-key dedup. No
IndexedDB. No service worker. Persistence across page reload during
offline is **not provided in v1** (deferred to v1.1 via ISSUE-0009).

Concrete shape:
1. Stage 23 ships a small `useResponseQueue` hook (or inline state)
   in `apps/web/src/components/exam/`. Public API:
   `enqueue(request)` (called by the page when `/respond` is
   attempted), `flush()` (auto-called on `online` event), and a
   read-only `pendingCount` for the OfflineBanner microcopy.
2. Idempotency keys are generated up-front per respond attempt
   (already supported by SDK `useRecordResponse` per Stage 19 X3
   contract). The queue stores
   `{ idempotency_key, request: RecordResponseRequest, attempts: number }`.
3. The page uses `navigator.onLine` for the initial banner state and
   `window.addEventListener('online' | 'offline', ...)` for
   transitions.
4. Drain order: FIFO. On replay, each queue item retries via the
   same `useRecordResponse.mutate(...)`; success removes from queue,
   failure increments `attempts` and bails on a hard error (e.g.
   `/respond` returns 410 GONE → session abandoned modal).
5. Stage 21 hardening pattern (sentinel + `finally`) is the model
   for not wedging the queue on transient failure.
6. **Page reload during offline** is documented in the user-visible
   `OfflineBanner` microcopy: "Working offline — answers saved
   locally. Don't reload this page until reconnected." This is the
   one v1 caveat.
7. **`Saved` pill semantics**: shows after a successful `/respond` or
   `/checkpoint` flush. Hidden during offline-queue residence.

Out of scope for this ADR (and Stage 23):
- IndexedDB queue persistence (ISSUE-0009).
- Service worker shell cache (ISSUE-0009).
- Cross-tab synchronisation.
- Offline submit-at-zero behaviour beyond "queue submit, replay on
  reconnect" — Q-23.5 default.

## Rationale

DEV_PLAN risk note + UI_CONTRACT §7.1 a11y gate together make the
priority order unambiguous: a11y > offline-resilience > offline-
persistence. Option B preserves a11y compliance, satisfies the
DEV_PLAN exit criterion ("answer 3 offline items, replay on
reconnect"), and leaves the Stage 23 budget intact for question map
+ submit dialog + e2e. The single real loss (page-reload during
offline) is a graceful degradation already handled by the resume
flow + autosave cadence.

The risk-cushion language in DEV_PLAN was authored precisely for
this choice. Spending the buffer days on offline-persistence rather
than a11y would invert the stage's stated priority.

## Consequences

### Positive

- Stage 23 keeps its 3-day budget for the surface that actually
  determines the exit criteria (a11y + question map + timer +
  autosave + submit-confirm).
- `OfflineBanner` + queue + replay are testable in isolation
  (mock `navigator.onLine`, fire `online` event, assert queue
  drains, assert `Saved` pill appears).
- No service-worker class of bugs in v1.
- Clear v1.1 upgrade path via ISSUE-0009 (replace the in-memory
  queue with an IndexedDB queue behind the same `useResponseQueue`
  API; add `next-pwa` shell cache).

### Negative

- **Page reload during offline loses the queue.** Documented in
  `OfflineBanner` microcopy. Mitigated by autosave (every 30s + on
  blur) so worst-case loss is < 30s of in-flight respond writes.
- v1 doesn't cache the session shell — first load requires network.
  Acceptable: students who go offline mid-session already have the
  shell loaded; first-load offline isn't a v1 use case.
- ISSUE-0009 is now load-bearing for v1.1 acceptance; must be
  surfaced in v1.1 planning.

### Follow-ups

- **ISSUE-0009** (filed alongside this ADR): upgrade to IndexedDB
  queue + service worker shell cache in v1.1. Public API
  (`useResponseQueue.enqueue` / `.flush` / `.pendingCount`) stays
  stable; only the storage layer swaps.
- Stage 26 load test (DEV_PLAN.md:271) should include an
  online-flap simulation to verify queue drain under realistic
  jitter.
- Documentation note in `apps/web/src/components/exam/`
  `useResponseQueue.ts` JSDoc: "v1 in-memory only; v1.1 swaps for
  IndexedDB per ISSUE-0009 + ADR-v1.1-N."

## Implementation notes

Files (Stage 23 implementation):
- `apps/web/src/components/exam/useResponseQueue.ts` — hook with
  enqueue / flush / pendingCount + `online`/`offline` listeners.
- `apps/web/src/components/exam/OfflineBanner.tsx` — bottom-of-
  screen banner with microcopy and `pendingCount` indicator.
- `apps/web/src/app/(student)/session/[id]/exam/page.tsx` — wires
  the queue between the question form and `useRecordResponse`.

Commit: see Stage 23 implementation commit (`feat(web,ui)`).
Related: arch §5.3 (degraded mode), UI_CONTRACT §5.1 (exam engine
contract), DEV_PLAN.md:240-247 (Stage 23 deliverables + risk note),
ISSUE-0007 (lock-token plumbing — separately tracked),
ISSUE-0008 (error-code surface — separately tracked),
ISSUE-0009 (IndexedDB + SW upgrade in v1.1, filed alongside this
ADR).
