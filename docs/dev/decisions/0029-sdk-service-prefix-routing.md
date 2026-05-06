# ADR-0029 — SDK service-prefix routing: single MmClient + per-hook service prefix

- Status: accepted
- Date: 2026-05-11
- Stage: 22a
- Tags: frontend | sdk | architecture

## Context

Stage 22 (Day 27) is the first stage to wire `@mm/sdk` hooks into
`apps/web` routes. Before any screen could be authored, the §2A
implementation walkthrough surfaced a pre-existing architectural gap:

`MmClient` (`packages/sdk/src/client.ts`) was authored at Stage 14
(SDK layer) with a single `baseUrl: string` config. Every hook calls
service-bare paths like `/sessions/recent`, `/pathways`,
`/intelligence/dna`. At Stage 14 there was no concrete plan for how
those bare paths would resolve to deployed Edge Functions, because the
Edge Functions did not yet exist.

By Stage 22 the actual deployment shape is locked:

- assessment-svc dispatcher serves URLs of the form
  `${SUPABASE_URL}/functions/v1/assessment-svc/<path>` and strips
  `^/functions/v1/assessment-svc` before matching `<path>`
  (`supabase/functions/assessment-svc/index.ts:177`).
- content-svc, intelligence-svc, and (future) orchestration-svc /
  jobs-worker / analytics-svc / billing-svc follow the same pattern
  (`supabase/functions/content-svc/index.ts:75`,
  `supabase/functions/intelligence-svc/index.ts:34`).
- OWNERS.md authoritatively assigns each endpoint to exactly one
  service (e.g. `GET /sessions/recent` → assessment-svc at
  OWNERS.md:99).

So a real Stage 22 SDK call needs the URL
`${SUPABASE_URL}/functions/v1/assessment-svc/sessions/recent`, but
the SDK constructs it as `${baseUrl}/sessions/recent` — there is no
way for `baseUrl` alone to encode the service segment without a
routing decision.

A second, mechanical issue surfaced in the same review (filed as
**Q-22.2**, separate from this ADR): even if service routing is
solved, several SDK hooks call paths that do not match their
dispatcher's expected route (e.g. `useCreateSession` calls
`POST /sessions` but assessment-svc serves `POST /sessions/create`).
Q-22.2 is a path-correction chore; this ADR is the structural
decision underneath it.

## Options considered

### A. Single `MmClient` at `${SUPABASE_URL}/functions/v1`; each hook prepends its service prefix in the path *(chosen)*

Hooks change from `client.get('/sessions/recent', ...)` to
`client.get('/assessment-svc/sessions/recent', ...)`. `MmClient`
unchanged in shape; no routing logic added; the URL hooks pass is
the URL the fetch lands on. Service-of-record stays in the hook
file (which is also where the SDK-side OWNERS.md mapping is
visually adjacent).

Pros:
- Smallest code delta — no new layer in `MmClient`, no new layer
  in apps/web.
- One `MmClientProvider` instance, one auth token plumbing path.
- The full URL is grep-able from the SDK source (`/assessment-svc/`
  shows up in `packages/sdk/src/hooks/session.ts`).
- Matches the production reality — Edge Functions ARE on the per-
  service path; the SDK doesn't fiction otherwise.
- No duplication of OWNERS.md (the prefix is in the same file as the
  hook that owns it).
- Trivially extends to future services (orchestration-svc, jobs-
  worker readers, analytics-svc, billing-svc): add the hook,
  prepend the prefix.

Cons:
- If a service is ever renamed or moved (extremely unlikely in v1),
  every hook on that service must be edited. Mitigated: greppable;
  small N (~5–8 hooks per service in v1).
- SDK hooks now bear public knowledge of internal service
  decomposition. Acceptable: that decomposition is also published in
  OWNERS.md and Edge Function URL paths.

### B. Routing table inside `MmClient`

`MmClient` carries a `path → service` mapping table; on every call
it rewrites the path before fetch. Hooks unchanged.

Pros: Hooks stay service-bare.
Cons: Two sources of truth (the table + OWNERS.md). Drift between
them is silent at compile time and only surfaces at runtime as a
404. Adds a layer that must be tested independently. Higher cost
than benefit in v1.

### C. Per-service `MmClient` instances (multiple providers)

One `MmClientProvider` per service; each hook calls `useContentClient`
/ `useAssessmentClient` / etc.

Pros: No path coupling at all in hook bodies.
Cons: 5–8 nested providers in `Providers.tsx`. 5–8 `useXClient`
hooks. Auth token plumbing duplicated 5–8 times. Idempotency
header plumbing duplicated 5–8 times. Operational cost is high
and the win is small.

### D. Single gateway Edge Function that proxies to siblings

A new `gateway-svc` Edge Function strips `/api` and routes by URL
prefix to the appropriate sibling service.

Pros: SDK is fully service-agnostic.
Cons: Adds a new Edge Function (cold-start cost, additional auth
plumbing, new ADR for the gateway's contract). Real production
rationale for a gateway (rate-shaping, header rewriting, AB
routing) doesn't exist in v1. **Architecture by anticipation**, not
real need.

### E. Next.js Route Handler at `/api/[...path]` proxying to Edge Functions

Apps/web hosts a `/api` proxy; SDK baseUrl = `/api`.

Pros: Removes CORS concerns; centralises auth token plumbing.
Cons: All Edge Function traffic flows through the Next.js server,
which then has to stream proxy bodies / preserve idempotency
headers / handle aborts. Operational surface area grows. Stage 22
budget cannot absorb a proxy build-out.

## Decision

Use **Option A**: single `MmClient` rooted at
`${SUPABASE_URL}/functions/v1`; each SDK hook prepends its service
prefix (`/assessment-svc/...`, `/content-svc/...`,
`/intelligence-svc/...`) in the path argument it passes to
`MmClient`.

Concrete rules:
1. Each Edge Function has exactly one canonical service prefix,
   matching the directory under `supabase/functions/`. v1 prefixes:
   `/assessment-svc`, `/content-svc`, `/intelligence-svc`.
   Future-stage prefixes: `/orchestration-svc`, `/analytics-svc`,
   `/billing-svc`, `/jobs-worker` (jobs-worker is internal-only —
   SDK does not call it).
2. SDK hooks own their service prefix. The hook file's import
   header should make the service explicit (e.g.
   `// hooks/session.ts → assessment-svc`).
3. `MmClient.config.baseUrl` is `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
   in production. Tests pass `https://api.test` (per existing
   `hooks.test.ts` shape) and use full URLs with prefix (matching
   the production fetch URL exactly).
4. No path mapping table in `MmClient`. No proxy layer. No
   per-service providers.

## Rationale

The deployment shape is fixed. Edge Functions live at
`/functions/v1/<svc>/<path>`. Any abstraction that hides that
shape from the SDK trades clarity for indirection without solving
a real production problem in v1. The chosen pattern keeps the
SDK→production URL relationship 1:1: the path the hook writes is
the path the network sees, with `${baseUrl}` simply prepended.

When a future stage adds a service (e.g. orchestration-svc at
Stage 31), the cost is one new prefix in N new hook files — no
change to `MmClient`, no change to `MmClientProvider`, no change
to the `Providers.tsx` chain, no new ADR to look up.

The "cons" of Option A — hooks bear knowledge of service
decomposition — are minimised because OWNERS.md already publishes
the mapping; the SDK simply reflects it.

## Consequences

### Positive

- `MmClient` stays a thin transport. No routing, no rewriting.
- Adding a service in a future stage is a hook-file diff, nothing
  more.
- Failed routes surface as deterministic 404s with the full URL
  visible — no "the routing table forgot this path" class of bug.
- Auth-token + idempotency-key plumbing is single-pathed.

### Negative

- Service renames (very unlikely in v1) require editing every hook
  on that service. Greppable; bounded.
- SDK hooks must be kept in sync with OWNERS.md. Mitigated: the
  prefix is grep-visible per-service.

### Follow-ups

- **Q-22.2** (mechanical path correction): each SDK hook prepends
  its service prefix and corrects any path that doesn't match its
  dispatcher's actual route (e.g. `useCreateSession`:
  `/sessions` → `/assessment-svc/sessions/create`;
  `useSessionSummary`: `/sessions/{id}/summary` →
  `/assessment-svc/sessions/{id}`). Implemented in Stage 22a.
- **MmClientProvider wiring** in `apps/web/src/providers/Providers.tsx`:
  instantiate `MmClient` once with `baseUrl =
  ${NEXT_PUBLIC_SUPABASE_URL}/functions/v1` and `getToken` reading
  from the Supabase auth session. Implemented in Stage 22a.
- **Stage 22b** (carry-forward, DEV-20260511-1): the visual screens
  (Session Selection + Practice) ship the day after 22a, against
  the corrected SDK paths.

## Implementation notes

Files touched in Stage 22a:

- `packages/sdk/src/hooks/identity.ts` — prepend prefix per OWNERS.md
- `packages/sdk/src/hooks/content.ts` — prepend `/content-svc/`
- `packages/sdk/src/hooks/session.ts` — prepend `/assessment-svc/`;
  fix `useCreateSession` to `/sessions/create`; fix
  `useSessionSummary` to `/sessions/{id}` (no `/summary` suffix).
- `packages/sdk/src/hooks/intelligence.ts` — prepend
  `/intelligence-svc/`
- `packages/sdk/src/hooks/orchestration.ts` — prepend
  `/orchestration-svc/` (the service is not yet shipped; hooks
  remain non-functional until Stage 31, but the prefix shape is
  fixed now to avoid a second sweep).
- `packages/sdk/src/__tests__/hooks.test.ts` — update path assertions
  for any hook the test exercises.
- `apps/web/src/providers/Providers.tsx` — mount
  `MmClientProvider` with a configured `MmClient`.

Commit: see Stage 22a implementation commit (`feat(sdk,web)`).
Related: Q-22.2, Q-22.3, OWNERS.md, DEV-20260511-1.
