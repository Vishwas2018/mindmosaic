-- =============================================================================
-- Migration 0010 — Outbox Dispatcher
-- Stage 10 · 2026-05-03
-- Functions new: 1 (fn_drain_outbox_batch — LANGUAGE plpgsql VOLATILE, RETURNS int)
-- Cron jobs new: 1 (outbox.dispatch — every minute, ADR-0018)
-- No new tables; no new SECURITY DEFINER functions.
-- ADR-0018: pg_cron every-minute vs arch "every 2s"; v1.1 upgrade = Database Webhook rewrite.
-- ISSUE-0004: outbox_event 7-day cleanup (arch §5.6) deferred to Stage 14.
-- X1 privilege hardening: triple REVOKE (PUBLIC/authenticated/anon) + GRANT to service_role.
--   fn_drain_outbox_batch is not SECURITY DEFINER; Supabase may auto-grant EXECUTE to PUBLIC.
--   pg_cron executor (postgres superuser) retains EXECUTE via superuser bypass.
--   Edge Function invocation uses service_role key — explicit GRANT to service_role required.
-- =============================================================================

-- =============================================================================
-- SECTION 1 — FUNCTION
-- =============================================================================

-- fn_drain_outbox_batch: FOR UPDATE SKIP LOCKED batch drain of outbox_event → job_queue.
-- Returns INT (count of events drained) for observability — pg_cron logs the return value.
-- LANGUAGE plpgsql required: RAISE EXCEPTION on unknown event_type (not possible in LANGUAGE sql).
-- outbox_event has no tenant_id column; job_queue.tenant_id is nullable — omitted from INSERT.
CREATE OR REPLACE FUNCTION public.fn_drain_outbox_batch(
  batch_size int DEFAULT 100
)
RETURNS int
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  event   outbox_event%ROWTYPE;
  drained int := 0;
  j_type  text;
  j_pri   text;
  j_pay   jsonb;
BEGIN
  FOR event IN
    SELECT * FROM outbox_event
    WHERE processed_at IS NULL
    ORDER BY created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    IF event.event_type = 'session.submitted' THEN
      j_type := 'pipeline.run_sync';
      j_pri  := 'high';
      j_pay  := jsonb_build_object('session_id', event.aggregate_id);
    ELSIF event.event_type = 'assignment.published' THEN
      j_type := 'notification.create';
      j_pri  := 'medium';
      j_pay  := jsonb_build_object('assignment_id', event.aggregate_id);
    ELSE
      RAISE EXCEPTION 'unknown outbox event_type: %', event.event_type;
    END IF;

    INSERT INTO job_queue (job_type, idempotency_key, payload, priority)
    VALUES (
      j_type,
      'outbox:' || event.id::text,
      j_pay,
      j_pri::job_priority
    )
    ON CONFLICT DO NOTHING;

    UPDATE outbox_event SET processed_at = now() WHERE id = event.id;
    drained := drained + 1;
  END LOOP;

  RETURN drained;
END;
$$;

-- =============================================================================
-- SECTION 2 — EXECUTE PRIVILEGE HARDENING (X1)
-- =============================================================================
-- Triple REVOKE: Supabase may auto-grant EXECUTE to PUBLIC on LANGUAGE plpgsql functions.
-- Idempotent if no auto-grant occurred. GRANT to service_role: required for Edge Function
-- invocation via Supabase RPC (service_role key). pg_cron executor (postgres superuser)
-- retains EXECUTE via superuser bypass — no explicit GRANT needed for cron.

REVOKE EXECUTE ON FUNCTION public.fn_drain_outbox_batch(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_drain_outbox_batch(int) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_drain_outbox_batch(int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.fn_drain_outbox_batch(int) TO   service_role;

-- =============================================================================
-- SECTION 3 — CRON REGISTRATION (unschedule-first, ADR-0017 + ADR-0018)
-- =============================================================================

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'outbox.dispatch';
SELECT cron.schedule('outbox.dispatch', '* * * * *', 'SELECT fn_drain_outbox_batch()');
