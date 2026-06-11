-- =============================================================================
-- Migration 0028 — REVOKE/GRANT service_role EXECUTE for Edge Function RPCs
-- Stage v1.1 · 2026-06-06
-- Closes ISSUE-0084. Systemic rule canonised in ADR-0046.
--
-- T1 pre-read citations (exact signatures):
--   create_session_response_atomic — 0012:38-51
--     (uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb)
--     existing grant: 0012:134-137 — REVOKE PUBLIC x2, REVOKE anon,
--     GRANT EXECUTE TO authenticated
--     10-arg overload dropped by 0012:30-32; only 11-arg exists.
--
--   fn_check_rate_limit — 0011:9-13
--     (text, timestamptz, int) -- no GRANT in 0011; PUBLIC default
--     callers: auth-svc + users-svc Edge Functions (service_role)
--
--   fn_pickup_jobs — 0014:32-35
--     (text, int) -- no GRANT in 0014; PUBLIC default
--     caller: jobs-worker Edge Function (service_role)
--
-- CLI note: Supabase CLI v2.72.7 sends DCL-only files as a single prepared
-- statement (42601 on remote push). Wrapping in DO $$ EXECUTE $$ is the
-- correct PostgreSQL workaround; GRANT/REVOKE run via dynamic SQL in PL/pgSQL.
-- =============================================================================

DO $$
BEGIN
  -- SECTION 1: create_session_response_atomic (11-arg, 0012)
  -- ISSUE-0084: was GRANT TO authenticated; flip to service_role.
  EXECUTE 'REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) TO service_role';

  -- SECTION 2: fn_check_rate_limit (0011) — systemic harden per ADR-0046.
  EXECUTE 'REVOKE EXECUTE ON FUNCTION fn_check_rate_limit(text, timestamptz, int) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION fn_check_rate_limit(text, timestamptz, int) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION fn_check_rate_limit(text, timestamptz, int) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION fn_check_rate_limit(text, timestamptz, int) TO service_role';

  -- SECTION 3: fn_pickup_jobs (0014) — systemic harden per ADR-0046.
  EXECUTE 'REVOKE EXECUTE ON FUNCTION fn_pickup_jobs(text, int) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION fn_pickup_jobs(text, int) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION fn_pickup_jobs(text, int) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION fn_pickup_jobs(text, int) TO service_role';
END;
$$;
