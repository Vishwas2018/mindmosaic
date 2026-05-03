-- =============================================================================
-- Down Migration 0008 — pg_cron Setup (reverse)
-- Unschedule all 8 cron jobs; drop all 8 functions.
-- Extension NOT dropped: pg_cron is pre-loaded in Supabase Postgres and may be
-- in use outside this migration. IF NOT EXISTS in 0008 up handles pre-existence.
-- =============================================================================

-- Unschedule cron jobs (reverse registration order)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'content.recalibration';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'rate_limit.cleanup';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'plan.expiry';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'abandoned.cleanup';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'idem.cleanup';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pipeline.cleanup';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'jobs.archive';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'jobs.reaper';

-- Drop functions (any order; no inter-function dependencies)
DROP FUNCTION IF EXISTS fn_recalibrate_content();
DROP FUNCTION IF EXISTS fn_cleanup_rate_limit();
DROP FUNCTION IF EXISTS fn_expire_plans();
DROP FUNCTION IF EXISTS fn_cleanup_abandoned_sessions();
DROP FUNCTION IF EXISTS fn_cleanup_idem_keys();
DROP FUNCTION IF EXISTS fn_cleanup_pipeline();
DROP FUNCTION IF EXISTS fn_archive_jobs();
DROP FUNCTION IF EXISTS fn_reap_stuck_jobs();
