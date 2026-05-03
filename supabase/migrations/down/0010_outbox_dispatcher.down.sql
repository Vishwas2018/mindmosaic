-- =============================================================================
-- Down Migration 0010 — Outbox Dispatcher (reverse)
-- Unschedule cron job; drop function.
-- No tables created in Migration 0010 — no DROP TABLE needed.
-- =============================================================================

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'outbox.dispatch';
DROP FUNCTION IF EXISTS public.fn_drain_outbox_batch(int);
