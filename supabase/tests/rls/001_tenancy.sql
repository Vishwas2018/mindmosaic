-- =============================================================================
-- pgTAP Test: 001_tenancy.sql
-- Stage 2 · 2026-05-01
-- plan(65)
-- Tests: RLS enabled (G1×7), helper shape (G2×20), trigger shape (G3×1),
--        parent signup functional (G4×4), non-parent raises (G5×1),
--        SELECT isolation (G6×12), admin_action_log deny (G7×4),
--        DML isolation (G8×12), set_updated_at (G9×4)
-- Note: plan count corrected from 66→65 during execution (planning arithmetic
--       error: 7+20+1+4+1+12+4+12+4=65, not 66). Delta noted in DAILY_LOG.
--
-- Role strategy:
--   G1–G5, G6-seed, G9: run as postgres (service role) — table writes and
--     auth.users inserts require superuser; catalog queries bypass RLS fine.
--   G6-assertions, G7, G8: SET ROLE authenticated + JWT claims — RLS is
--     enforced for the 'authenticated' role; postgres bypasses RLS silently.
--
-- DML-CTE pattern (G7, G8): data-modifying CTEs must be at the top level of
--   a statement (Postgres restriction). Pattern used throughout:
--     WITH x AS (INSERT/UPDATE/DELETE ... RETURNING 1)
--     SELECT is((SELECT COUNT(*)::int FROM x), 0, 'msg');
--   RLS deny-by-default returns 0 rows silently (no exception) for all DML
--   operations when no matching FOR INSERT/UPDATE/DELETE policy exists.
-- =============================================================================

BEGIN;
SELECT plan(65);

-- =============================================================================
-- G1 — RLS enabled on all 7 tables (7 assertions)
-- =============================================================================

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'tenant'),
  true,
  'G1.1: RLS enabled on tenant'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'user_profile'),
  true,
  'G1.2: RLS enabled on user_profile'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'parent_student_link'),
  true,
  'G1.3: RLS enabled on parent_student_link'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'class_group'),
  true,
  'G1.4: RLS enabled on class_group'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'class_student'),
  true,
  'G1.5: RLS enabled on class_student'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'feature_flag'),
  true,
  'G1.6: RLS enabled on feature_flag'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'admin_action_log'),
  true,
  'G1.7: RLS enabled on admin_action_log'
);

-- =============================================================================
-- G2 — SECURITY DEFINER helper shape (20 assertions: 5 helpers × 4 each)
-- exists + prosecdef + provolatile='s' + explicit ACL (proacl IS NOT NULL)
-- =============================================================================

-- auth_tenant_id
SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'auth_tenant_id'),
  'G2.1: auth_tenant_id exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_tenant_id'),
  true,
  'G2.2: auth_tenant_id is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_tenant_id'),
  's',
  'G2.3: auth_tenant_id is STABLE'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_tenant_id'),
  'G2.4: auth_tenant_id has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- auth_user_id
SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'auth_user_id'),
  'G2.5: auth_user_id exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_user_id'),
  true,
  'G2.6: auth_user_id is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_user_id'),
  's',
  'G2.7: auth_user_id is STABLE'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_user_id'),
  'G2.8: auth_user_id has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- auth_role
SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'auth_role'),
  'G2.9: auth_role exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_role'),
  true,
  'G2.10: auth_role is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_role'),
  's',
  'G2.11: auth_role is STABLE'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'auth_role'),
  'G2.12: auth_role has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- fn_user_in_my_tenant
SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'fn_user_in_my_tenant'),
  'G2.13: fn_user_in_my_tenant exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_user_in_my_tenant'),
  true,
  'G2.14: fn_user_in_my_tenant is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_user_in_my_tenant'),
  's',
  'G2.15: fn_user_in_my_tenant is STABLE'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_user_in_my_tenant'),
  'G2.16: fn_user_in_my_tenant has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- fn_class_in_my_tenant
SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'fn_class_in_my_tenant'),
  'G2.17: fn_class_in_my_tenant exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_class_in_my_tenant'),
  true,
  'G2.18: fn_class_in_my_tenant is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_class_in_my_tenant'),
  's',
  'G2.19: fn_class_in_my_tenant is STABLE'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_class_in_my_tenant'),
  'G2.20: fn_class_in_my_tenant has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- =============================================================================
-- G3 — Trigger on_auth_user_created exists on auth.users (1 assertion)
-- =============================================================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND c.relname = 'users'
      AND n.nspname = 'auth'
  ),
  'G3.1: on_auth_user_created trigger exists on auth.users'
);

-- =============================================================================
-- G4 — Parent signup functional (4 assertions) — runs as service role
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, aud, role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'alice-pgtap-' || v_user_id || '@example.com',
    '',
    now(), now(), now(),
    jsonb_build_object('role', 'parent', 'display_name', 'Alice Test'),
    'authenticated',
    'authenticated'
  );
END;
$$;

SELECT ok(
  EXISTS (SELECT 1 FROM auth.users WHERE raw_user_meta_data->>'display_name' = 'Alice Test'),
  'G4.1: parent INSERT into auth.users succeeded (trigger did not raise)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM tenant
   WHERE type = 'family' AND name = 'Alice Test''s Family'),
  1,
  'G4.2: family tenant created by handle_new_user'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM user_profile up
    JOIN tenant t ON t.id = up.tenant_id
    WHERE up.role = 'parent'
      AND up.display_name = 'Alice Test'
      AND t.type = 'family'
  ),
  'G4.3: user_profile row created with correct role and tenant_id'
);

SELECT is(
  (SELECT COUNT(*)::int FROM admin_action_log
   WHERE action = 'self_service_signup'
     AND actor_role = 'parent'
     AND entity_type = 'tenant'
     AND actor_id = (
       SELECT id FROM user_profile WHERE display_name = 'Alice Test' LIMIT 1
     )),
  1,
  'G4.4: admin_action_log entry (ADR-0003: actor_role=parent, action=self_service_signup)'
);

-- =============================================================================
-- G5 — Non-parent role raises INVALID_SIGNUP_ROLE (1 assertion)
-- =============================================================================

SELECT throws_like(
  $$INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, aud, role
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'student-reject@example.com', '',
      now(), now(), now(),
      '{"role":"student"}'::jsonb,
      'authenticated', 'authenticated'
    )$$,
  '%INVALID_SIGNUP_ROLE%',
  'G5.1: student INSERT raises INVALID_SIGNUP_ROLE'
);

-- =============================================================================
-- G6 — SELECT isolation: 6 client-readable tables × 2 tenants (12 assertions)
-- Seed runs as service role (postgres); assertions run as authenticated.
-- =============================================================================

-- --- Seed ---
DO $$
DECLARE
  v_tenant_a uuid := gen_random_uuid();
  v_tenant_b uuid := gen_random_uuid();
  v_user_a   uuid := gen_random_uuid();
  v_user_b   uuid := gen_random_uuid();
  v_class_a  uuid := gen_random_uuid();
  v_class_b  uuid := gen_random_uuid();
BEGIN
  -- Tenant A
  INSERT INTO tenant (id, name, slug, type)
  VALUES (v_tenant_a, 'Isolation Tenant A', left(v_tenant_a::text,8)||'-ia', 'family');

  INSERT INTO user_profile (id, tenant_id, role, email, display_name)
  VALUES (v_user_a, v_tenant_a, 'parent', 'ia@example.com', 'Iso User A');

  INSERT INTO parent_student_link (parent_id, student_id)
  VALUES (v_user_a, v_user_a);

  INSERT INTO class_group (id, tenant_id, teacher_id, name)
  VALUES (v_class_a, v_tenant_a, v_user_a, 'Iso Class A');

  INSERT INTO class_student (class_id, student_id) VALUES (v_class_a, v_user_a);

  INSERT INTO feature_flag (tenant_id, feature_key, enabled, source)
  VALUES (v_tenant_a, 'iso.test', true, 'admin_override');

  -- Tenant B
  INSERT INTO tenant (id, name, slug, type)
  VALUES (v_tenant_b, 'Isolation Tenant B', left(v_tenant_b::text,8)||'-ib', 'family');

  INSERT INTO user_profile (id, tenant_id, role, email, display_name)
  VALUES (v_user_b, v_tenant_b, 'parent', 'ib@example.com', 'Iso User B');

  INSERT INTO parent_student_link (parent_id, student_id)
  VALUES (v_user_b, v_user_b);

  INSERT INTO class_group (id, tenant_id, teacher_id, name)
  VALUES (v_class_b, v_tenant_b, v_user_b, 'Iso Class B');

  INSERT INTO class_student (class_id, student_id) VALUES (v_class_b, v_user_b);

  INSERT INTO feature_flag (tenant_id, feature_key, enabled, source)
  VALUES (v_tenant_b, 'iso.test', false, 'admin_override');

  -- Platform-wide default (visible to all authenticated)
  INSERT INTO feature_flag (tenant_id, feature_key, enabled, source)
  VALUES (NULL, 'iso.platform', true, 'subscription')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('test.ta', v_tenant_a::text, true);
  PERFORM set_config('test.tb', v_tenant_b::text, true);
  PERFORM set_config('test.ua', v_user_a::text,   true);
  PERFORM set_config('test.ub', v_user_b::text,   true);
  PERFORM set_config('test.ca', v_class_a::text,  true);
  PERFORM set_config('test.cb', v_class_b::text,  true);
END;
$$;

-- --- Switch to authenticated role + Tenant A JWT ---
SET ROLE authenticated;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ua'),
    'app_metadata', json_build_object(
      'tenant_id', current_setting('test.ta'),
      'role', 'parent'
    )
  )::text,
  true
);

SELECT is(
  (SELECT COUNT(*)::int FROM tenant
   WHERE id = current_setting('test.tb')::uuid),
  0,
  'G6.1: Tenant A JWT: cannot see Tenant B tenant row'
);

SELECT is(
  (SELECT COUNT(*)::int FROM user_profile
   WHERE tenant_id = current_setting('test.tb')::uuid),
  0,
  'G6.2: Tenant A JWT: cannot see Tenant B user_profile rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM parent_student_link
   WHERE parent_id = current_setting('test.ub')::uuid),
  0,
  'G6.3: Tenant A JWT: cannot see Tenant B parent_student_link rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM class_group
   WHERE tenant_id = current_setting('test.tb')::uuid),
  0,
  'G6.4: Tenant A JWT: cannot see Tenant B class_group rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM class_student
   WHERE class_id = current_setting('test.cb')::uuid),
  0,
  'G6.5: Tenant A JWT: cannot see Tenant B class_student rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM feature_flag
   WHERE tenant_id = current_setting('test.tb')::uuid),
  0,
  'G6.6: Tenant A JWT: cannot see Tenant B feature_flag rows'
);

-- Switch to Tenant B JWT (still authenticated role)
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ub'),
    'app_metadata', json_build_object(
      'tenant_id', current_setting('test.tb'),
      'role', 'parent'
    )
  )::text,
  true
);

SELECT is(
  (SELECT COUNT(*)::int FROM tenant
   WHERE id = current_setting('test.ta')::uuid),
  0,
  'G6.7: Tenant B JWT: cannot see Tenant A tenant row'
);

SELECT is(
  (SELECT COUNT(*)::int FROM user_profile
   WHERE tenant_id = current_setting('test.ta')::uuid),
  0,
  'G6.8: Tenant B JWT: cannot see Tenant A user_profile rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM parent_student_link
   WHERE parent_id = current_setting('test.ua')::uuid),
  0,
  'G6.9: Tenant B JWT: cannot see Tenant A parent_student_link rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM class_group
   WHERE tenant_id = current_setting('test.ta')::uuid),
  0,
  'G6.10: Tenant B JWT: cannot see Tenant A class_group rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM class_student
   WHERE class_id = current_setting('test.ca')::uuid),
  0,
  'G6.11: Tenant B JWT: cannot see Tenant A class_student rows'
);

SELECT is(
  (SELECT COUNT(*)::int FROM feature_flag
   WHERE tenant_id = current_setting('test.ta')::uuid),
  0,
  'G6.12: Tenant B JWT: cannot see Tenant A feature_flag rows'
);

-- =============================================================================
-- G7 — admin_action_log deny-all from authenticated JWT (4 assertions)
-- Still on authenticated role + Tenant B JWT from G6.
-- G7.1: SELECT → 0 rows (no SELECT policy).
-- G7.2: INSERT → throws_ok (42501). RLS raises for INSERT when no INSERT policy
--   exists; this differs from UPDATE/DELETE which silently return 0 rows.
--   Surprise vs plan: INSERT raises, not zero-rows. Noted in DAILY_LOG.
-- G7.3/G7.4: UPDATE/DELETE → 0 rows silently (no visible rows via no SELECT policy).
-- =============================================================================

SELECT is(
  (SELECT COUNT(*)::int FROM admin_action_log),
  0,
  'G7.1: authenticated JWT: SELECT on admin_action_log returns 0 rows'
);

SELECT throws_ok(
  $$INSERT INTO admin_action_log (actor_id, actor_role, action, entity_type)
    VALUES (
      current_setting('test.ub')::uuid,
      'parent',
      'test_insert_deny',
      'test'
    )$$,
  '42501',
  NULL,
  'G7.2: authenticated JWT: INSERT into admin_action_log raises RLS violation (42501)'
);

WITH x AS (
  UPDATE admin_action_log
  SET action = 'tampered'
  WHERE actor_id = current_setting('test.ub')::uuid
  RETURNING 1
)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G7.3: authenticated JWT: UPDATE on admin_action_log returns 0 rows');

WITH x AS (
  DELETE FROM admin_action_log
  WHERE actor_id = current_setting('test.ub')::uuid
  RETURNING 1
)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G7.4: authenticated JWT: DELETE from admin_action_log returns 0 rows');

-- =============================================================================
-- G8 — DML isolation: Tenant A JWT cannot UPDATE/DELETE Tenant B rows
-- Switch back to Tenant A JWT; still authenticated role. (12 assertions)
-- DML-CTE pattern: top-level WITH required; RLS deny returns 0 rows silently.
-- =============================================================================

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ua'),
    'app_metadata', json_build_object(
      'tenant_id', current_setting('test.ta'),
      'role', 'parent'
    )
  )::text,
  true
);

WITH x AS (UPDATE tenant SET name = 'tampered'
           WHERE id = current_setting('test.tb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.1: Tenant A JWT: UPDATE Tenant B tenant → 0 rows');

WITH x AS (DELETE FROM tenant
           WHERE id = current_setting('test.tb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.2: Tenant A JWT: DELETE Tenant B tenant → 0 rows');

WITH x AS (UPDATE user_profile SET display_name = 'tampered'
           WHERE id = current_setting('test.ub')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.3: Tenant A JWT: UPDATE Tenant B user_profile → 0 rows');

WITH x AS (DELETE FROM user_profile
           WHERE id = current_setting('test.ub')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.4: Tenant A JWT: DELETE Tenant B user_profile → 0 rows');

WITH x AS (UPDATE parent_student_link SET created_at = now()
           WHERE parent_id = current_setting('test.ub')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.5: Tenant A JWT: UPDATE Tenant B parent_student_link → 0 rows');

WITH x AS (DELETE FROM parent_student_link
           WHERE parent_id = current_setting('test.ub')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.6: Tenant A JWT: DELETE Tenant B parent_student_link → 0 rows');

WITH x AS (UPDATE class_group SET name = 'tampered'
           WHERE id = current_setting('test.cb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.7: Tenant A JWT: UPDATE Tenant B class_group → 0 rows');

WITH x AS (DELETE FROM class_group
           WHERE id = current_setting('test.cb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.8: Tenant A JWT: DELETE Tenant B class_group → 0 rows');

WITH x AS (UPDATE class_student SET created_at = now()
           WHERE class_id = current_setting('test.cb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.9: Tenant A JWT: UPDATE Tenant B class_student → 0 rows');

WITH x AS (DELETE FROM class_student
           WHERE class_id = current_setting('test.cb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.10: Tenant A JWT: DELETE Tenant B class_student → 0 rows');

WITH x AS (UPDATE feature_flag SET enabled = false
           WHERE tenant_id = current_setting('test.tb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.11: Tenant A JWT: UPDATE Tenant B feature_flag → 0 rows');

WITH x AS (DELETE FROM feature_flag
           WHERE tenant_id = current_setting('test.tb')::uuid RETURNING 1)
SELECT is((SELECT COUNT(*)::int FROM x), 0,
  'G8.12: Tenant A JWT: DELETE Tenant B feature_flag → 0 rows');

-- =============================================================================
-- G9 — set_updated_at fires on all 4 mutable tables (4 assertions)
-- Switch back to service role for direct INSERT/UPDATE.
-- DML-CTE pattern: top-level WITH; b captures before-value, a performs update
--   and returns after-value. Both CTEs share the same snapshot so b reads the
--   pre-update row and a's RETURNING gives the post-update value.
-- =============================================================================

RESET ROLE;

-- Seed with a sentinel updated_at in the past. The trigger must overwrite it
-- with now(). Avoids the transaction-time issue (now() is constant within a
-- transaction, so before/after comparisons on the same now() always return false).
DO $$
DECLARE
  v_t uuid; v_u uuid; v_c uuid; v_f uuid;
  sentinel CONSTANT timestamptz := '2000-01-01 00:00:00+00';
BEGIN
  INSERT INTO tenant (name, slug, type, updated_at)
  VALUES ('Trigger Test', 'trig-' || left(gen_random_uuid()::text,8), 'family', sentinel)
  RETURNING id INTO v_t;

  INSERT INTO user_profile (id, tenant_id, role, display_name, updated_at)
  VALUES (gen_random_uuid(), v_t, 'parent', 'TrigUser', sentinel)
  RETURNING id INTO v_u;

  INSERT INTO class_group (tenant_id, teacher_id, name, updated_at)
  VALUES (v_t, v_u, 'TrigClass', sentinel)
  RETURNING id INTO v_c;

  INSERT INTO feature_flag (tenant_id, feature_key, enabled, source, updated_at)
  VALUES (v_t, 'trig.key', false, 'subscription', sentinel)
  RETURNING id INTO v_f;

  PERFORM set_config('test.tt', v_t::text, true);
  PERFORM set_config('test.tu', v_u::text, true);
  PERFORM set_config('test.tc', v_c::text, true);
  PERFORM set_config('test.tf', v_f::text, true);
END;
$$;

WITH a AS (UPDATE tenant SET name = name
           WHERE id = current_setting('test.tt')::uuid RETURNING updated_at)
SELECT ok(
  (SELECT updated_at > '2000-01-01'::timestamptz FROM a),
  'G9.1: set_updated_at fires on tenant UPDATE'
);

WITH a AS (UPDATE user_profile SET display_name = display_name
           WHERE id = current_setting('test.tu')::uuid RETURNING updated_at)
SELECT ok(
  (SELECT updated_at > '2000-01-01'::timestamptz FROM a),
  'G9.2: set_updated_at fires on user_profile UPDATE'
);

WITH a AS (UPDATE class_group SET name = name
           WHERE id = current_setting('test.tc')::uuid RETURNING updated_at)
SELECT ok(
  (SELECT updated_at > '2000-01-01'::timestamptz FROM a),
  'G9.3: set_updated_at fires on class_group UPDATE'
);

WITH a AS (UPDATE feature_flag SET enabled = enabled
           WHERE id = current_setting('test.tf')::uuid RETURNING updated_at)
SELECT ok(
  (SELECT updated_at > '2000-01-01'::timestamptz FROM a),
  'G9.4: set_updated_at fires on feature_flag UPDATE'
);

SELECT * FROM finish();
ROLLBACK;
