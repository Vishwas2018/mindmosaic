-- Rollback migration 0012 — restore the Stage 4 10-arg signature of
-- create_session_response_atomic.

DROP FUNCTION IF EXISTS create_session_response_atomic(
  uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int, jsonb
);

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
  p_answer_changes    int
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
  UPDATE session_record
     SET items_answered = items_answered + 1,
         version        = version + 1,
         updated_at     = now()
   WHERE id      = p_session_id
     AND status  = 'active'
     AND version = p_expected_version
  RETURNING items_answered, version, student_id, tenant_id
    INTO v_next_seq, v_new_version, v_student_id, v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  SELECT skill_ids[1] INTO v_skill_id FROM item WHERE id = p_item_id;

  INSERT INTO session_response (
    session_id, item_id, student_id, tenant_id,
    sequence_number, response_data, is_correct,
    score, difficulty_at_response
  ) VALUES (
    p_session_id, p_item_id, v_student_id, v_tenant_id,
    v_next_seq, p_response_data, p_is_correct,
    p_score, p_difficulty
  ) RETURNING id INTO v_resp_id;

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

REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int) FROM anon;
GRANT  EXECUTE ON FUNCTION create_session_response_atomic(uuid, int, uuid, jsonb, boolean, real, real, jsonb, real, int) TO   authenticated;
