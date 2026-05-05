-- Migration 0012 — widen create_session_response_atomic for engine_state_snapshot
--
-- Stage 19, Q-19.1: assessment-svc threads EngineState through respond/submit
-- cycles. The Stage 4 RPC bumps version + writes session_response +
-- response_telemetry + learning_event atomically, but does NOT touch
-- session_record.engine_state_snapshot — leaving engine state divergence
-- possible if a non-atomic post-RPC UPDATE fails. Replay determinism
-- (Stage 26 exit criterion) requires engine-state ↔ session-response atomicity.
--
-- This migration replaces the 10-arg signature with an 11-arg one taking
-- p_engine_state jsonb as the new last parameter. The UPDATE on session_record
-- now writes engine_state_snapshot in the same statement that bumps version +
-- items_answered.
--
-- Behaviour preserved verbatim except for the new column write:
--   - status='active' AND version=p_expected_version row-lock semantics
--   - VERSION_CONFLICT (P0001) on no-row-found
--   - immutable session_response + response_telemetry inserts
--   - learning_event row with event_type='answer'
--
-- SECURITY DEFINER + double-REVOKE + GRANT pattern (ADR-0008/0011) preserved.

-- =============================================================================
-- 1. Drop the Stage 4 10-arg signature so the new 11-arg overload is the
--    canonical path. PostgreSQL distinguishes function overloads by argument
--    list, so without this DROP both would coexist and assessment-svc could
--    accidentally call the old one.
-- =============================================================================

DROP FUNCTION IF EXISTS create_session_response_atomic(
  uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int
);

-- =============================================================================
-- 2. Recreate with p_engine_state jsonb as the 11th parameter.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_session_response_atomic(
  p_session_id        uuid,
  p_expected_version  int,
  p_item_id           uuid,
  p_response_data     jsonb,
  p_is_correct        boolean,
  p_score             real,
  p_difficulty        real,
  p_telemetry         jsonb,
  p_guess_probability real,
  p_answer_changes    int,
  p_engine_state      jsonb     -- Stage 19 widening (Q-19.1)
)
RETURNS TABLE(response_id uuid, event_id uuid, new_sequence int, new_version int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_tenant_id  uuid;
  v_skill_id   uuid;
  v_next_seq   int;
  v_new_version int;
  v_resp_id    uuid;
  v_event_id   uuid;
BEGIN
  -- 1. Atomically bump items_answered, version, and engine_state_snapshot.
  --    Row lock + version match enforces optimistic concurrency.
  UPDATE session_record
     SET items_answered        = items_answered + 1,
         version               = version + 1,
         engine_state_snapshot = p_engine_state,
         updated_at            = now()
   WHERE id      = p_session_id
     AND status  = 'active'
     AND version = p_expected_version
  RETURNING items_answered, version, student_id, tenant_id
    INTO v_next_seq, v_new_version, v_student_id, v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Derive primary skill from item (skill_ids[1] may be NULL if item has no skills)
  SELECT skill_ids[1] INTO v_skill_id FROM item WHERE id = p_item_id;

  -- 3. Write session_response (immutable — no UPDATE policy; only written here)
  INSERT INTO session_response (
    session_id, item_id, student_id, tenant_id,
    sequence_number, response_data, is_correct,
    score, difficulty_at_response
  ) VALUES (
    p_session_id, p_item_id, v_student_id, v_tenant_id,
    v_next_seq, p_response_data, p_is_correct,
    p_score, p_difficulty
  ) RETURNING id INTO v_resp_id;

  -- 4. Write response_telemetry (Pattern G — only written via this function)
  INSERT INTO response_telemetry (
    response_id, time_to_answer_ms, time_to_first_action_ms,
    answer_changes, items_since_session_start, time_since_session_start_ms,
    skipped_then_returned, scroll_to_bottom
  ) VALUES (
    v_resp_id,
    (p_telemetry->>'time_to_answer_ms')::int,
    (p_telemetry->>'time_to_first_action_ms')::int,
    p_answer_changes,
    (p_telemetry->>'items_since_session_start')::int,
    (p_telemetry->>'time_since_session_start_ms')::int,
    COALESCE((p_telemetry->>'skipped_then_returned')::boolean, false),
    (p_telemetry->>'scroll_to_bottom')::boolean
  );

  -- 5. Write learning_event (only written via this function for answer events)
  INSERT INTO learning_event (
    student_id, tenant_id, session_id, item_id, skill_id,
    event_type, correctness, score, duration_ms,
    difficulty_at_event, metadata, sequence_number
  ) VALUES (
    v_student_id, v_tenant_id, p_session_id, p_item_id, v_skill_id,
    'answer', p_is_correct, p_score,
    (p_telemetry->>'time_to_answer_ms')::int,
    p_difficulty,
    jsonb_build_object(
      'response_data',     p_response_data,
      'answer_changes',    p_answer_changes,
      'guess_probability', p_guess_probability
    ),
    v_next_seq
  ) RETURNING id INTO v_event_id;

  RETURN QUERY SELECT v_resp_id, v_event_id, v_next_seq, v_new_version;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb) TO   authenticated;
