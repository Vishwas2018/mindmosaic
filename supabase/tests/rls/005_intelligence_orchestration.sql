-- =============================================================================
-- pgTAP Test: 005_intelligence_orchestration.sql
-- Stage 6 · 2026-05-03
-- plan(70)
-- Tests: Pattern A SELECT isolation × 10 tables (G2–G11, 6 tests each = 60),
--        plan_revision Pattern G deny (G12 × 2),
--        cohort_metric_cache selective-grant + tenant isolation (G13 × 3),
--        G4 guard reactivation — publish_skill_graph blocked (G_G4 × 1),
--        repair_record C7 partial unique concurrency (G_C7 × 2),
--        intelligence_audit_log default partition routing — X2 (G_part × 2)
--
-- Per-table 6-test breakdown (G2–G11):
--   [1] student SELECT own rows ✓
--   [2] parent SELECT child rows via fn_my_child_ids() ✓
--   [3] teacher SELECT student rows via fn_teacher_student_ids() or teacher_id ✓
--   [4] org_admin SELECT all rows in tenant ✓
--   [5] platform_admin SELECT all rows ✓
--   [6] authenticated INSERT denied by RLS (0 rows) ✗
-- Anon SELECT tests removed from Pattern A groups: anon can't execute SECURITY DEFINER
--   helpers (fn_teacher_student_ids, fn_my_child_ids — REVOKE FROM PUBLIC per Stage 4);
--   policy evaluation fails with permission denied before returning 0 rows. Anon function
--   privilege is tested via has_function_privilege in 004_sessions_events.sql G16.
-- G12.2 (plan_revision anon) kept: plan_revision has no policies (Pattern G deny-all),
--   so no function evaluation occurs and anon correctly sees 0 rows.
-- G13 cohort_metric_cache: anon test removed for same reason (policies call auth_role()).
--   3 tests remain: student denied [1], teacher in-tenant [3], teacher cross-tenant [4].
-- intervention_alert (G11): test [1] shows student denied (D4) not allowed.
-- teacher access: fn_teacher_student_ids() for G2-G10; teacher_id=auth_user_id() for G11.
--
-- Updated_at triggers: tested in earlier stages (same set_updated_at() function).
-- Not retested here to preserve plan(70).
--
-- G4 guard reactivation (ADR-0007 follow-up):
--   X3: exact RAISE message: 'PUBLISH_BLOCKED: downstream student data exists; run
--       skill_graph_migration worker before publishing a new graph version'
--   throws_like pattern: '%PUBLISH_BLOCKED%'
--   Skill_mastery seeded in setup → guard fires on any publish_skill_graph() call.
--
-- G_part (X2): INSERT with created_at='2099-01-01' (far future, outside any plausible
--   monthly partition) routes to intelligence_audit_log_default.
--
-- Role strategy:
--   Setup, G_G4, G_C7, G_part: run as postgres (RLS bypassed)
--   G2–G13: SET ROLE authenticated + role-specific JWT per assertion
--   Anon assertions: SET ROLE anon
--
-- Test data UUIDs (00000000-0000-0000-0006-XXXXXXXXXXXX):
--   tenant_1_id:          00000000-0000-0000-0006-000000000001
--   tenant_2_id:          00000000-0000-0000-0006-000000000002
--   student_1_id:         00000000-0000-0000-0006-000000000003  (in tenant_1)
--   student_2_id:         00000000-0000-0000-0006-000000000004  (in tenant_1, isolation)
--   parent_1_id:          00000000-0000-0000-0006-000000000005  (parent of student_1)
--   teacher_1_id:         00000000-0000-0000-0006-000000000006  (in tenant_1)
--   org_admin_1_id:       00000000-0000-0000-0006-000000000007  (in tenant_1)
--   platform_admin_1_id:  00000000-0000-0000-0006-000000000008
--   teacher_2_id:         00000000-0000-0000-0006-000000000009  (in tenant_2, cross-tenant)
--   class_group_1_id:     00000000-0000-0000-0006-000000000010
--   sgv_1_id:             00000000-0000-0000-0006-000000000011
--   skill_node_1_id:      00000000-0000-0000-0006-000000000012
--   misconception_1_id:   00000000-0000-0000-0006-000000000013
--   repair_seq_1_id:      00000000-0000-0000-0006-000000000014
--   plan_1_id:            00000000-0000-0000-0006-000000000015
--   ial_1_id:             00000000-0000-0000-0006-000000000016  (audit log, student_1)
--   ial_2_id:             00000000-0000-0000-0006-000000000017  (audit log, student_2)
--   alert_1_id:           00000000-0000-0000-0006-000000000018  (intervention_alert)
--   rec_1_id:             00000000-0000-0000-0006-000000000019
--   po_1_id:              00000000-0000-0000-0006-000000000020
--   rr_1_id:              00000000-0000-0000-0006-000000000021  (repair_record, student_1)
--   ial_part_id:          00000000-0000-0000-0006-900000000001  (partition routing test)
-- =============================================================================

BEGIN;
SELECT plan(70);

-- =============================================================================
-- TEST SETUP — insert all prerequisite data as postgres (RLS bypassed)
-- =============================================================================

INSERT INTO tenant (id, name, slug, type)
VALUES
  ('00000000-0000-0000-0006-000000000001', 'Test Tenant 006-A', 'test-tenant-006a', 'school'),
  ('00000000-0000-0000-0006-000000000002', 'Test Tenant 006-B', 'test-tenant-006b', 'school');

INSERT INTO user_profile (id, tenant_id, role, display_name)
VALUES
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0006-000000000001', 'student',        'Student One'),
  ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0006-000000000001', 'student',        'Student Two'),
  ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0006-000000000001', 'parent',         'Parent One'),
  ('00000000-0000-0000-0006-000000000006', '00000000-0000-0000-0006-000000000001', 'teacher',        'Teacher One'),
  ('00000000-0000-0000-0006-000000000007', '00000000-0000-0000-0006-000000000001', 'org_admin',      'Org Admin One'),
  ('00000000-0000-0000-0006-000000000008', '00000000-0000-0000-0006-000000000001', 'platform_admin', 'Platform Admin One'),
  ('00000000-0000-0000-0006-000000000009', '00000000-0000-0000-0006-000000000002', 'teacher',        'Teacher Two');

INSERT INTO parent_student_link (parent_id, student_id)
VALUES ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0006-000000000003');

INSERT INTO class_group (id, tenant_id, teacher_id, name)
VALUES ('00000000-0000-0000-0006-000000000010',
        '00000000-0000-0000-0006-000000000001',
        '00000000-0000-0000-0006-000000000006',
        'Test Class 006');

INSERT INTO class_student (class_id, student_id)
VALUES ('00000000-0000-0000-0006-000000000010', '00000000-0000-0000-0006-000000000003');

INSERT INTO skill_graph_version (id, version, status)
VALUES ('00000000-0000-0000-0006-000000000011', 6001, 'published');

INSERT INTO skill_node (id, graph_version_id, level, name, slug)
VALUES ('00000000-0000-0000-0006-000000000012',
        '00000000-0000-0000-0006-000000000011',
        'skill', 'Test Skill S6', 'test-skill-s6');

INSERT INTO misconception (id, name, description, category)
VALUES ('00000000-0000-0000-0006-000000000013',
        'Test Misconception S6', 'Stage 6 test misconception', 'procedural');

INSERT INTO repair_sequence (id, target_type, target_id, display_name, stages)
VALUES ('00000000-0000-0000-0006-000000000014',
        'misconception',
        '00000000-0000-0000-0006-000000000013',
        'Test Repair S6', '[]');

-- Intelligence tables — Stage 6
INSERT INTO skill_mastery (student_id, skill_id, tenant_id)
VALUES ('00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000012',
        '00000000-0000-0000-0006-000000000001');

INSERT INTO learning_velocity (student_id, skill_id, tenant_id, velocity)
VALUES ('00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000012',
        '00000000-0000-0000-0006-000000000001',
        0.2);

INSERT INTO behaviour_profile (student_id, tenant_id)
VALUES ('00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001');

INSERT INTO student_misconception (id, student_id, tenant_id, misconception_id, confidence)
VALUES ('00000000-0000-0000-0006-000000000022',
        '00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001',
        '00000000-0000-0000-0006-000000000013',
        0.75);

-- repair_record for student_1 (status='in_progress' — NOT 'queued', keeps C7 test clean)
INSERT INTO repair_record (id, student_id, tenant_id, repair_sequence_id, misconception_id, status)
VALUES ('00000000-0000-0000-0006-000000000021',
        '00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001',
        '00000000-0000-0000-0006-000000000014',
        '00000000-0000-0000-0006-000000000013',
        'in_progress');

INSERT INTO intelligence_audit_log
  (id, student_id, tenant_id, event_type, input_snapshot, output, layer, algorithm_version)
VALUES
  ('00000000-0000-0000-0006-000000000016',
   '00000000-0000-0000-0006-000000000003',
   '00000000-0000-0000-0006-000000000001',
   'mastery_update', '{}', '{"mastery": 0.5}', 'L1', '1.0'),
  ('00000000-0000-0000-0006-000000000017',
   '00000000-0000-0000-0006-000000000004',
   '00000000-0000-0000-0006-000000000001',
   'mastery_update', '{}', '{"mastery": 0.3}', 'L1', '1.0');

INSERT INTO learning_plan (id, student_id, tenant_id, plan_type, status, valid_until, generated_algorithm_version)
VALUES ('00000000-0000-0000-0006-000000000015',
        '00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001',
        'weekly', 'active', now() + interval '7 days', '1.0');

INSERT INTO plan_revision (plan_id, revision, reason)
VALUES ('00000000-0000-0000-0006-000000000015', 1, 'Initial plan creation');

INSERT INTO recommendation (id, student_id, tenant_id, plan_id, mode, target_skills, rationale)
VALUES ('00000000-0000-0000-0006-000000000019',
        '00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001',
        '00000000-0000-0000-0006-000000000015',
        'practice',
        ARRAY['00000000-0000-0000-0006-000000000012'::uuid],
        'Practice fractions');

INSERT INTO plan_override (id, student_id, tenant_id, actor_id, type, target, expires_at)
VALUES ('00000000-0000-0000-0006-000000000020',
        '00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001',
        '00000000-0000-0000-0006-000000000006',
        'pin_skill',
        '{"skill_id": "00000000-0000-0000-0006-000000000012"}',
        now() + interval '14 days');

INSERT INTO intervention_alert (id, student_id, tenant_id, teacher_id, alert_type, severity)
VALUES ('00000000-0000-0000-0006-000000000018',
        '00000000-0000-0000-0006-000000000003',
        '00000000-0000-0000-0006-000000000001',
        '00000000-0000-0000-0006-000000000006',
        'declining_performance', 'warning');

INSERT INTO cohort_metric_cache (cohort_key, metric_key, time_bucket, tenant_id, value)
VALUES
  ('class:s6test-t1', 'avg_mastery', '2026-05',
   '00000000-0000-0000-0006-000000000001', '{"value": 0.75}'),
  ('class:s6test-t2', 'avg_mastery', '2026-05',
   '00000000-0000-0000-0006-000000000002', '{"value": 0.80}');

-- =============================================================================
-- G2: skill_mastery — Pattern A SELECT isolation + INSERT deny (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM skill_mastery WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G2.1: student can SELECT own skill_mastery');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM skill_mastery WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G2.2: parent can SELECT child skill_mastery via fn_my_child_ids');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM skill_mastery WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G2.3: teacher can SELECT student skill_mastery via fn_teacher_student_ids');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM skill_mastery),
  1, 'G2.4: org_admin can SELECT skill_mastery in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM skill_mastery WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G2.5: platform_admin can SELECT skill_mastery');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO skill_mastery (student_id, skill_id, tenant_id)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000012',
            '00000000-0000-0000-0006-000000000001')$$,
  '%row-level security%',
  'G2.7: student INSERT on skill_mastery denied by RLS');

RESET ROLE;

-- =============================================================================
-- G3: learning_velocity — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_velocity WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G3.1: student can SELECT own learning_velocity');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_velocity WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G3.2: parent can SELECT child learning_velocity');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_velocity WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G3.3: teacher can SELECT student learning_velocity');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_velocity),
  1, 'G3.4: org_admin can SELECT learning_velocity in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_velocity WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G3.5: platform_admin can SELECT learning_velocity');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO learning_velocity (student_id, skill_id, tenant_id)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000012',
            '00000000-0000-0000-0006-000000000001')$$,
  '%row-level security%',
  'G3.7: student INSERT on learning_velocity denied by RLS');

RESET ROLE;

-- =============================================================================
-- G4: behaviour_profile — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM behaviour_profile WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G4.1: student can SELECT own behaviour_profile');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM behaviour_profile WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G4.2: parent can SELECT child behaviour_profile');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM behaviour_profile WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G4.3: teacher can SELECT student behaviour_profile');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM behaviour_profile),
  1, 'G4.4: org_admin can SELECT behaviour_profile in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM behaviour_profile WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G4.5: platform_admin can SELECT behaviour_profile');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO behaviour_profile (student_id, tenant_id)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001')$$,
  '%row-level security%',
  'G4.7: student INSERT on behaviour_profile denied by RLS');

RESET ROLE;

-- =============================================================================
-- G5: student_misconception — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM student_misconception WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G5.1: student can SELECT own student_misconception');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM student_misconception WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G5.2: parent can SELECT child student_misconception');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM student_misconception WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G5.3: teacher can SELECT student student_misconception');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM student_misconception),
  1, 'G5.4: org_admin can SELECT student_misconception in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM student_misconception WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G5.5: platform_admin can SELECT student_misconception');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO student_misconception (student_id, tenant_id, misconception_id, confidence)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            '00000000-0000-0000-0006-000000000013',
            0.5)$$,
  '%row-level security%',
  'G5.7: student INSERT on student_misconception denied by RLS');

RESET ROLE;

-- =============================================================================
-- G6: repair_record — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM repair_record WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G6.1: student can SELECT own repair_record');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM repair_record WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G6.2: parent can SELECT child repair_record');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM repair_record WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G6.3: teacher can SELECT student repair_record');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM repair_record),
  1, 'G6.4: org_admin can SELECT repair_record in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM repair_record WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G6.5: platform_admin can SELECT repair_record');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO repair_record (student_id, tenant_id, repair_sequence_id, status)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            '00000000-0000-0000-0006-000000000014',
            'queued')$$,
  '%row-level security%',
  'G6.7: student INSERT on repair_record denied by RLS');

RESET ROLE;

-- =============================================================================
-- G7: intelligence_audit_log — Pattern A D1 (6 tests)
-- student/parent/teacher: SELECT only. org_admin/platform_admin: FOR ALL.
-- student INSERT denied (service_role is sole writer — append-only, ADR-0013).
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intelligence_audit_log WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G7.1: student can SELECT own intelligence_audit_log rows');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intelligence_audit_log WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G7.2: parent can SELECT child intelligence_audit_log');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intelligence_audit_log WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G7.3: teacher can SELECT student intelligence_audit_log');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intelligence_audit_log),
  2, 'G7.4: org_admin can SELECT intelligence_audit_log in own tenant (both students)');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intelligence_audit_log WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G7.5: platform_admin can SELECT intelligence_audit_log');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO intelligence_audit_log
      (student_id, tenant_id, event_type, input_snapshot, output, layer, algorithm_version,
       created_at)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            'test', '{}', '{}', 'L1', '1.0', now())$$,
  '%row-level security%',
  'G7.7: student INSERT on intelligence_audit_log denied (append-only; service_role only per ADR-0013)');

RESET ROLE;

-- =============================================================================
-- G8: learning_plan — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_plan WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G8.1: student can SELECT own learning_plan');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_plan WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G8.2: parent can SELECT child learning_plan');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_plan WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G8.3: teacher can SELECT student learning_plan');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_plan),
  1, 'G8.4: org_admin can SELECT learning_plan in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM learning_plan WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G8.5: platform_admin can SELECT learning_plan');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO learning_plan (student_id, tenant_id, plan_type, valid_until, generated_algorithm_version)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            'long_term', now() + interval '30 days', '1.0')$$,
  '%row-level security%',
  'G8.7: student INSERT on learning_plan denied by RLS');

RESET ROLE;

-- =============================================================================
-- G9: recommendation — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM recommendation WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G9.1: student can SELECT own recommendation');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM recommendation WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G9.2: parent can SELECT child recommendation');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM recommendation WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G9.3: teacher can SELECT student recommendation');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM recommendation),
  1, 'G9.4: org_admin can SELECT recommendation in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM recommendation WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G9.5: platform_admin can SELECT recommendation');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO recommendation (student_id, tenant_id, mode, target_skills, rationale)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            'practice', ARRAY[]::uuid[], 'test')$$,
  '%row-level security%',
  'G9.7: student INSERT on recommendation denied by RLS');

RESET ROLE;

-- =============================================================================
-- G10: plan_override — Pattern A (6 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM plan_override WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G10.1: student can SELECT own plan_override');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM plan_override WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G10.2: parent can SELECT child plan_override');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM plan_override WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G10.3: teacher can SELECT student plan_override');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM plan_override),
  1, 'G10.4: org_admin can SELECT plan_override in own tenant');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM plan_override WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G10.5: platform_admin can SELECT plan_override');

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO plan_override (student_id, tenant_id, actor_id, type, target, expires_at)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            '00000000-0000-0000-0006-000000000003',
            'pin_skill', '{}', now() + interval '14 days')$$,
  '%row-level security%',
  'G10.7: student INSERT on plan_override denied by RLS');

RESET ROLE;

-- =============================================================================
-- G11: intervention_alert — Pattern A variant (D4: no student SELECT) (6 tests)
-- Teacher access: teacher_id = auth_user_id() (X1: teacher_id NOT NULL confirmed).
-- =============================================================================

-- [1] student denied (D4)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intervention_alert WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  0, 'G11.1: student SELECT on intervention_alert denied (D4 — no student SELECT policy)');

-- [2] parent via fn_my_child_ids
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000005","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intervention_alert WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G11.2: parent can SELECT child intervention_alert via fn_my_child_ids');

-- [3] teacher via teacher_id = auth_user_id()
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intervention_alert WHERE teacher_id = '00000000-0000-0000-0006-000000000006'),
  1, 'G11.3: teacher can SELECT intervention_alert where teacher_id = auth_user_id()');

-- [4] org_admin
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000007","app_metadata":{"role":"org_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intervention_alert),
  1, 'G11.4: org_admin can SELECT intervention_alert in own tenant');

-- [5] platform_admin
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000008","app_metadata":{"role":"platform_admin","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM intervention_alert WHERE student_id = '00000000-0000-0000-0006-000000000003'),
  1, 'G11.5: platform_admin can SELECT intervention_alert');

-- [6] authenticated INSERT denied
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT throws_like(
  $$INSERT INTO intervention_alert (student_id, tenant_id, teacher_id, alert_type)
    VALUES ('00000000-0000-0000-0006-000000000003',
            '00000000-0000-0000-0006-000000000001',
            '00000000-0000-0000-0006-000000000006',
            'declining_performance')$$,
  '%row-level security%',
  'G11.7: student INSERT on intervention_alert denied by RLS');

RESET ROLE;

-- =============================================================================
-- G12: plan_revision — Pattern G deny-all authenticated (2 tests)
-- =============================================================================

SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM plan_revision),
  0, 'G12.1: authenticated student denied SELECT on plan_revision (Pattern G)');

RESET ROLE;
SET ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM plan_revision),
  0, 'G12.2: anon denied SELECT on plan_revision (Pattern G)');

RESET ROLE;

-- =============================================================================
-- G13: cohort_metric_cache — selective-grant with tenant isolation (D3) (3 tests)
-- Anon test omitted: policies call auth_role() (REVOKE FROM PUBLIC) → permission denied
-- at policy evaluation. Same root cause as Pattern A groups above.
-- =============================================================================

-- [1] student denied
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000003","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM cohort_metric_cache),
  0, 'G13.1: student denied SELECT on cohort_metric_cache (no student policy)');

-- [2] teacher_1 in-tenant SELECT succeeds (tenant_1 row visible)
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000006","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000001"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM cohort_metric_cache
   WHERE cohort_key = 'class:s6test-t1'
     AND tenant_id = '00000000-0000-0000-0006-000000000001'),
  1, 'G13.2: teacher_1 (tenant_1) can SELECT cohort_metric_cache for own tenant');

-- [3] teacher_2 cross-tenant denial (tenant_2 teacher cannot see tenant_1 row)
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0006-000000000009","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0006-000000000002"}}',
  true);
SELECT is(
  (SELECT count(*)::int FROM cohort_metric_cache
   WHERE cohort_key = 'class:s6test-t1'
     AND tenant_id = '00000000-0000-0000-0006-000000000001'),
  0, 'G13.3: teacher_2 (tenant_2) denied SELECT on tenant_1 cohort_metric_cache (tenant isolation)');

RESET ROLE;

-- =============================================================================
-- G_G4: G4 guard reactivation — publish_skill_graph blocked (1 test)
-- ADR-0007 follow-up: skill_mastery seeded in setup → guard fires via real table.
-- X3: exact RAISE: 'PUBLISH_BLOCKED: downstream student data exists; run
--     skill_graph_migration worker before publishing a new graph version'
-- Stable pattern: '%PUBLISH_BLOCKED%'
-- Cycle detection (STEP 1) sees no edges for fake graph_id → passes.
-- G4 guard (STEP 2) finds skill_mastery rows → PUBLISH_BLOCKED before GRAPH_NOT_DRAFT.
-- =============================================================================

SELECT throws_like(
  $$SELECT publish_skill_graph('00000000-dead-0006-dead-000000000001'::uuid)$$,
  '%PUBLISH_BLOCKED%',
  'G_G4.1: publish_skill_graph blocked when skill_mastery has data (G4 guard active on real table — ADR-0007 reactivation confirmed)'
);

-- =============================================================================
-- G_C7: repair_record C7 partial unique concurrency guard (2 tests)
-- Uses student_2 (not student_1) to avoid conflict with seeded repair_record
-- (student_1 + misconception_1 already has status=in_progress in the C7 index).
-- =============================================================================

SELECT lives_ok(
  $$INSERT INTO repair_record (student_id, tenant_id, repair_sequence_id, misconception_id, status)
    VALUES ('00000000-0000-0000-0006-000000000004',
            '00000000-0000-0000-0006-000000000001',
            '00000000-0000-0000-0006-000000000014',
            '00000000-0000-0000-0006-000000000013',
            'queued')$$,
  'G_C7.1: first queued repair_record for student_2 + misconception_1 succeeds'
);

SELECT throws_like(
  $$INSERT INTO repair_record (student_id, tenant_id, repair_sequence_id, misconception_id, status)
    VALUES ('00000000-0000-0000-0006-000000000004',
            '00000000-0000-0000-0006-000000000001',
            '00000000-0000-0000-0006-000000000014',
            '00000000-0000-0000-0006-000000000013',
            'queued')$$,
  '%duplicate key%',
  'G_C7.2: second queued repair_record for same (student_2, misconception_1) rejected by idx_repair_one_open_per_misc'
);

-- =============================================================================
-- G_part: intelligence_audit_log default partition routing (X2) (2 tests)
-- INSERT with created_at='2099-01-01' (outside any plausible monthly partition)
-- must route to intelligence_audit_log_default, not raise SQLSTATE 23000 or similar.
-- Verifies ADR-0012 PK (id, created_at) applied correctly — no 0A000 error.
-- =============================================================================

INSERT INTO intelligence_audit_log
  (id, student_id, tenant_id, event_type, input_snapshot, output, layer, algorithm_version, created_at)
VALUES
  ('00000000-0000-0000-0006-900000000001',
   '00000000-0000-0000-0006-000000000003',
   '00000000-0000-0000-0006-000000000001',
   'partition_routing_test', '{}', '{}', 'L1', '1.0.0',
   '2099-01-01'::timestamptz);

SELECT is(
  (SELECT count(*)::int
   FROM intelligence_audit_log_default
   WHERE id = '00000000-0000-0000-0006-900000000001'
     AND created_at = '2099-01-01'::timestamptz),
  1,
  'G_part.1: INSERT with created_at=2099-01-01 (outside any plausible monthly partition) routes to intelligence_audit_log_default'
);

SELECT is(
  (SELECT count(*)::int
   FROM intelligence_audit_log
   WHERE id = '00000000-0000-0000-0006-900000000001'),
  1,
  'G_part.2: partitioned row accessible via parent intelligence_audit_log table'
);

-- =============================================================================

SELECT * FROM finish();
ROLLBACK;
