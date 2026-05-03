-- Migration 0011 — fn_check_rate_limit + outbox.cleanup cron
-- Resolves ISSUE-0004 (outbox_event 7-day purge) and adds RPC used by Edge Functions.
--
-- No new tables, no RLS changes.
-- =============================================================================

-- 1. fn_check_rate_limit — atomic upsert, returns true if within limit
-- Called by auth-svc and users-svc Edge Functions via service role.
CREATE OR REPLACE FUNCTION fn_check_rate_limit(
  p_bucket_key   text,
  p_window_start timestamptz,
  p_limit        int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO rate_limit_bucket (bucket_key, window_start, count, updated_at)
  VALUES (p_bucket_key, p_window_start, 1, now())
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET
    count      = rate_limit_bucket.count + 1,
    updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- 2. fn_cleanup_outbox — purge processed outbox_event rows older than 7 days
-- Resolves ISSUE-0004.
CREATE OR REPLACE FUNCTION fn_cleanup_outbox()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM outbox_event
  WHERE processed_at IS NOT NULL
    AND processed_at < now() - interval '7 days';
$$;

-- Schedule outbox.cleanup daily at 04:15 UTC (offset from other cleanup jobs)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'outbox.cleanup';
SELECT cron.schedule('outbox.cleanup', '15 4 * * *', 'SELECT fn_cleanup_outbox()');
