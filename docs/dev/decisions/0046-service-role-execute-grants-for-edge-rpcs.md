# ADR-0046 — Explicit GRANT EXECUTE TO service_role for Edge Function RPCs

- Status: accepted
- Date: 2026-06-06
- Stage: v1.1 (ISSUE-0084 remediation)
- Tags: backend | security | data | infra

## Context

Migration 0028 (ISSUE-0084) revealed a systemic gap: three SECURITY DEFINER functions
called exclusively from Edge Functions via the service_role key were either granted to
the wrong role or left with the PUBLIC default:

| Function | Defined | Prior grant | Callers |
|---|---|---|---|
| `create_session_response_atomic` | 0012 | EXECUTE TO authenticated | assessment-svc (service_role) |
| `fn_check_rate_limit` | 0011 | PUBLIC default | auth-svc, users-svc (service_role) |
| `fn_pickup_jobs` | 0014 | PUBLIC default | jobs-worker (service_role) |

Edge Functions that call Supabase RPCs do so using the service_role key. The
`authenticated` role is a Postgres role assumed by JWT-carrying user requests routed
through the Supabase gateway — it is never the effective role for an Edge Function
direct database call. Granting EXECUTE to `authenticated` (or relying on PUBLIC) for a
service-only function either silently fails under service_role or grants the function to
all authenticated users, violating least-privilege.

ADR-0011 Principle 2 established that atomic write functions must be SECURITY DEFINER
but did not address *which role* should receive the EXECUTE grant. The resulting
convention — double-REVOKE + GRANT TO authenticated — was inherited from the helper
pattern (ADR-0011 Principle 1), where `authenticated` is correct. For service-only
functions the same convention produces the wrong grant.

## Options considered

1. **GRANT TO service_role only** — revoke PUBLIC, anon, authenticated; grant
   service_role explicitly. Correct least-privilege. Edge Functions using the service
   role key can call the function; authenticated JWT requests cannot.
2. **GRANT TO authenticated + service_role** — both roles can call. Technically enables
   `supabase.functions.invoke()` with a user JWT, but violates least-privilege for
   functions that should never be user-callable.
3. **Leave as-is** — rely on SECURITY DEFINER to enforce safety via internal logic.
   Does not fix the broken service_role path (ISSUE-0084 root cause) and retains
   unnecessary authenticated access.

## Decision

Use **Option 1** for every RPC that is called exclusively from Edge Functions via the
service_role key.

## Rationale

An Edge Function that authenticates with the service_role key runs as the `service_role`
Postgres role, not as `authenticated`. A function granted only to `authenticated` is
effectively not callable from that Edge Function — the call raises `permission denied for
function`, which is the root cause of ISSUE-0084.

Revoking `authenticated` also enforces least-privilege: user-facing JWT requests routed
through Supabase's gateway cannot directly invoke internal write or job functions.

## Consequences

- Positive: Edge Function calls to `create_session_response_atomic`, `fn_check_rate_limit`,
  and `fn_pickup_jobs` succeed. ISSUE-0084 closed.
- Positive: Authenticated users can no longer call these functions directly.
- Negative: Any future client-side use of these functions (not anticipated in v1) would
  require an additional GRANT. This is intentional — the GRANT would be the trigger for
  an architectural review.
- Follow-ups:
  - **Binding rule (from this ADR forward):** Every RPC called exclusively from Edge
    Functions MUST include `REVOKE EXECUTE FROM PUBLIC; REVOKE EXECUTE FROM anon;
    REVOKE EXECUTE FROM authenticated; GRANT EXECUTE TO service_role;` in the same
    migration that creates the function. Relying on the PUBLIC default or inheriting
    the authenticated-helper pattern is forbidden for service-only functions.
  - Any new function that is both user-callable AND service-callable must be explicitly
    documented — both roles granted, reason stated in a migration comment.
  - ADR-0011 Principles 1 and 2 are unaffected; the authenticated grant remains correct
    for SECURITY DEFINER helpers used in RLS `USING` expressions.

## Implementation notes

Files: `supabase/migrations/0028_rpc_service_role_grants.sql` ·
`supabase/tests/migrations/0028_rpc_grants.sql`  
Related: ADR-0011 (Principle 2), ADR-0008, ISSUE-0084  
Commit: (0028 fix commit)
