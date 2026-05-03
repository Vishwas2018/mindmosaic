-- =============================================================================
-- pgTAP Test: 008_cron.sql
-- Stage 9 · 2026-05-03
-- plan(22)
--
-- Groups:
--   G_ext        pg_cron extension installed                              =  1
--   G_cron       cron.job catalog: 1 per job (name + schedule + command)  =  8
--   G_fn         has_function: 1 per cron function in public schema        =  8
--   G_behavioral side-effect proofs (5 functions with observable effects)  =  5
--                                                                  TOTAL  = 22
-- Cumulative: 406 (prior) + 22 = 428
--
-- Cron functions: LANGUAGE sql VOLATILE; no SECURITY DEFINER.
-- All behavioral tests run as postgres (superuser): cron functions run with
-- caller's privileges; superuser bypasses RLS on Pattern G tables.
-- Stage 9 adds no new tables — no RLS tests.
-- fn_recalibrate_content (PHASE-2 stub) has no behavioral test: no observable
-- side effect by design.
--
-- Test data UUIDs (00000000-0000-0000-0009-XXXXXXXXXXXX):
--   tenant:          00000000-0000-0000-0009-000000000099
--   student:         00000000-0000-0000-0009-000000000001
--   job:             00000000-0000-0000-0009-000000000010
--   learning_plan:   00000000-0000-0000-0009-000000000020
--   session_record:  00000000-0000-0000-0009-000000000030
-- =============================================================================

BEGIN;

SELECT plan(22);

-- =============================================================================
-- TEST DATA SETUP (run as postgres — RLS bypassed)
-- Seeds used exclusively by G_behavioral tests.
-- =============================================================================

INSERT INTO tenant (id, name, slug, type, region) VALUES
  ('00000000-0000-0000-0009-000000000099', 'Stage9 Tenant', 'stage9', 'family', 'au-syd');

INSERT INTO user_profile (id, tenant_id, role, display_name) VALUES
  ('00000000-0000-0000-0009-000000000001',
   '00000000-0000-0000-0009-000000000099', 'student', 'S9 Student');

-- G_behavioral.1 seed: stuck processing job (started > 120 s ago, attempts < max_attempts)
INSERT INTO job_queue (id, job_type, idempotency_key, status, attempts, max_attempts, started_at)
VALUES (
  '00000000-0000-0000-0009-000000000010',
  'test', 'stage9-reaper-seed', 'processing', 0, 3,
  now() - interval '200 seconds'
);

-- G_behavioral.2 seed: old rate_limit_bucket (window_start > 5 min ago)
INSERT INTO rate_limit_bucket (bucket_key, window_start, count)
VALUES ('stage9-rl-bucket', now() - interval '10 minutes', 5);

-- G_behavioral.3 seed: active learning_plan with valid_until in the past
INSERT INTO learning_plan
  (id, student_id, tenant_id, plan_type, status, valid_until, generated_algorithm_version)
VALUES (
  '00000000-0000-0000-0009-000000000020',
  '00000000-0000-0000-0009-000000000001',
  '00000000-0000-0000-0009-000000000099',
  'weekly', 'active', now() - interval '1 day', 'v1-test'
);

-- G_behavioral.4 seed: completed idempotency key older than 24 h
-- api_idempotency_key has no FK on tenant_id (arch §2.8, composite PK only)
INSERT INTO api_idempotency_key
  (idempotency_key, tenant_id, endpoint, request_hash, status, created_at)
VALUES (
  'stage9-idem-seed',
  '00000000-0000-0000-0009-000000000099',
  '/test', 'abc123', 'completed',
  now() - interval '25 hours'
);

-- G_behavioral.5 seed: interrupted session with updated_at > 24 h ago
-- INSERT bypasses BEFORE UPDATE trigger (set_updated_at fires on UPDATE only)
INSERT INTO session_record
  (id, student_id, tenant_id, engine_type, mode, status, updated_at)
VALUES (
  '00000000-0000-0000-0009-000000000030',
  '00000000-0000-0000-0009-000000000001',
  '00000000-0000-0000-0009-000000000099',
  'adaptive', 'exam', 'interrupted',
  now() - interval '25 hours'
);

-- =============================================================================
-- G_ext — pg_cron extension installed (1 test)
-- =============================================================================

SELECT ok(
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'),
  'G_ext.1: pg_cron extension installed');

-- =============================================================================
-- G_cron — cron.job catalog checks (8 tests)
-- Verifies jobname, schedule, and command string for every registered job.
-- =============================================================================

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'jobs.reaper'
           AND schedule = '* * * * *'
           AND command  = 'SELECT fn_reap_stuck_jobs()'),
  'G_cron.1: jobs.reaper — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'jobs.archive'
           AND schedule = '0 3 * * *'
           AND command  = 'SELECT fn_archive_jobs()'),
  'G_cron.2: jobs.archive — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'pipeline.cleanup'
           AND schedule = '0 5 * * 0'
           AND command  = 'SELECT fn_cleanup_pipeline()'),
  'G_cron.3: pipeline.cleanup — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'idem.cleanup'
           AND schedule = '5 * * * *'
           AND command  = 'SELECT fn_cleanup_idem_keys()'),
  'G_cron.4: idem.cleanup — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'abandoned.cleanup'
           AND schedule = '0 2 * * *'
           AND command  = 'SELECT fn_cleanup_abandoned_sessions()'),
  'G_cron.5: abandoned.cleanup — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'plan.expiry'
           AND schedule = '30 0 * * *'
           AND command  = 'SELECT fn_expire_plans()'),
  'G_cron.6: plan.expiry — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'rate_limit.cleanup'
           AND schedule = '0 * * * *'
           AND command  = 'SELECT fn_cleanup_rate_limit()'),
  'G_cron.7: rate_limit.cleanup — schedule + command correct');

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job
         WHERE jobname = 'content.recalibration'
           AND schedule = '0 * * * *'
           AND command  = 'SELECT fn_recalibrate_content()'),
  'G_cron.8: content.recalibration — PHASE-2 stub registered with correct schedule');

-- =============================================================================
-- G_fn — function existence (8 tests)
-- =============================================================================

SELECT has_function('public', 'fn_reap_stuck_jobs',
  ARRAY[]::text[], 'G_fn.1: fn_reap_stuck_jobs exists in public schema');

SELECT has_function('public', 'fn_archive_jobs',
  ARRAY[]::text[], 'G_fn.2: fn_archive_jobs exists in public schema');

SELECT has_function('public', 'fn_cleanup_pipeline',
  ARRAY[]::text[], 'G_fn.3: fn_cleanup_pipeline exists in public schema');

SELECT has_function('public', 'fn_cleanup_idem_keys',
  ARRAY[]::text[], 'G_fn.4: fn_cleanup_idem_keys exists in public schema');

SELECT has_function('public', 'fn_cleanup_abandoned_sessions',
  ARRAY[]::text[], 'G_fn.5: fn_cleanup_abandoned_sessions exists in public schema');

SELECT has_function('public', 'fn_expire_plans',
  ARRAY[]::text[], 'G_fn.6: fn_expire_plans exists in public schema');

SELECT has_function('public', 'fn_cleanup_rate_limit',
  ARRAY[]::text[], 'G_fn.7: fn_cleanup_rate_limit exists in public schema');

SELECT has_function('public', 'fn_recalibrate_content',
  ARRAY[]::text[], 'G_fn.8: fn_recalibrate_content exists in public schema');

-- =============================================================================
-- G_behavioral — side-effect proofs (5 tests)
-- All run as postgres (superuser) — no SET ROLE needed.
-- Cron functions are LANGUAGE sql VOLATILE (not SECURITY DEFINER); they execute
-- with caller privileges. Postgres superuser bypasses RLS on all Pattern G tables.
-- fn_recalibrate_content is a PHASE-2 no-op stub — no behavioral test.
-- =============================================================================

-- G_behavioral.1: fn_reap_stuck_jobs reclaims stuck processing job
SELECT fn_reap_stuck_jobs();
SELECT is(
  (SELECT count(*)::int FROM job_queue
   WHERE id         = '00000000-0000-0000-0009-000000000010'
     AND status     = 'pending'
     AND last_error = 'reclaimed_from_stuck_worker'),
  1,
  'G_behavioral.1: fn_reap_stuck_jobs reclaims stuck processing job — status=pending, last_error set');

-- G_behavioral.2: fn_cleanup_rate_limit deletes old rate limit buckets
SELECT fn_cleanup_rate_limit();
SELECT is(
  (SELECT count(*)::int FROM rate_limit_bucket WHERE bucket_key = 'stage9-rl-bucket'),
  0,
  'G_behavioral.2: fn_cleanup_rate_limit deletes rate_limit_bucket rows with window_start > 5 min ago');

-- G_behavioral.3: fn_expire_plans marks overdue active plan as expired
SELECT fn_expire_plans();
SELECT is(
  (SELECT status::text FROM learning_plan
   WHERE id = '00000000-0000-0000-0009-000000000020'),
  'expired',
  'G_behavioral.3: fn_expire_plans marks active plan with past valid_until as expired');

-- G_behavioral.4: fn_cleanup_idem_keys deletes old completed idempotency keys
SELECT fn_cleanup_idem_keys();
SELECT is(
  (SELECT count(*)::int FROM api_idempotency_key
   WHERE idempotency_key = 'stage9-idem-seed'),
  0,
  'G_behavioral.4: fn_cleanup_idem_keys deletes completed idempotency keys older than 24 h');

-- G_behavioral.5: fn_cleanup_abandoned_sessions marks old interrupted sessions abandoned
SELECT fn_cleanup_abandoned_sessions();
SELECT is(
  (SELECT status::text FROM session_record
   WHERE id = '00000000-0000-0000-0009-000000000030'),
  'abandoned',
  'G_behavioral.5: fn_cleanup_abandoned_sessions marks interrupted sessions older than 24 h as abandoned');

SELECT * FROM finish();
ROLLBACK;
