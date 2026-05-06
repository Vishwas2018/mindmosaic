# ADR-0028 — Skill-graph cache: in-flight dedup + stale-while-revalidate

- Status: accepted
- Date: 2026-05-09
- Stage: 21
- Tags: backend | performance | production-hardening

## Context

Stage 18 shipped `supabase/functions/_shared/skill-graph-cache.ts` with the
shape arch §9.3 calls for: module-scope cache, 1h TTL ceiling, single-row
watermark check on every request, pure-function loader pattern. Five contract
tests cover cold load, warm hit, watermark mismatch, TTL expiry, and the
no-published-graph case. Two of those carry the DEV_PLAN exit-criterion
labels Stage 18 was gated on.

Stage 21's brief (DEV_PLAN.md Day 26) is **production hardening**, not
greenfield. The §2A pre-implementation review surfaced two real-world
concerns that the Stage 18 tests don't cover:

1. **Concurrent cold-start.** Two requests hit a fresh worker
   simultaneously. Both observe `cache === null`; both call
   `loadGraphData()`. The DB takes ~50–100 ms to return the graph; both
   loads run in parallel; the second to finish overwrites the first
   identically. **Cost**: one extra DB round-trip per worker per cold start
   (rare under steady state, common under autoscale/restart). **Risk**: in
   pathological scaling events (e.g., 50 cold workers spinning up in 1 s),
   N redundant graph loads simultaneously. Bounded but not zero.

2. **Partial-failure semantics.** `loadActiveVersion()` succeeds and
   returns a *new* watermark (genuine publish event, or transient DB
   quirk); `loadGraphData()` fails (network blip, RLS misconfig, temporary
   permission lapse). Today the cache is left as-is silently, the caller
   sees the throw, and the request fails. The *previous* cache (which was
   correct ~5 minutes ago) is discarded with no fallback path.

Neither is a release-blocker per arch §9.3 — the cache works correctly in
the common path. Both are the kind of v1.0 gap that surfaces as a
production incident the first time it matters. Stage 21 is the right
stage to address them: the module is bounded, the test harness exists,
and the change is small.

The §2A review also surfaced a third question — whether intelligence-svc
L3a (Stage 20) should migrate to read skill-graph data through the cache
instead of querying `skill_edge` directly. **That question is closed at
Q-21.1 = NO** (scope discipline) and tracked separately as **ISSUE-0006**;
this ADR is silent on it.

## Options considered

### A. Concurrent cold-start dedup (Q-21.3)

1. **In-flight Promise sentinel** (chosen). When `getSkillGraph` enters
   the load path with `cache === null`, store the load promise in a
   module-scope `loadingPromise` slot. Subsequent concurrent calls observe
   the in-flight promise and `await` it, returning the same resolved
   cache. Cleared once the load resolves (or rejects). Cost: ~10 lines of
   code. No external coordination; per-worker only.
2. **Mutex / lock.** Heavier; same effect; adds complexity.
3. **Accept the redundant load.** Cheapest; documented as a v1
   approximation. Cons: visibility into the issue is lost; the next time
   it bites is in production at 3 AM.

### B. Stale-while-revalidate on `loadGraphData` failure (Q-21.4)

1. **Retain prior cache + structured `console.warn`** (chosen). When
   `loadGraphData(newGraphVersionId)` throws but a prior cache exists,
   keep the prior cache, emit `console.warn({ event: 'skill_graph_stale_revalidate_failed', ... })`, and return the prior cache from this call. Future calls
   re-attempt the watermark check + load. The cache becomes stale for as
   long as the load failure persists; once the next call succeeds, the
   cache catches up. Behaviour mirrors HTTP `stale-while-revalidate`.
2. **Fail-fast (current behaviour).** Throws on every load failure;
   caller sees 500. Pros: no stale data ever. Cons: a transient blip
   takes the whole service down for the duration.
3. **Stale-only (no warn).** Same as 1 but silent. Cons: load failures
   become invisible; ops can't detect them.

### C. Out of scope for this ADR

- **intelligence-svc L3a migration to use the cache** — Q-21.1 = NO,
  tracked as ISSUE-0006. Stage 28 (jobs-worker) or a small dedicated
  pre-launch stage.
- **Multi-tenant cache scoping** — v1 has one published graph per
  platform; tenant-scoped cache is YAGNI until a future stage
  introduces per-tenant graph variants.

## Decision

- **Concurrent cold-start dedup**: in-flight Promise sentinel (option A.1).
- **Partial-failure semantics**: stale-while-revalidate with structured
  `console.warn` on `loadGraphData` failure when a prior cache exists
  (option B.1).
- **trace_id propagation**: include `trace_id` in the warn payload when
  the caller passes one. Loader/cache surface gains an optional
  `traceId` parameter; defaults to `null` (no warn-side propagation
  required by Stage 21 callers — all current callers can pass it).
- **Behaviour preserved on first cold load**: if `loadGraphData` fails
  with NO prior cache, behaviour is unchanged from Stage 18 — the cache
  stays `null` and the caller sees the throw. Stale-while-revalidate
  applies only when a prior cache exists.

## Rationale

The two hardening changes are independent in code and in failure-mode,
but both are about **degrading gracefully under load or transient
failure**, which is precisely what arch §9.3's "module-scope cache" trust
boundary requires. Tying them in one ADR makes the cache module's
production contract clear in one place rather than scattered across two
small ADRs.

The in-flight sentinel is small, well-known, and has a single failure
mode (rejection: clear the sentinel and let the next call retry). The
stale-while-revalidate path makes the cache resilient to the same class
of transient DB failure that Stage 20's intelligence-svc soft-fallback
already handles for the inline pipeline call (Q-20.15). Choosing
**different** fallback policies for the two cache subsystems was rejected
on consistency grounds.

The structured `console.warn` is non-negotiable: silent stale data is
the failure mode that becomes a year-long ops mystery; a warn line with
`{ event: 'skill_graph_stale_revalidate_failed', error, watermark_old,
watermark_new, trace_id? }` is grep-able and dashboard-able from day one.

The 50 ms / 5 ms exit-criterion split (Q-21.2) is independent of this
ADR — synthetic 50 ms gate in Stage 21 contract tests, real <5 ms gate
at Stage 26 load test against a warm Postgres connection.

## Consequences

### Positive

- One additional DB round-trip-per-worker-cold-start eliminated under
  the in-flight sentinel — bounded N=1 instead of N=concurrent-callers.
- Transient `loadGraphData` failures no longer take the service down;
  they degrade to stale data + an ops-visible warn until the next
  successful load.
- The cache module's production contract is now explicitly documented
  in a single ADR, ready to cite at any post-incident review.
- intelligence-svc and orchestration-svc (future) can adopt the same
  cache pattern with a known-good production contract.

### Negative

- The cache module gains state (loadingPromise sentinel, prior-cache
  retention through partial failures). Slightly harder to reason about
  than the pure Stage 18 module. Mitigated by explicit unit tests for
  both new branches.
- Stale-while-revalidate means clients can briefly see the prior graph
  version after a successful publish if the next-load fails. Bounded
  by load retry frequency (every request rechecks the watermark).
- Adds two new contract tests (concurrent cold-start, stale-while-
  revalidate) and a synthetic-timing test for the watermark cost. Test
  count grows by 3.

### Follow-ups

- **ISSUE-0006**: intelligence-svc L3a migration to the cache. Pre-
  launch.
- **Stage 26 load test**: real watermark-check p95 must be < 5 ms
  against the warm DB pool. The synthetic 50 ms gate this stage is a
  10× margin.
- **Stage 28 (jobs-worker)**: when the orchestration-svc + jobs-worker
  read skill graphs, they should adopt the same cache surface (no new
  cache module).

## Implementation notes

Files (Stage 21 implementation):
- `supabase/functions/_shared/skill-graph-cache.ts` — add `loadingPromise`
  module-scope sentinel; add stale-while-revalidate branch in
  `getSkillGraph`; add optional `traceId` parameter; structured warn on
  failed revalidation.
- `supabase/functions/content-svc/__tests__/contract.test.ts` — add tests:
  - `'concurrent cold-start: two parallel calls share one DB load'`
  - `'stale-while-revalidate: loadGraphData failure retains prior cache + warns'`
  - `'1000 subsequent requests skip DB (DEV_PLAN exit criterion)'`
  - `'watermark check cost < 50ms per request synthetic (DEV_PLAN exit criterion)'`

Commit: TBD (Stage 21 implementation commit).
Related: arch §9.3 (cache strategy), arch §5.3 (degraded mode);
ADR-0027 (Q-20.15 timeout fallback — same fail-soft principle);
ISSUE-0006 (intelligence-svc L3a cache migration, deferred).
