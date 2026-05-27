-- =============================================================================
-- rls-check-e2e.sql — E2E RLS probe + ISSUE-0060 partition decision gate
-- =============================================================================
--
-- Purpose: resolve ISSUE-0060 empirically AND verify item/item_version/write
-- RLS coverage for the preview gate.
--
-- Precondition: seed-e2e.ts has been run (active items + pathway seeded).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/rls-check-e2e.sql
--
-- Query map:
--   q1  item SELECT (student, positive test)
--   q2  learning_event_default SELECT (anon)        ← ISSUE-0060 decision
--   q3  pathway + framework_config chain (student, positive test)
--   q4  intelligence_audit_log_default SELECT (anon) ← ISSUE-0060 decision
--   q5  item_version non-current SELECT (student, additional coverage)
--   q6  item INSERT (student, additional coverage)
--
-- Three states per query:
--   0_ROWS         query returned 0 rows  (filtered by RLS — safe)
--   N_ROWS(n)      query returned n rows  (visible — LEAK if unexpected)
--   ERROR(code)    query raised exception (blocked — safe for SELECT probes)
--
-- ISSUE-0060 decision (q2 + q4):
--   0_ROWS or ERROR → _default partition inherits parent RLS → false positive → close
--   N_ROWS          → partition bypasses RLS → REAL issue → migration 0025 required
--
-- Setup inserts one probe row into each _default partition as superuser using
-- session_replication_role=replica to bypass FK triggers. The rows are never
-- committed; ROLLBACK at the end cleans everything.
--
-- Runs in BEGIN…ROLLBACK — no data persists regardless of pass/fail.
-- ON_ERROR_STOP off ensures ROLLBACK executes even when a RAISE EXCEPTION fires.
-- =============================================================================

\set ON_ERROR_STOP off

BEGIN;

DO $$
DECLARE
  v_count   int;
  v_outcome text;
  v_pass    boolean;
  v_all_ok  boolean := true;

  -- Probe row IDs (deterministic, don't collide with real data)
  v_le_id  uuid := '00000000-e2e1-0000-0000-000000000001';
  v_ial_id uuid := '00000000-e2e1-0000-0000-000000000002';

  -- Fake UUIDs for FK columns bypassed via session_replication_role=replica
  v_fake1  uuid := '00000000-0000-0000-0000-00000000ffff';
  v_fake2  uuid := '00000000-0000-0000-0000-0000ffffffff';
  v_fake3  uuid := '00000000-0000-0000-0000-ffffffffffff';
BEGIN

  -- ── GUARD 1: must be executing as a superuser ──────────────────────────────
  -- Running as 'authenticated' (wrong DATABASE_URL) means SET LOCAL ROLE becomes
  -- a no-op for role-switching to less-privileged roles — all probes false-green.

  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION
      'GUARD 1 FAIL: executing as % (not superuser). '
      'rls-check-e2e must connect as postgres (or equivalent superuser) so '
      'SET LOCAL ROLE actually drops privilege. Check DATABASE_URL.',
      current_user;
  END IF;

  RAISE NOTICE 'GUARD 1 PASS: executing as % (superuser=true)', current_user;

  -- ── GUARD 2: authenticated AND anon must NOT have BYPASSRLS ─────────────────
  -- Either role with BYPASSRLS makes every probe meaningless regardless of policy.

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'GUARD 2 FAIL: role "authenticated" does not exist in this database.';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION
      'GUARD 2 FAIL: role "authenticated" has BYPASSRLS=true — '
      'RLS policies are bypassed; probe results would be meaningless.';
  END IF;
  RAISE NOTICE 'GUARD 2a PASS: "authenticated" rolbypassrls=false';

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE EXCEPTION 'GUARD 2 FAIL: role "anon" does not exist in this database.';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE EXCEPTION
      'GUARD 2 FAIL: role "anon" has BYPASSRLS=true — '
      'RLS policies are bypassed; q2 and q4 would false-green.';
  END IF;
  RAISE NOTICE 'GUARD 2b PASS: "anon" rolbypassrls=false';

  -- ── SETUP: insert probe rows bypassing FK triggers ───────────────────────────
  -- session_replication_role=replica disables FK RI triggers (superuser only).
  -- is_local=true: setting reverts at ROLLBACK.
  -- The rows never commit; ROLLBACK cleans them without FK violation.
  -- Without real rows in the partitions a "0_ROWS" result is ambiguous
  -- (empty table vs. RLS filtering). These inserts remove the ambiguity.

  PERFORM set_config('session_replication_role', 'replica', true);

  -- Probe row for q2: learning_event_default
  -- Required NOT NULL: student_id, tenant_id, session_id, event_type, sequence_number
  -- Defaults for: id, created_at, duration_ms, metadata
  INSERT INTO learning_event_default (
    id, student_id, tenant_id, session_id, event_type, sequence_number
  ) VALUES (
    v_le_id, v_fake1, v_fake2, v_fake3, 'answer', 1
  ) ON CONFLICT DO NOTHING;

  -- Probe row for q4: intelligence_audit_log_default
  -- Required NOT NULL: student_id, tenant_id, event_type, input_snapshot, output, layer, algorithm_version
  -- Default for: id, created_at
  INSERT INTO intelligence_audit_log_default (
    id, student_id, tenant_id, event_type, input_snapshot, output, layer, algorithm_version
  ) VALUES (
    v_ial_id, v_fake1, v_fake2, 'probe', '{"_probe":true}', '{"_probe":true}', 'L1', 'e2e-probe'
  ) ON CONFLICT DO NOTHING;

  -- Probe row for q5: non-current item_version (item #9 from seed-e2e.ts)
  INSERT INTO item_version (
    item_id, version, stem, response_config, difficulty, is_current, authoring_method
  ) VALUES (
    '00000000-e2e0-0000-0000-000000000009',
    99,
    '{"kind":"plain_text","value":"non-current probe — must not be visible to authenticated"}',
    '{"options":["a","b","c","d"],"correct_option_id":"a"}',
    0.5,
    false,
    'human'
  ) ON CONFLICT (item_id, version) DO NOTHING;

  -- Restore normal FK checking (RLS is unaffected by this setting)
  PERFORM set_config('session_replication_role', 'origin', true);

  RAISE NOTICE 'SETUP: probe rows inserted (3 rows, no commit — cleaned by ROLLBACK)';
  RAISE NOTICE '';
  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'query', 'expected', 'actual', 'status';
  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    repeat('-', 58), repeat('-', 16), repeat('-', 24), repeat('-', 6);

  -- ══ q1: item SELECT (authenticated + student JWT, positive test) ══════════════

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"e2e-rls-student","app_metadata":{"role":"student"}}',
    true
  );
  SET LOCAL ROLE authenticated;

  -- GUARD 3: confirm SET LOCAL ROLE actually dropped privilege
  IF (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION
      'GUARD 3 FAIL: SET LOCAL ROLE authenticated did not drop superuser. '
      'current_user=% is still superuser — check role configuration.', current_user;
  END IF;
  RAISE NOTICE 'GUARD 3 PASS: SET LOCAL ROLE → current_user=% (superuser=false)', current_user;

  BEGIN
    SELECT count(*) INTO v_count
    FROM item
    WHERE lifecycle = 'active' AND is_active = true;

    v_outcome := CASE WHEN v_count > 0 THEN 'N_ROWS(' || v_count || ')' ELSE '0_ROWS' END;
    v_pass    := v_count > 0;
  EXCEPTION WHEN OTHERS THEN
    v_outcome := 'ERROR(' || SQLSTATE || ')';
    v_pass    := false;
  END;

  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'q1  item SELECT lifecycle=active (student)',
    'N_ROWS',
    v_outcome,
    CASE WHEN v_pass THEN 'PASS' ELSE 'FAIL ← seed missing active items' END;
  v_all_ok := v_all_ok AND v_pass;

  RESET ROLE;

  -- ══ q2: learning_event_default SELECT (anon) — ISSUE-0060 decision ═══════════
  -- Expected: 0_ROWS or ERROR.
  -- N_ROWS → _default partition does NOT inherit parent RLS → ISSUE-0060 is REAL
  --           → migration 0025: ENABLE RLS + USING(false) deny on _default partitions.
  -- 0_ROWS → partition inherits parent RLS (no anon policy → default deny) → false positive.
  -- ERROR  → anon cannot access table at all (schema USAGE or SELECT grant missing) → safe.

  PERFORM set_config('request.jwt.claims', '{}', true);
  SET LOCAL ROLE anon;

  IF (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'GUARD 4 FAIL: SET LOCAL ROLE anon did not drop superuser.';
  END IF;
  RAISE NOTICE 'GUARD 4 PASS: SET LOCAL ROLE → current_user=% (superuser=false)', current_user;

  BEGIN
    SELECT count(*) INTO v_count FROM learning_event_default;

    v_outcome := CASE WHEN v_count = 0 THEN '0_ROWS' ELSE 'N_ROWS(' || v_count || ')' END;
    v_pass    := v_count = 0;  -- N_ROWS means RLS leak
  EXCEPTION WHEN OTHERS THEN
    v_outcome := 'ERROR(' || SQLSTATE || ')';
    v_pass    := true;  -- blocked at grant level → also safe
  END;

  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'q2  learning_event_default (anon) [ISSUE-0060]',
    '0_ROWS or ERROR',
    v_outcome,
    CASE WHEN v_pass
      THEN 'PASS → ISSUE-0060 false positive'
      ELSE 'FAIL → ISSUE-0060 REAL need migration 0025'
    END;
  v_all_ok := v_all_ok AND v_pass;

  RESET ROLE;

  -- ══ q3: pathway + framework_config chain (authenticated + student JWT, positive) ══

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"e2e-rls-student","app_metadata":{"role":"student"}}',
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT count(*) INTO v_count
    FROM pathway p
    JOIN framework_config fc ON fc.id = p.framework_config_id
    WHERE p.is_active = true;

    v_outcome := CASE WHEN v_count > 0 THEN 'N_ROWS(' || v_count || ')' ELSE '0_ROWS' END;
    v_pass    := v_count > 0;
  EXCEPTION WHEN OTHERS THEN
    v_outcome := 'ERROR(' || SQLSTATE || ')';
    v_pass    := false;
  END;

  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'q3  pathway+framework_config chain (student)',
    'N_ROWS',
    v_outcome,
    CASE WHEN v_pass THEN 'PASS' ELSE 'FAIL ← seed or RLS issue on pathway/fc' END;
  v_all_ok := v_all_ok AND v_pass;

  RESET ROLE;

  -- ══ q4: intelligence_audit_log_default SELECT (anon) — ISSUE-0060 decision ════
  -- Same decision logic as q2.

  PERFORM set_config('request.jwt.claims', '{}', true);
  SET LOCAL ROLE anon;

  BEGIN
    SELECT count(*) INTO v_count FROM intelligence_audit_log_default;

    v_outcome := CASE WHEN v_count = 0 THEN '0_ROWS' ELSE 'N_ROWS(' || v_count || ')' END;
    v_pass    := v_count = 0;
  EXCEPTION WHEN OTHERS THEN
    v_outcome := 'ERROR(' || SQLSTATE || ')';
    v_pass    := true;
  END;

  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'q4  intelligence_audit_log_default (anon) [ISSUE-0060]',
    '0_ROWS or ERROR',
    v_outcome,
    CASE WHEN v_pass
      THEN 'PASS → ISSUE-0060 false positive'
      ELSE 'FAIL → ISSUE-0060 REAL need migration 0025'
    END;
  v_all_ok := v_all_ok AND v_pass;

  RESET ROLE;

  -- ══ q5: item_version non-current (authenticated + student JWT, additional) ══════
  -- Policy "item_version_current_select" USING (is_current = true) must filter
  -- the probe row (version 99, is_current=false) inserted in setup.
  -- 0_ROWS → PASS (non-current versions hidden — defence-in-depth layer working)
  -- N_ROWS → FAIL (non-current versions visible to authenticated — RLS gap)

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"e2e-rls-student","app_metadata":{"role":"student"}}',
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT count(*) INTO v_count
    FROM item_version
    WHERE is_current = false;

    v_outcome := CASE WHEN v_count = 0 THEN '0_ROWS' ELSE 'N_ROWS(' || v_count || ')' END;
    v_pass    := v_count = 0;
  EXCEPTION WHEN OTHERS THEN
    v_outcome := 'ERROR(' || SQLSTATE || ')';
    v_pass    := false;  -- SELECT should not ERROR; investigate if it does
  END;

  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'q5  item_version is_current=false (student)',
    '0_ROWS',
    v_outcome,
    CASE WHEN v_pass THEN 'PASS' ELSE 'FAIL ← RLS LEAK non-current versions visible' END;
  v_all_ok := v_all_ok AND v_pass;

  -- ══ q6: item INSERT (authenticated + student JWT, additional) ══════════════════
  -- Policy "item_admin_insert" WITH CHECK (auth_role() = 'platform_admin').
  -- student → auth_role() = 'student' → check fails → ERROR(42501).
  -- INSERT SUCCEEDED → critical leak.

  BEGIN
    INSERT INTO item (response_type, skill_ids, difficulty, year_levels, exam_families)
    VALUES (
      'mcq',
      ARRAY['aaaaaaaa-e2e0-0000-0000-000000000001']::uuid[],
      0.5,
      ARRAY[5]::int[],
      ARRAY['au_numeracy_y5_format']::exam_family[]
    );

    v_outcome := 'INSERT_SUCCEEDED';
    v_pass    := false;
  EXCEPTION WHEN insufficient_privilege THEN
    v_outcome := 'ERROR(42501)';
    v_pass    := true;
  WHEN OTHERS THEN
    v_outcome := 'ERROR(' || SQLSTATE || ':' || left(SQLERRM, 40) || ')';
    v_pass    := false;
  END;

  RAISE NOTICE '  %-58s  %-16s  %-24s  %s',
    'q6  item INSERT (student)',
    'ERROR(42501)',
    v_outcome,
    CASE WHEN v_pass THEN 'PASS' ELSE 'FAIL ← RLS LEAK student can insert items' END;
  v_all_ok := v_all_ok AND v_pass;

  RESET ROLE;

  -- ── Final verdict ─────────────────────────────────────────────────────────────

  RAISE NOTICE '';
  IF NOT v_all_ok THEN
    RAISE EXCEPTION
      'rls-check-e2e: one or more checks FAILED — see NOTICE output above. '
      'If q2 or q4 failed: file migration 0025 to ENABLE RLS + add USING(false) '
      'deny policy on learning_event_default and intelligence_audit_log_default.';
  END IF;
  RAISE NOTICE 'rls-check-e2e: all checks PASS';

END;
$$;

-- ROLLBACK discards all setup rows (learning_event_default, intelligence_audit_log_default,
-- item_version probe) and any session_replication_role or role changes.
-- The NOTICE output is already printed; results are visible regardless.
ROLLBACK;
