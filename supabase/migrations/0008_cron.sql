-- =============================================================================
-- Migration 0008 — pg_cron Setup
-- Stage 9 · 2026-05-03
-- Tables new: 0
-- Functions new: 8 (LANGUAGE sql VOLATILE; no SECURITY DEFINER)
-- Cron jobs: 8 (7 functional + 1 PHASE-2 stub)
-- No RLS — cron functions execute as postgres superuser via pg_cron.
-- BUILD_CONTRACT §6 A1 triple-REVOKE does not apply: these functions are not
-- SECURITY DEFINER and are not callable by authenticated or anon roles.
-- =============================================================================

-- =============================================================================
-- SECTION 1 — EXTENSION
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- SECTION 2 — CRON FUNCTIONS
-- All: LANGUAGE sql VOLATILE; no SECURITY DEFINER.
-- pg_cron runs jobs as postgres superuser — no auth chain, no RLS applied.
-- LANGUAGE sql bodies validated at CREATE time; all referenced tables must
-- already exist (Migrations 0004–0007 run before 0008).
-- =============================================================================

-- 1. fn_reap_stuck_jobs — reclaim processing jobs stalled > 120 s (arch §5.4)
CREATE OR REPLACE FUNCTION fn_reap_stuck_jobs()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  UPDATE job_queue
  SET    status     = 'pending',
         last_error = 'reclaimed_from_stuck_worker'
  WHERE  status      = 'processing'
    AND  started_at  < now() - interval '120 seconds'
    AND  attempts    < max_attempts;
$$;

-- 2. fn_archive_jobs — DELETE completed job rows older than 30 days
CREATE OR REPLACE FUNCTION fn_archive_jobs()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  DELETE FROM job_queue
  WHERE  status       = 'completed'
    AND  completed_at < now() - interval '30 days';
$$;

-- 3. fn_cleanup_pipeline — DELETE pipeline_event rows older than 90 days
CREATE OR REPLACE FUNCTION fn_cleanup_pipeline()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  DELETE FROM pipeline_event
  WHERE created_at < now() - interval '90 days';
$$;

-- 4. fn_cleanup_idem_keys — DELETE terminal idempotency keys older than 24 h
CREATE OR REPLACE FUNCTION fn_cleanup_idem_keys()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  DELETE FROM api_idempotency_key
  WHERE  status      IN ('completed', 'failed')
    AND  created_at   < now() - interval '24 hours';
$$;

-- 5. fn_cleanup_abandoned_sessions — mark interrupted sessions abandoned after 24 h
--    Threshold: 24 hours; tunable in a future migration if operational data warrants.
CREATE OR REPLACE FUNCTION fn_cleanup_abandoned_sessions()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  UPDATE session_record
  SET    status = 'abandoned'
  WHERE  status     = 'interrupted'
    AND  updated_at < now() - interval '24 hours';
$$;

-- 6. fn_expire_plans — mark active plans expired when valid_until has passed
CREATE OR REPLACE FUNCTION fn_expire_plans()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  UPDATE learning_plan
  SET    status = 'expired'
  WHERE  status      = 'active'
    AND  valid_until < now();
$$;

-- 7. fn_cleanup_rate_limit — DELETE rate_limit_bucket rows older than 5 minutes
CREATE OR REPLACE FUNCTION fn_cleanup_rate_limit()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  DELETE FROM rate_limit_bucket
  WHERE window_start < now() - interval '5 minutes';
$$;

-- 8. fn_recalibrate_content — PHASE-2: no-op stub (arch Part XI).
--    Content recalibration engine ships in v1.1; replace body in that migration.
CREATE OR REPLACE FUNCTION fn_recalibrate_content()
RETURNS void LANGUAGE sql VOLATILE
SET search_path = public, pg_temp AS $$
  UPDATE job_queue SET status = status WHERE FALSE; -- PHASE-2: stub; body replaced in v1.1 migration
$$;

-- =============================================================================
-- SECTION 3 — CRON JOB REGISTRATION
-- Pattern: unschedule-first (idempotent re-run safe) + cron.schedule() API.
-- Direct INSERT into cron.job avoided — fragile against pg_cron version drift
-- (ADR-0017). DEV_PLAN.md "ON CONFLICT DO NOTHING" is documentation imprecision;
-- corrected at Stage 10 audit.
-- =============================================================================

-- 1. jobs.reaper — every minute
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'jobs.reaper';
SELECT cron.schedule('jobs.reaper',           '* * * * *',  'SELECT fn_reap_stuck_jobs()');

-- 2. jobs.archive — 03:00 UTC daily
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'jobs.archive';
SELECT cron.schedule('jobs.archive',           '0 3 * * *',  'SELECT fn_archive_jobs()');

-- 3. pipeline.cleanup — 05:00 UTC Sunday
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pipeline.cleanup';
SELECT cron.schedule('pipeline.cleanup',       '0 5 * * 0',  'SELECT fn_cleanup_pipeline()');

-- 4. idem.cleanup — 5 min past every hour
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'idem.cleanup';
SELECT cron.schedule('idem.cleanup',           '5 * * * *',  'SELECT fn_cleanup_idem_keys()');

-- 5. abandoned.cleanup — 02:00 UTC daily
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'abandoned.cleanup';
SELECT cron.schedule('abandoned.cleanup',      '0 2 * * *',  'SELECT fn_cleanup_abandoned_sessions()');

-- 6. plan.expiry — 00:30 UTC daily
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'plan.expiry';
SELECT cron.schedule('plan.expiry',            '30 0 * * *', 'SELECT fn_expire_plans()');

-- 7. rate_limit.cleanup — top of every hour
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'rate_limit.cleanup';
SELECT cron.schedule('rate_limit.cleanup',     '0 * * * *',  'SELECT fn_cleanup_rate_limit()');

-- 8. content.recalibration — top of every hour (PHASE-2 stub)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'content.recalibration';
SELECT cron.schedule('content.recalibration',  '0 * * * *',  'SELECT fn_recalibrate_content()');
