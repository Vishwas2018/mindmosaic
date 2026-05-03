-- Rollback migration 0011
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'outbox.cleanup';
DROP FUNCTION IF EXISTS fn_cleanup_outbox();
DROP FUNCTION IF EXISTS fn_check_rate_limit(text, timestamptz, int);
