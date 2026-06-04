-- =============================================================================
-- pgTAP Test: 0027_framework_config_config.sql
-- Migration 0027 · 2026-06-04
-- plan(3): column exists (C1), type jsonb (C2), NOT NULL (C3)
--
-- ADR-0006 pattern: has_column() for existence.
-- ADR-0014 pattern: structural catalog check (information_schema.columns)
--   for type and nullability — not function-based assertions, to stay
--   consistent with the EXPLAIN-avoidance / catalog-check discipline.
-- =============================================================================

BEGIN;
SELECT plan(3);

-- C1: column added by migration 0027 is present
SELECT has_column(
  'public', 'framework_config', 'config',
  'C1: framework_config.config column exists'
);

-- C2: type is jsonb (structural catalog check)
SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'framework_config'
      AND column_name  = 'config'),
  'jsonb',
  'C2: framework_config.config type is jsonb'
);

-- C3: NOT NULL constraint set by migration 0027
SELECT is(
  (SELECT is_nullable
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'framework_config'
      AND column_name  = 'config'),
  'NO',
  'C3: framework_config.config is NOT NULL'
);

SELECT * FROM finish();
ROLLBACK;
