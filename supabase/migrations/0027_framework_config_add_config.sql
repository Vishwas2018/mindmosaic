-- =============================================================================
-- Migration 0027 — framework_config: add config jsonb column
-- 2026-06-03 · ADR-0044
-- Root cause: 0003_assessment_config.sql never created this column.
-- assessment-svc .select('id, config') was returning PostgREST 42703 on
-- every createSession / submitSession call.
-- =============================================================================

BEGIN;

ALTER TABLE framework_config ADD COLUMN config jsonb;

-- Defensive guard: refuse to proceed if any row belongs to a family outside
-- the v1 scope. This protects against silent data errors on a DB that diverged
-- from the expected state (e.g., a staging branch with extra rows).
DO $$
DECLARE unhandled int;
BEGIN
  SELECT COUNT(*) INTO unhandled
    FROM framework_config
   WHERE exam_family NOT IN ('au_numeracy_y5_format', 'au_math_paper_c_format');
  IF unhandled > 0 THEN
    RAISE EXCEPTION
      'framework_config: % row(s) outside v1 scope (not au_numeracy_y5_format or au_math_paper_c_format); resolve before applying migration 0027',
      unhandled;
  END IF;
END $$;

-- ── Backfill au_numeracy_y5_format (adaptive engine) ────────────────────────
-- time_limit_ms = null: per-stage timer lives in adaptive_rules.testlets[*].time_limit_ms
-- back_navigation_enabled = true: AdaptiveEngine enforces within-testlet boundary
-- flag_for_review_enabled = true: consistent with buildAdaptiveConfig fixture (engines/_fixtures.ts)
-- scoring_rules: scaled_score_formula='percentage', 3-band per phase-1-exit-report §2.2
-- Engine thresholds included explicitly (code does not Zod-parse config at runtime;
-- .default() values in FrameworkConfigSchema do not apply without a parse call).
-- adaptive_rules: embedded from adaptive_rules column (same AdaptiveRulesSchema shape).

UPDATE framework_config SET config = jsonb_build_object(
  'engine_type',              'adaptive',
  'scoring_rules',            jsonb_build_object(
    'scaled_score_formula',   'percentage',
    'bands',                  '[
      {"min":  0, "max": 49, "label": "developing"},
      {"min": 50, "max": 79, "label": "proficient"},
      {"min": 80, "max": 100, "label": "advanced"}
    ]'::jsonb
  ),
  'time_limit_ms',            NULL::int,
  'back_navigation_enabled',  TRUE,
  'flag_for_review_enabled',  TRUE,
  'mastery_threshold',        0.85,
  'difficulty_step_up',       0.1,
  'difficulty_step_down',     0.15,
  'cognitive_load_threshold', 0.8,
  'cognitive_load_step_down', 0.1,
  'expected_time_per_item_ms',30000,
  'max_items',                20,
  'confidence_threshold',     0.7,
  'diagnostic_start_difficulty', 0.5,
  'adaptive_rules',           adaptive_rules
)
WHERE exam_family = 'au_numeracy_y5_format';

-- ── Backfill au_math_paper_c_format (linear engine) ─────────────────────────
-- time_limit_ms = 3600000: structure.time_minutes=60 in the seeded row; confirmed
--   by buildLinearConfig fixture (time_limit_ms: 60 * 60 * 1000).
-- back_navigation_enabled = true: spec §4.2 "Full back-navigation permitted [platform decision]"
-- flag_for_review_enabled = true: consistent with buildLinearConfig fixture
-- scoring_rules: percentage + 3-band per phase-1-exit-report §2.2 (developing/proficient/advanced)

UPDATE framework_config SET config = jsonb_build_object(
  'engine_type',              'linear',
  'scoring_rules',            jsonb_build_object(
    'scaled_score_formula',   'percentage',
    'bands',                  '[
      {"min":  0, "max": 49, "label": "developing"},
      {"min": 50, "max": 79, "label": "proficient"},
      {"min": 80, "max": 100, "label": "advanced"}
    ]'::jsonb
  ),
  'time_limit_ms',            3600000,
  'back_navigation_enabled',  TRUE,
  'flag_for_review_enabled',  TRUE,
  'mastery_threshold',        0.85,
  'difficulty_step_up',       0.1,
  'difficulty_step_down',     0.15,
  'cognitive_load_threshold', 0.8,
  'cognitive_load_step_down', 0.1,
  'expected_time_per_item_ms',30000,
  'max_items',                20,
  'confidence_threshold',     0.7,
  'diagnostic_start_difficulty', 0.5
)
WHERE exam_family = 'au_math_paper_c_format';

-- NOT NULL: all existing rows (backfilled above) and all future rows (seeds
-- must supply config). Fresh db reset: migrations run before seeds, so no rows
-- exist when this constraint is set — the backfill UPDATEs are no-ops and the
-- NOT NULL is applied to an empty table. Seeds in supabase/seeds/03_assessment_config.sql
-- supply config on INSERT to satisfy the constraint.
ALTER TABLE framework_config ALTER COLUMN config SET NOT NULL;

COMMIT;
