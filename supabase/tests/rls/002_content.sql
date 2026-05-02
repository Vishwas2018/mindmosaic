-- =============================================================================
-- pgTAP Test: 002_content.sql
-- Stage 3 · 2026-05-02
-- plan(40)
-- Tests: RLS enabled (G1×9), fn_graph_version_is_published shape (G2×4),
--        publish_skill_graph shape (G3×4), set_updated_at triggers (G4×5),
--        v_item_current (G5×2), cycle detection (G6×4), forked DAG (G7×1),
--        draft isolation pre-publish (G8×3), clean publish (G9×2),
--        draft isolation post-publish (G10×3), G4 guard (G11×2),
--        permission denied (G12×1)
--
-- New pgTAP patterns (per ADR-0006 — skeleton forms required):
--   lives_ok(sql, description)  — asserts SQL executes without raising
--   SET ROLE authenticated       — switches role within transaction for RLS tests
--   CREATE TABLE stub in-transaction — G4 guard test (ADR-0007 concurrency caveat:
--     safe under serial execution only; see ADR-0007 §Concurrency caveat)
--
-- Role strategy:
--   G1–G5, G4 trigger DML, G6–G7, G9, G11: run as postgres (service role)
--   G8, G10, G12: SET ROLE authenticated — RLS enforced for authenticated role
--     Content tables use status/published predicate; no tenant_id in JWT needed.
--
-- Test graph UUIDs (explicit for reproducibility):
--   graph_a: 00000000-0000-0000-0000-0000000000a1  (prerequisite cycle A→B→A)
--   graph_b: 00000000-0000-0000-0000-0000000000b1  (related-only A↔B, no prereq cycle)
--   graph_c: 00000000-0000-0000-0000-0000000000c1  (forked DAG: A→C, B→C)
--   graph_d: 00000000-0000-0000-0000-0000000000d1  (clean linear DAG A→B→C)
--   graph_e: 00000000-0000-0000-0000-0000000000e1  (G4 guard test: A→B)
-- =============================================================================

BEGIN;
SELECT plan(40);

-- =============================================================================
-- G1 — RLS enabled on all 9 Stage 3 tables (9 assertions)
-- =============================================================================

SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'skill_graph_version'),
  true,
  'G1.1: RLS enabled on skill_graph_version'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'skill_node'),
  true,
  'G1.2: RLS enabled on skill_node'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'skill_edge'),
  true,
  'G1.3: RLS enabled on skill_edge'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'skill_migration_map'),
  true,
  'G1.4: RLS enabled on skill_migration_map'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'misconception'),
  true,
  'G1.5: RLS enabled on misconception'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'repair_sequence'),
  true,
  'G1.6: RLS enabled on repair_sequence'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stimulus'),
  true,
  'G1.7: RLS enabled on stimulus'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item'),
  true,
  'G1.8: RLS enabled on item'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_version'),
  true,
  'G1.9: RLS enabled on item_version'
);

-- =============================================================================
-- G2 — fn_graph_version_is_published shape (4 assertions)
-- Checks: exists, SECURITY DEFINER, STABLE, explicit ACL (REVOKE FROM PUBLIC applied)
-- =============================================================================

SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'fn_graph_version_is_published'),
  'G2.1: fn_graph_version_is_published exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_graph_version_is_published'),
  true,
  'G2.2: fn_graph_version_is_published is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_graph_version_is_published'),
  's',
  'G2.3: fn_graph_version_is_published is STABLE'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_graph_version_is_published'),
  'G2.4: fn_graph_version_is_published has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- =============================================================================
-- G3 — publish_skill_graph shape (4 assertions)
-- Checks: exists, SECURITY DEFINER, VOLATILE (modifies data), explicit ACL
-- =============================================================================

SELECT ok(
  EXISTS (SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'publish_skill_graph'),
  'G3.1: publish_skill_graph exists'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'publish_skill_graph'),
  true,
  'G3.2: publish_skill_graph is SECURITY DEFINER'
);
SELECT is(
  (SELECT provolatile FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'publish_skill_graph'),
  'v',
  'G3.3: publish_skill_graph is VOLATILE (modifies data)'
);
SELECT ok(
  (SELECT proacl IS NOT NULL FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'publish_skill_graph'),
  'G3.4: publish_skill_graph has explicit ACL (REVOKE FROM PUBLIC applied)'
);

-- =============================================================================
-- G4 — set_updated_at triggers fire on UPDATE (5 assertions)
-- Sentinel pattern: INSERT with updated_at='2000-01-01', then UPDATE a non-sentinel
-- column, then assert updated_at > '2000-01-01'. within-transaction now() is
-- constant, so before/after comparison would always be equal (DAILY_LOG Stage 2).
-- skill_graph_version INSERT used as parent for the skill_node trigger test.
-- =============================================================================

-- G4.1: skill_graph_version
INSERT INTO skill_graph_version (id, version, status, updated_at)
VALUES ('11111111-0000-0000-0000-000000000001', 999, 'draft', '2000-01-01');

UPDATE skill_graph_version
   SET description = 'trigger-test'
 WHERE id = '11111111-0000-0000-0000-000000000001';

SELECT ok(
  (SELECT updated_at FROM skill_graph_version
   WHERE id = '11111111-0000-0000-0000-000000000001') > '2000-01-01'::timestamptz,
  'G4.1: set_updated_at fires on skill_graph_version UPDATE'
);

-- G4.2: skill_node (requires a parent graph_version_id)
INSERT INTO skill_node (id, graph_version_id, level, name, slug, updated_at)
VALUES ('11111111-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000001',
        'skill', 'Trigger Test Node', 'trigger-test-node', '2000-01-01');

UPDATE skill_node
   SET name = 'Trigger Test Node Updated'
 WHERE id = '11111111-0000-0000-0000-000000000002';

SELECT ok(
  (SELECT updated_at FROM skill_node
   WHERE id = '11111111-0000-0000-0000-000000000002') > '2000-01-01'::timestamptz,
  'G4.2: set_updated_at fires on skill_node UPDATE'
);

-- G4.3: misconception
INSERT INTO misconception (id, name, description, category, severity, updated_at)
VALUES ('11111111-0000-0000-0000-000000000003',
        'Trigger Test Misconception', 'test description', 'conceptual', 'minor', '2000-01-01');

UPDATE misconception
   SET description = 'trigger updated'
 WHERE id = '11111111-0000-0000-0000-000000000003';

SELECT ok(
  (SELECT updated_at FROM misconception
   WHERE id = '11111111-0000-0000-0000-000000000003') > '2000-01-01'::timestamptz,
  'G4.3: set_updated_at fires on misconception UPDATE'
);

-- G4.4: repair_sequence (target_id references the misconception row inserted above)
INSERT INTO repair_sequence (id, target_type, target_id, display_name, stages, updated_at)
VALUES ('11111111-0000-0000-0000-000000000004',
        'misconception',
        '11111111-0000-0000-0000-000000000003',
        'Trigger Test Repair',
        '[]'::jsonb,
        '2000-01-01');

UPDATE repair_sequence
   SET display_name = 'Trigger Test Repair Updated'
 WHERE id = '11111111-0000-0000-0000-000000000004';

SELECT ok(
  (SELECT updated_at FROM repair_sequence
   WHERE id = '11111111-0000-0000-0000-000000000004') > '2000-01-01'::timestamptz,
  'G4.4: set_updated_at fires on repair_sequence UPDATE'
);

-- G4.5: item (skill_ids, year_levels, exam_families must be non-empty per CHECK)
INSERT INTO item (id, response_type, skill_ids, difficulty, year_levels, exam_families,
                  lifecycle, updated_at)
VALUES ('11111111-0000-0000-0000-000000000005',
        'mcq',
        ARRAY['ffffffff-0000-0000-0000-000000000001']::uuid[],
        0.5,
        ARRAY[5],
        ARRAY['naplan']::exam_family[],
        'active',
        '2000-01-01');

UPDATE item
   SET current_version = 2
 WHERE id = '11111111-0000-0000-0000-000000000005';

SELECT ok(
  (SELECT updated_at FROM item
   WHERE id = '11111111-0000-0000-0000-000000000005') > '2000-01-01'::timestamptz,
  'G4.5: set_updated_at fires on item UPDATE'
);

-- =============================================================================
-- G5 — v_item_current (2 assertions)
-- Checks: view exists, security_invoker = true (PG 15+ reloptions)
-- =============================================================================

SELECT ok(
  EXISTS (SELECT 1 FROM pg_views
          WHERE schemaname = 'public' AND viewname = 'v_item_current'),
  'G5.1: v_item_current view exists'
);

SELECT ok(
  (SELECT reloptions::text ILIKE '%security_invoker=true%'
   FROM pg_class
   WHERE relname = 'v_item_current'
     AND relkind = 'v'
     AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
  'G5.2: v_item_current has security_invoker = true'
);

-- =============================================================================
-- G6 — Cycle detection (4 assertions)
-- graph_a: A→B→A prerequisite cycle — publish must fail with CYCLE_DETECTED
-- graph_b: A↔B related edges — no prerequisite cycle — publish must succeed
-- =============================================================================

-- Seed graph_a (cyclic prerequisite edges)
INSERT INTO skill_graph_version (id, version, status)
VALUES ('00000000-0000-0000-0000-0000000000a1', 1, 'draft');

INSERT INTO skill_node (id, graph_version_id, level, name, slug)
VALUES
  ('00000000-0000-0000-0000-0000a1000001', '00000000-0000-0000-0000-0000000000a1', 'skill', 'Alpha', 'cycle-alpha'),
  ('00000000-0000-0000-0000-0000a1000002', '00000000-0000-0000-0000-0000000000a1', 'skill', 'Beta',  'cycle-beta');

INSERT INTO skill_edge (graph_version_id, source_id, target_id, edge_type, strength, dependency_class)
VALUES
  ('00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000a1000001',
   '00000000-0000-0000-0000-0000a1000002',
   'prerequisite', 0.9, 'required'),
  ('00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000a1000002',
   '00000000-0000-0000-0000-0000a1000001',
   'prerequisite', 0.9, 'required');

-- Seed graph_b (related edges only — not a prerequisite cycle)
INSERT INTO skill_graph_version (id, version, status)
VALUES ('00000000-0000-0000-0000-0000000000b1', 2, 'draft');

INSERT INTO skill_node (id, graph_version_id, level, name, slug)
VALUES
  ('00000000-0000-0000-0000-0000b1000001', '00000000-0000-0000-0000-0000000000b1', 'skill', 'Gamma', 'related-gamma'),
  ('00000000-0000-0000-0000-0000b1000002', '00000000-0000-0000-0000-0000000000b1', 'skill', 'Delta', 'related-delta');

INSERT INTO skill_edge (graph_version_id, source_id, target_id, edge_type, strength)
VALUES
  ('00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000b1000001',
   '00000000-0000-0000-0000-0000b1000002',
   'related', 0.5),
  ('00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000b1000002',
   '00000000-0000-0000-0000-0000b1000001',
   'related', 0.5);

-- G6.1: throws_ok — cyclic prerequisite graph raises P0001
-- 4-arg form: throws_ok(sql, errcode, errmsg, description) — NULL errmsg skips message check
SELECT throws_ok(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000a1')$$,
  'P0001',
  NULL,
  'G6.1: publish_skill_graph raises P0001 on prerequisite cycle'
);

-- G6.2: graph_a remains draft after failed publish (exception was before STEP 3 archive)
SELECT is(
  (SELECT status FROM skill_graph_version
   WHERE id = '00000000-0000-0000-0000-0000000000a1'),
  'draft'::graph_version_status,
  'G6.2: cyclic graph remains draft after failed publish'
);

-- G6.3: throws_like — exception message contains CYCLE_DETECTED
SELECT throws_like(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000a1')$$,
  '%CYCLE_DETECTED%',
  'G6.3: cycle exception message contains CYCLE_DETECTED'
);

-- G6.4: related-edge "cycle" is not a prerequisite cycle — publish must succeed
-- (graph_b has no prerequisite edges; cycle_check returns no rows)
SELECT lives_ok(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000b1')$$,
  'G6.4: related-only edges are not detected as prerequisite cycle'
);

-- =============================================================================
-- G7 — Forked DAG is valid (1 assertion)
-- graph_c: A→C and B→C (two prerequisites for C) — valid, not a cycle
-- =============================================================================

INSERT INTO skill_graph_version (id, version, status)
VALUES ('00000000-0000-0000-0000-0000000000c1', 3, 'draft');

INSERT INTO skill_node (id, graph_version_id, level, name, slug)
VALUES
  ('00000000-0000-0000-0000-0000c1000001', '00000000-0000-0000-0000-0000000000c1', 'skill', 'Fork A', 'fork-a'),
  ('00000000-0000-0000-0000-0000c1000002', '00000000-0000-0000-0000-0000000000c1', 'skill', 'Fork B', 'fork-b'),
  ('00000000-0000-0000-0000-0000c1000003', '00000000-0000-0000-0000-0000000000c1', 'skill', 'Fork C', 'fork-c');

INSERT INTO skill_edge (graph_version_id, source_id, target_id, edge_type, strength, dependency_class)
VALUES
  ('00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000c1000001',
   '00000000-0000-0000-0000-0000c1000003',
   'prerequisite', 0.9, 'required'),
  ('00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000c1000002',
   '00000000-0000-0000-0000-0000c1000003',
   'prerequisite', 0.9, 'required');

SELECT lives_ok(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000c1')$$,
  'G7.1: forked DAG (shared target node) publishes without cycle error'
);

-- =============================================================================
-- G8 — Draft graph invisible to authenticated (3 assertions — PRE-publish)
-- graph_d is in draft state; authenticated role must see 0 rows.
-- =============================================================================

INSERT INTO skill_graph_version (id, version, status)
VALUES ('00000000-0000-0000-0000-0000000000d1', 4, 'draft');

INSERT INTO skill_node (id, graph_version_id, level, name, slug)
VALUES
  ('00000000-0000-0000-0000-0000d1000001', '00000000-0000-0000-0000-0000000000d1', 'skill', 'Linear A', 'linear-a'),
  ('00000000-0000-0000-0000-0000d1000002', '00000000-0000-0000-0000-0000000000d1', 'skill', 'Linear B', 'linear-b'),
  ('00000000-0000-0000-0000-0000d1000003', '00000000-0000-0000-0000-0000000000d1', 'skill', 'Linear C', 'linear-c');

INSERT INTO skill_edge (graph_version_id, source_id, target_id, edge_type, strength, dependency_class)
VALUES
  ('00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000d1000001',
   '00000000-0000-0000-0000-0000d1000002',
   'prerequisite', 0.9, 'required'),
  ('00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000d1000002',
   '00000000-0000-0000-0000-0000d1000003',
   'prerequisite', 0.9, 'required');

-- Switch to authenticated — content tables use status predicate, no tenant_id needed
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT is(
  (SELECT COUNT(*)::int FROM skill_graph_version
   WHERE id = '00000000-0000-0000-0000-0000000000d1'),
  0,
  'G8.1: draft skill_graph_version invisible to authenticated'
);
SELECT is(
  (SELECT COUNT(*)::int FROM skill_node
   WHERE graph_version_id = '00000000-0000-0000-0000-0000000000d1'),
  0,
  'G8.2: draft skill_node rows invisible to authenticated'
);
SELECT is(
  (SELECT COUNT(*)::int FROM skill_edge
   WHERE graph_version_id = '00000000-0000-0000-0000-0000000000d1'),
  0,
  'G8.3: draft skill_edge rows invisible to authenticated'
);

RESET ROLE;

-- =============================================================================
-- G9 — Clean publish: graph_d publishes successfully (2 assertions)
-- =============================================================================

SELECT lives_ok(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000d1')$$,
  'G9.1: publish_skill_graph succeeds on valid DAG with no downstream data'
);

SELECT is(
  (SELECT status FROM skill_graph_version
   WHERE id = '00000000-0000-0000-0000-0000000000d1'),
  'published'::graph_version_status,
  'G9.2: graph_d status is published after publish_skill_graph'
);

-- =============================================================================
-- G10 — Published graph visible to authenticated (3 assertions — POST-publish)
-- graph_d is now published; authenticated must see all its rows.
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT is(
  (SELECT COUNT(*)::int FROM skill_graph_version
   WHERE id = '00000000-0000-0000-0000-0000000000d1'),
  1,
  'G10.1: published skill_graph_version visible to authenticated'
);
SELECT is(
  (SELECT COUNT(*)::int FROM skill_node
   WHERE graph_version_id = '00000000-0000-0000-0000-0000000000d1'),
  3,
  'G10.2: published skill_node rows visible to authenticated (3 nodes)'
);
SELECT is(
  (SELECT COUNT(*)::int FROM skill_edge
   WHERE graph_version_id = '00000000-0000-0000-0000-0000000000d1'),
  2,
  'G10.3: published skill_edge rows visible to authenticated (2 edges)'
);

RESET ROLE;

-- =============================================================================
-- G11 — G4 data guard (2 assertions)
-- Uses in-transaction CREATE TABLE skill_mastery stub (ADR-0007: safe under
-- serial execution only — see ADR-0007 §Concurrency caveat).
-- graph_e: simple A→B draft used for guard test.
-- =============================================================================

INSERT INTO skill_graph_version (id, version, status)
VALUES ('00000000-0000-0000-0000-0000000000e1', 5, 'draft');

INSERT INTO skill_node (id, graph_version_id, level, name, slug)
VALUES
  ('00000000-0000-0000-0000-0000e1000001', '00000000-0000-0000-0000-0000000000e1', 'skill', 'Guard A', 'guard-a'),
  ('00000000-0000-0000-0000-0000e1000002', '00000000-0000-0000-0000-0000000000e1', 'skill', 'Guard B', 'guard-b');

INSERT INTO skill_edge (graph_version_id, source_id, target_id, edge_type, strength, dependency_class)
VALUES
  ('00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000e1000001',
   '00000000-0000-0000-0000-0000e1000002',
   'prerequisite', 0.9, 'required');

-- Create in-transaction stub for skill_mastery and populate it
CREATE TABLE skill_mastery (id uuid);
INSERT INTO skill_mastery VALUES (gen_random_uuid());

-- G11.1: G4 guard fires when skill_mastery has rows → PUBLISH_BLOCKED
-- throws_like matches against the error message text (pattern, description)
SELECT throws_like(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000e1')$$,
  '%PUBLISH_BLOCKED%',
  'G11.1: G4 guard blocks publish when skill_mastery stub has rows'
);

-- Empty the stub — guard should now pass
DELETE FROM skill_mastery;

-- G11.2: G4 guard inactive when skill_mastery is empty → publish succeeds
SELECT lives_ok(
  $$SELECT publish_skill_graph('00000000-0000-0000-0000-0000000000e1')$$,
  'G11.2: G4 guard passes when skill_mastery stub is empty'
);

-- =============================================================================
-- G12 — Permission denied: authenticated has no execute privilege on publish_skill_graph
-- Uses has_function_privilege() catalog check — avoids SET ROLE and any server-crash
-- risk from NULL argument handling in throws_ok 4-arg form with this pgTAP version.
-- Semantically equivalent: if has_function_privilege returns false, the function call
-- would raise 42501 (insufficient_privilege) regardless.
-- =============================================================================

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.publish_skill_graph(uuid)',
    'execute'
  ),
  'G12.1: authenticated role has no execute privilege on publish_skill_graph'
);

-- =============================================================================

SELECT * FROM finish();
ROLLBACK;
