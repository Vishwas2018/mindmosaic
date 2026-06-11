# ADR-0045 — verify_jwt = false for service-only Edge Functions

- Status: accepted
- Date: 2026-06-04
- Stage: v1.1 (ISSUE-0074 fix)
- Tags: infra | security | edge-function | service-to-service

## Context

Assessment-svc calls content-svc (`/content/select`) and intelligence-svc
(`/intelligence/process-session/{id}`) server-to-server. Both call sites use the
`x-mm-service-role` custom header as the application-level auth gate.

When `verify_jwt = true` (Supabase default), the function invocation gateway at
`${SUPABASE_URL}/functions/v1/*` rejects requests that lack a valid JWT in the
`Authorization: Bearer` header with HTTP 401, before the Edge Function handler is
invoked. This means the application-level `x-mm-service-role` check never runs.

ISSUE-0074 first attempted to fix this by adding `Authorization: Bearer
${SERVICE_ROLE_KEY}` to the outbound fetch headers (commit dd33739). However,
the Supabase gateway does not accept the service_role JWT as a valid Bearer token
for function-to-function calls — still returns 401. Root cause: Supabase's
function invocation gateway validates JWTs as user tokens via `auth.getUser()`,
and the service_role JWT is not a user token.

The correct Supabase-documented pattern for service-to-service function calls is
`verify_jwt = false` with an application-level custom header gate.

## Options considered

1. **verify_jwt = false + x-mm-service-role gate** — bypass gateway JWT check;
   rely entirely on the application `x-mm-service-role` header. Pros: standard
   Supabase pattern, simple, works. Cons: removes one layer of gateway-level
   defense (but the anon key is already public, so that layer adds no real
   security).

2. **Use SUPABASE_ANON_KEY as Bearer + x-mm-service-role** — keep verify_jwt =
   true, use the publicly-known anon key as Bearer. Pros: no config change. Cons:
   requires adding another env var read; the anon key is already public so this
   adds no security; confusing because the anon key is used for auth bypass not
   auth.

3. **supabase.functions.invoke() from within Edge Functions** — use the
   supabase-js client to invoke functions (it handles Authorization automatically).
   Pros: no config change, idiomatic. Cons: requires wrapping existing fetch calls
   in the supabase client, more coupling, harder to test.

## Decision

Use **Option 1** (verify_jwt = false) for `content-svc` and `intelligence-svc`.

Both functions are service-only callers (called exclusively by assessment-svc
server-side) and already implement their own application-level auth via
`x-mm-service-role`. The gateway JWT check adds no meaningful security since the
anon key is publicly embedded in the frontend.

## Rationale

- Standard Supabase pattern for service functions: documented and supported.
- `x-mm-service-role` header keeps the application-level security intact.
- Both functions have application-level auth for every route (service-role or
  Bearer via `auth.getUser()`), so removing gateway JWT check is safe.
- `Authorization: Bearer ${SERVICE_ROLE_KEY}` headers added in dd33739 are
  retained as defense-in-depth but are now optional for gateway passage.

## Consequences

- Positive: content-svc and intelligence-svc are reachable from assessment-svc
  without a valid JWT; ISSUE-0074 resolved.
- Negative: Anyone who knows the function URL can attempt to reach the handler
  without any JWT. The `x-mm-service-role` application check still blocks
  unauthorized callers for service-only routes.
- Follow-ups: If the `x-mm-service-role` key is ever rotated, both functions and
  all callers must be updated simultaneously.

## Implementation notes

Files: `supabase/functions/content-svc/config.toml`,
`supabase/functions/intelligence-svc/config.toml`
Related: ISSUE-0074, commit dd33739 (Authorization header fix), ADR-0031
