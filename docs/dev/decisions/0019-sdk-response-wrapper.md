# ADR-0019 — SDKResponse<T> wrapper on all SDK client methods

- Status: accepted
- Date: 2026-05-03
- Stage: 12
- Tags: frontend | dx | backend

## Context

The arch §1.7 requires `X-Trace-Id` to be propagated on every request and response. The SDK
wraps `fetch` and must surface this trace ID to callers so that structured logs correlate
across the request lifecycle.

Two paths need the trace ID:

1. **Error path** — `APIError` carries `traceId` from the response header. If the server
   generates or echoes the trace, that value is captured on throw.
2. **Success path** — without a wrapper, the trace ID is silently discarded after a successful
   response. This breaks correlation: if a component logs a warning after a successful fetch,
   there is no `trace_id` to attach.

## Options considered

1. **SDKResponse<T> wrapper** — all SDK methods return `{ data: T; traceId: string }`. Hooks
   unwrap `.data`; callers that need the trace can access `.traceId`.
   Pros: trace preserved on all paths. Cons: hooks must call `.then(r => r.data)` to unwrap.

2. **Return T directly** — discard trace on success.
   Pros: simpler callsites. Cons: success-path correlation lost; contradicts §1.7 intent.

3. **Thread-local / context logger** — pass trace to a logging context instead of returning it.
   Pros: no wrapper. Cons: no true thread-local in browser; adds a global side channel; not
   compatible with React Concurrent Mode.

## Decision

Use **Option 1: SDKResponse<T>**.

```typescript
export type SDKResponse<T> = { data: T; traceId: string };
```

All `MmClient` methods (`get`, `post`, `patch`, `delete`) return `SDKResponse<T>`. Hooks
unwrap via `.then(r => r.data)`.

## Rationale

Matches §1.7 propagation requirement for both paths. The unwrap pattern is mechanical and
consistent — every hook file has the same `.then(r => r.data)` idiom. Sets a permanent
precedent: any new SDK method added in future stages must return `SDKResponse<T>`, not `T`.

## Consequences

- Positive: trace correlation available on success path; APIError carries trace on error path.
- Negative: hooks always unwrap; raw SDK callers must be aware of the wrapper.
- Follow-ups: Stage 14 — ensure structured logs in Edge Functions echo `X-Trace-Id` header so
  the SDK captures the server-side value rather than the client-generated fallback.

## Implementation notes

Files: `packages/sdk/src/client.ts` · Commit: (Stage 12 commit)
Related: ADR-0018, arch §1.7, Stage 12 X2 directive
