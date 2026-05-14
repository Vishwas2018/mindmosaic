-- =============================================================================
-- pgTAP Test: 021_content_authoring.sql
-- Stage v1.1-S1 · 2026-05-14
-- plan(17)
-- Tests: RLS enabled (G1×3), policies exist (G2×5),
--        non-admin INSERT rejected (G3×3),
--        platform_admin INSERT succeeds (G4×3),
--        platform_admin UPDATE succeeds (G5×2),
--        is_current uniqueness invariant (G6×1)
--
-- Migration coverage: 0021_content_authoring.sql (ADR-0035 Pattern G strict)
-- Policies: item_admin_insert, item_admin_update, item_version_admin_insert,
--           stimulus_admin_insert, stimulus_admin_update
--
-- Role strategy:
--   Setup, G1–G2, G6: run as postgres (service-role — RLS bypassed per ENABLE not FORCE)
--   G3: SET ROLE authenticated + parent JWT → auth_role() = 'parent' → INSERT denied
--   G4–G5: SET ROLE authenticated + platform_admin JWT → INSERT/UPDATE allowed
--
-- JWT pattern (from migration 0003 / auth_role() source):
--   request.jwt.claims → 'app_metadata' ->> 'role'
--
-- Test UUIDs (explicit for reproducibility):
--   setup item:    00000000-0000-0000-0021-000000000001
--   setup stimulus:00000000-0000-0000-0021-000000000002
--   admin item:    00000000-0000-0000-0021-000000000003
--   admin stimulus:00000000-0000-0000-0021-000000000004
--   skill_id stub: aaaaaaaa-0000-0000-0000-000000000001
-- =============================================================================

BEGIN;
SELECT plan(17);

-- =============================================================================
-- Setup (postgres / service-role — bypasses RLS)
-- Insert rows needed for UPDATE and FK reference tests.
-- =============================================================================

INSERT INTO item (id, response_type, skill_ids, difficulty, year_levels, exam_families)
VALUES (
  '00000000-0000-0000-0021-000000000001',
  'mcq',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],
  0.4,
  ARRAY[5]::int[],
  ARRAY['naplan']::exam_family[]
);

INSERT INTO item_version (item_id, version, stem, response_config, difficulty, is_current)
VALUES (
  '00000000-0000-0000-0021-000000000001',
  1,
  '{"kind":"plain_text","value":"Setup item version 1"}',
  '{"options":["a","b","c","d"]}',
  0.4,
  true
);

INSERT INTO stimulus (id, type, content)
VALUES (
  '00000000-0000-0000-0021-000000000002',
  'passage',
  '{"text":"Setup stimulus for update tests"}'
);

-- =============================================================================
-- G1 — RLS enabled on item, item_version, stimulus (3 assertions)
-- Policies added by 0021 sit on tables where ENABLE RLS was set in 0002.
-- =============================================================================

SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item'),
  true,
  'G1.1: RLS enabled on item'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_version'),
  true,
  'G1.2: RLS enabled on item_version'
);

SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stimulus'),
  true,
  'G1.3: RLS enabled on stimulus'
);

-- =============================================================================
-- G2 — Policies created by migration 0021 exist (5 assertions)
-- =============================================================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'item' AND policyname = 'item_admin_insert'
  ),
  'G2.1: item_admin_insert policy exists on item'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'item' AND policyname = 'item_admin_update'
  ),
  'G2.2: item_admin_update policy exists on item'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'item_version' AND policyname = 'item_version_admin_insert'
  ),
  'G2.3: item_version_admin_insert policy exists on item_version'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stimulus' AND policyname = 'stimulus_admin_insert'
  ),
  'G2.4: stimulus_admin_insert policy exists on stimulus'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stimulus' AND policyname = 'stimulus_admin_update'
  ),
  'G2.5: stimulus_admin_update policy exists on stimulus'
);

-- =============================================================================
-- G3 — Non-admin INSERT rejected (3 assertions)
-- Role: authenticated + parent JWT → auth_role() = 'parent'
-- INSERT WITH CHECK (auth_role() = 'platform_admin') → false → 42501
-- =============================================================================

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0021-000000000099","app_metadata":{"role":"parent","tenant_id":"00000000-0000-0000-0000-000000000001"}}',
  true
);
SET ROLE authenticated;

SELECT throws_like(
  $$INSERT INTO item (response_type, skill_ids, difficulty, year_levels, exam_families)
    VALUES ('mcq', ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[], 0.4, ARRAY[5], ARRAY['naplan']::exam_family[])$$,
  '%42501%',
  'G3.1: non-admin INSERT on item is denied (42501)'
);

SELECT throws_like(
  $$INSERT INTO item_version (item_id, version, stem, response_config, difficulty)
    VALUES ('00000000-0000-0000-0021-000000000001', 99, '{}', '{}', 0.4)$$,
  '%42501%',
  'G3.2: non-admin INSERT on item_version is denied (42501)'
);

SELECT throws_like(
  $$INSERT INTO stimulus (type, content)
    VALUES ('passage', '{"text":"unauthorized"}')$$,
  '%42501%',
  'G3.3: non-admin INSERT on stimulus is denied (42501)'
);

RESET ROLE;

-- =============================================================================
-- G4 — platform_admin INSERT succeeds (3 assertions)
-- Role: authenticated + platform_admin JWT → auth_role() = 'platform_admin'
-- INSERT WITH CHECK (auth_role() = 'platform_admin') → true → lives_ok
-- =============================================================================

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0021-000000000098","app_metadata":{"role":"platform_admin"}}',
  true
);
SET ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO item (id, response_type, skill_ids, difficulty, year_levels, exam_families)
    VALUES ('00000000-0000-0000-0021-000000000003',
            'mcq',
            ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],
            0.5,
            ARRAY[5]::int[],
            ARRAY['naplan']::exam_family[])$$,
  'G4.1: platform_admin can INSERT into item'
);

-- G4.2: item_version INSERT uses item from G4.1 (same transaction, visible)
SELECT lives_ok(
  $$INSERT INTO item_version (item_id, version, stem, response_config, difficulty, is_current)
    VALUES ('00000000-0000-0000-0021-000000000003', 1,
            '{"kind":"plain_text","value":"Platform admin version"}',
            '{"options":["a","b","c","d"]}',
            0.5, true)$$,
  'G4.2: platform_admin can INSERT into item_version'
);

SELECT lives_ok(
  $$INSERT INTO stimulus (id, type, content)
    VALUES ('00000000-0000-0000-0021-000000000004', 'passage',
            '{"text":"Platform admin stimulus"}')$$,
  'G4.3: platform_admin can INSERT into stimulus'
);

-- =============================================================================
-- G5 — platform_admin UPDATE succeeds (2 assertions)
-- USING (auth_role() = 'platform_admin') → true → row is updatable
-- =============================================================================

SELECT lives_ok(
  $$UPDATE item SET lifecycle = 'review'
    WHERE id = '00000000-0000-0000-0021-000000000003'$$,
  'G5.1: platform_admin can UPDATE item lifecycle'
);

SELECT lives_ok(
  $$UPDATE stimulus SET is_active = false
    WHERE id = '00000000-0000-0000-0021-000000000004'$$,
  'G5.2: platform_admin can UPDATE stimulus is_active'
);

RESET ROLE;

-- =============================================================================
-- G6 — is_current uniqueness invariant (1 assertion)
-- idx_item_version_current_one UNIQUE ON item_version(item_id) WHERE is_current = true
-- Setup item already has version 1 with is_current=true; a second INSERT with
-- is_current=true for the same item_id must raise 23505 (unique_violation).
-- Service-role (postgres) bypasses RLS but not uniqueness constraints.
-- =============================================================================

SELECT throws_like(
  $$INSERT INTO item_version (item_id, version, stem, response_config, difficulty, is_current)
    VALUES ('00000000-0000-0000-0021-000000000001', 2,
            '{"kind":"plain_text","value":"Duplicate current"}',
            '{}', 0.4, true)$$,
  '%23505%',
  'G6.1: duplicate is_current=true for same item_id violates idx_item_version_current_one (23505)'
);

SELECT * FROM finish();
ROLLBACK;
