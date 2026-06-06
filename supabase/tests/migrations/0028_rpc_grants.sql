-- =============================================================================
-- pgTAP Test: 0028_rpc_grants.sql
-- Migration 0028 · 2026-06-06
-- plan(6): service_role CAN execute × 3 functions;
--          authenticated CANNOT execute × 3 functions.
--
-- ADR-0006 pattern: catalog-based privilege assertions via
-- has_function_privilege(role, signature, 'execute').
-- ADR-0046: every RPC callable from Edge Functions must be explicitly
-- granted to service_role and denied to authenticated.
-- =============================================================================

BEGIN;
SELECT plan(6);

-- ─────────────────────────────────────────────────────────────────────────────
-- create_session_response_atomic (11-arg, migration 0012/0028)
-- ─────────────────────────────────────────────────────────────────────────────

-- G1: service_role can execute
SELECT is(
  has_function_privilege(
    'service_role',
    'public.create_session_response_atomic(uuid, integer, uuid, jsonb, boolean, real, real, jsonb, real, integer, jsonb)',
    'execute'
  ),
  true,
  'G1: create_session_response_atomic — service_role GRANT active'
);

-- G2: authenticated cannot execute (revoked in 0028)
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.create_session_response_atomic(uuid, integer, uuid, jsonb, boolean, real, real, jsonb, real, integer, jsonb)',
    'execute'
  ),
  false,
  'G2: create_session_response_atomic — authenticated REVOKED'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_check_rate_limit (migration 0011/0028)
-- ─────────────────────────────────────────────────────────────────────────────

-- G3: service_role can execute
SELECT is(
  has_function_privilege(
    'service_role',
    'public.fn_check_rate_limit(text, timestamp with time zone, integer)',
    'execute'
  ),
  true,
  'G3: fn_check_rate_limit — service_role GRANT active'
);

-- G4: authenticated cannot execute (revoked in 0028)
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.fn_check_rate_limit(text, timestamp with time zone, integer)',
    'execute'
  ),
  false,
  'G4: fn_check_rate_limit — authenticated REVOKED'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_pickup_jobs (migration 0014/0028)
-- ─────────────────────────────────────────────────────────────────────────────

-- G5: service_role can execute
SELECT is(
  has_function_privilege(
    'service_role',
    'public.fn_pickup_jobs(text, integer)',
    'execute'
  ),
  true,
  'G5: fn_pickup_jobs — service_role GRANT active'
);

-- G6: authenticated cannot execute (revoked in 0028)
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.fn_pickup_jobs(text, integer)',
    'execute'
  ),
  false,
  'G6: fn_pickup_jobs — authenticated REVOKED'
);

SELECT * FROM finish();
ROLLBACK;
