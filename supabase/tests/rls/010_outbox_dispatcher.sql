-- =============================================================================
-- pgTAP Test: 010_outbox_dispatcher.sql
-- Stage 10 · 2026-05-03
-- plan(11)
--
-- Groups:
--   G_shape       function shape assertions (existence, volatile, language)  =  3
--   G_behavioral  behavioral proofs (drain, mapping, idempotency, raises)    =  8
--                                                                    TOTAL  = 11
-- Cumulative: 440 (prior) + 11 = 451
--
-- fn_drain_outbox_batch: LANGUAGE plpgsql VOLATILE, RETURNS int.
-- All tests run as postgres (superuser) — RLS bypassed on Pattern G tables
-- (outbox_event, job_queue deny all authenticated; service_role + superuser bypass).
-- No new tables in Migration 0010 — no RLS policy tests.
-- SKIP LOCKED: not directly testable in single-session pgTAP (no concurrent connections).
-- Covered indirectly by G_behavioral.6a — second drain returns 0, proving no double-processing.
--
-- Test data UUIDs (00000000-0000-0000-0010-XXXXXXXXXXXX):
--   assignment event id:  00000000-0000-0000-0010-000000000010
--   bad type event id:    00000000-0000-0000-0010-000000000099
-- =============================================================================

BEGIN;

SELECT plan(11);

-- =============================================================================
-- G_shape — function shape assertions (3 tests)
-- =============================================================================

SELECT has_function(
  'public',
  'fn_drain_outbox_batch',
  ARRAY['integer'],
  'G_shape.1: fn_drain_outbox_batch(integer) exists in public schema');

SELECT is(
  (SELECT provolatile::text FROM pg_proc
   WHERE proname        = 'fn_drain_outbox_batch'
     AND pronamespace   = 'public'::regnamespace),
  'v',
  'G_shape.2: fn_drain_outbox_batch is VOLATILE');

SELECT is(
  (SELECT l.lanname FROM pg_proc p
   JOIN pg_language l ON l.oid = p.prolang
   WHERE p.proname      = 'fn_drain_outbox_batch'
     AND p.pronamespace = 'public'::regnamespace),
  'plpgsql',
  'G_shape.3: fn_drain_outbox_batch LANGUAGE is plpgsql');

-- =============================================================================
-- G_behavioral.1 — empty outbox returns 0 (no test data inserted yet)
-- =============================================================================

SELECT is(
  fn_drain_outbox_batch(),
  0,
  'G_behavioral.1: empty outbox returns 0');

-- =============================================================================
-- TEST DATA SETUP — 99 session.submitted + 1 assignment_assigned = 100 events
-- outbox_event has no tenant_id or student_id FKs — no dependent seed rows needed.
-- =============================================================================

INSERT INTO outbox_event (aggregate_type, aggregate_id, event_type, payload)
SELECT
  'session',
  gen_random_uuid(),
  'session.submitted',
  '{}'::jsonb
FROM generate_series(1, 99);

INSERT INTO outbox_event (id, aggregate_type, aggregate_id, event_type, payload)
VALUES (
  '00000000-0000-0000-0010-000000000010',
  'assignment',
  '00000000-0000-0000-0010-000000000010',
  'assignment_assigned',
  '{}'::jsonb
);

-- =============================================================================
-- G_behavioral.2 — 100-event batch returns 100
-- =============================================================================

SELECT is(
  fn_drain_outbox_batch(),
  100,
  'G_behavioral.2: 100-event batch returns 100 drained');

-- =============================================================================
-- G_behavioral.3 — session.submitted produces pipeline.run_sync job_queue rows
-- =============================================================================

SELECT ok(
  EXISTS(
    SELECT 1 FROM job_queue
    WHERE job_type        = 'pipeline.run_sync'
      AND idempotency_key LIKE 'outbox:%'
  ),
  'G_behavioral.3: session.submitted events produce pipeline.run_sync job_queue rows');

-- =============================================================================
-- G_behavioral.4 — assignment_assigned produces notification.create job with correct key
-- =============================================================================

SELECT ok(
  EXISTS(
    SELECT 1 FROM job_queue
    WHERE job_type        = 'notification.create'
      AND idempotency_key = 'outbox:00000000-0000-0000-0010-000000000010'
  ),
  'G_behavioral.4: assignment_assigned produces notification.create row with correct idempotency_key');

-- =============================================================================
-- G_behavioral.5 — processed_at set on all 100 drained events
-- =============================================================================

SELECT is(
  (SELECT count(*)::int FROM outbox_event WHERE processed_at IS NOT NULL),
  100,
  'G_behavioral.5: processed_at set on all 100 drained outbox_event rows');

-- =============================================================================
-- G_behavioral.6a — second drain returns 0 (all events already have processed_at set)
-- =============================================================================

SELECT is(
  fn_drain_outbox_batch(),
  0,
  'G_behavioral.6a: second drain of fully-processed outbox returns 0');

-- =============================================================================
-- G_behavioral.6b — no duplicate jobs after second drain (X2)
-- Verifies idempotency guard: exactly 100 job_queue rows with outbox: prefix.
-- "Second call returns 0" alone passes even if duplicates leaked via a race;
-- this assertion closes that gap.
-- =============================================================================

SELECT is(
  (SELECT count(*)::int FROM job_queue WHERE idempotency_key LIKE 'outbox:%'),
  100,
  'G_behavioral.6b: exactly 100 job_queue rows with outbox: prefix — no duplicates from second drain');

-- =============================================================================
-- G_behavioral.7 — unknown event_type raises SQLSTATE P0001
-- Seed one bad event (processed_at NULL → picked up by next drain call).
-- throws_ok uses SAVEPOINT internally; outer transaction remains intact after catch.
-- =============================================================================

INSERT INTO outbox_event (id, aggregate_type, aggregate_id, event_type, payload)
VALUES (
  '00000000-0000-0000-0010-000000000099',
  'unknown',
  '00000000-0000-0000-0010-000000000099',
  'bad.type',
  '{}'::jsonb
);

SELECT throws_ok(
  'SELECT fn_drain_outbox_batch()',
  'P0001',
  'unknown outbox event_type: bad.type',
  'G_behavioral.7: unknown event_type raises SQLSTATE P0001 with descriptive message');

SELECT * FROM finish();
ROLLBACK;
