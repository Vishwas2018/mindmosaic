-- Seed 03 — Assessment Config (framework_configs, blueprints, pathways, assessment_profiles)
-- Idempotent: ON CONFLICT ... DO NOTHING / DO UPDATE where needed.
-- =============================================================================

-- ─── framework_configs (2) ───────────────────────────────────────────────────

INSERT INTO framework_config (id, exam_family, version, structure, adaptive_rules, scoring_rules, constraints, difficulty_bands, blueprint)
VALUES
(
  'a0000005-0000-0000-0000-000000000001',
  'naplan',
  'v1',
  '{"engine":"adaptive","min_items":15,"max_items":15,"start_difficulty":0.5,"year_level":5,"stage_count":3}',
  -- adaptive_rules: testlet routing table (Spec §3.2.1, ADR-0024).
  -- Three-stage NAPLAN Y5 Numeracy domain: anchor stage (s1, 5 items at 0.5),
  -- routes to {easy, medium, hard} testlet for s2 based on s1 score, then to
  -- {easy, medium, hard} testlet for s3 based on s2 score. 5 items per testlet,
  -- 15 items total per session. Per-stage timer 15min for s1/s2, 10min for s3.
  '{
    "stages": ["s1", "s2", "s3"],
    "start_testlet_id": "t1",
    "routing_table": [
      {"stage_id": "s1", "score_min": 0, "score_max": 2, "next_testlet_id": "t2_easy"},
      {"stage_id": "s1", "score_min": 3, "score_max": 3, "next_testlet_id": "t2_medium"},
      {"stage_id": "s1", "score_min": 4, "score_max": 5, "next_testlet_id": "t2_hard"},
      {"stage_id": "s2", "score_min": 0, "score_max": 2, "next_testlet_id": "t3_easy"},
      {"stage_id": "s2", "score_min": 3, "score_max": 3, "next_testlet_id": "t3_medium"},
      {"stage_id": "s2", "score_min": 4, "score_max": 5, "next_testlet_id": "t3_hard"}
    ],
    "testlets": {
      "t1":         {"stage_id": "s1", "time_limit_ms": 900000, "item_ids": ["a0000010-0000-0000-0000-000000000001","a0000010-0000-0000-0000-000000000002","a0000010-0000-0000-0000-000000000003","a0000010-0000-0000-0000-000000000004","a0000010-0000-0000-0000-000000000005"]},
      "t2_easy":    {"stage_id": "s2", "time_limit_ms": 900000, "item_ids": ["a0000010-0000-0000-0000-000000000006","a0000010-0000-0000-0000-000000000007","a0000010-0000-0000-0000-000000000008","a0000010-0000-0000-0000-000000000009","a0000010-0000-0000-0000-000000000010"]},
      "t2_medium":  {"stage_id": "s2", "time_limit_ms": 900000, "item_ids": ["a0000010-0000-0000-0000-000000000011","a0000010-0000-0000-0000-000000000012","a0000010-0000-0000-0000-000000000013","a0000010-0000-0000-0000-000000000014","a0000010-0000-0000-0000-000000000015"]},
      "t2_hard":    {"stage_id": "s2", "time_limit_ms": 900000, "item_ids": ["a0000010-0000-0000-0000-000000000016","a0000010-0000-0000-0000-000000000017","a0000010-0000-0000-0000-000000000018","a0000010-0000-0000-0000-000000000019","a0000010-0000-0000-0000-000000000020"]},
      "t3_easy":    {"stage_id": "s3", "time_limit_ms": 600000, "item_ids": ["a0000010-0000-0000-0000-000000000021","a0000010-0000-0000-0000-000000000022","a0000010-0000-0000-0000-000000000023","a0000010-0000-0000-0000-000000000024","a0000010-0000-0000-0000-000000000025"]},
      "t3_medium":  {"stage_id": "s3", "time_limit_ms": 600000, "item_ids": ["a0000010-0000-0000-0000-000000000026","a0000010-0000-0000-0000-000000000027","a0000010-0000-0000-0000-000000000028","a0000010-0000-0000-0000-000000000029","a0000010-0000-0000-0000-000000000030"]},
      "t3_hard":    {"stage_id": "s3", "time_limit_ms": 600000, "item_ids": ["a0000010-0000-0000-0000-000000000031","a0000010-0000-0000-0000-000000000032","a0000010-0000-0000-0000-000000000033","a0000010-0000-0000-0000-000000000034","a0000010-0000-0000-0000-000000000035"]}
    }
  }',
  '{"model":"adaptive_path","scaled_score":{"min":0,"max":1000,"mean":500},"path_multipliers":{"easy":0.7,"medium":1.0,"hard":1.3}}',
  '{"require_skill_coverage":true,"min_skills_assessed":3}',
  '{"easy":[0.0,0.35],"mid":[0.35,0.70],"hard":[0.70,1.0]}',
  '{"strands":[{"slug":"number-algebra","weight":0.6},{"slug":"measurement-space","weight":0.4}]}'
),
(
  'a0000005-0000-0000-0000-000000000002',
  'icas',
  'v1',
  '{"engine":"linear","item_count":25,"time_minutes":60,"year_level":5}',
  null,
  '{"model":"raw","marks_per_item":1,"total_marks":25}',
  '{"fixed_order":true}',
  '{"easy":[0.0,0.35],"mid":[0.35,0.70],"hard":[0.70,1.0]}',
  '{"sections":[{"name":"Mathematics","item_count":25}]}'
)
ON CONFLICT (exam_family, version) DO NOTHING;

-- ─── blueprints (2) ──────────────────────────────────────────────────────────

INSERT INTO blueprint (id, sections)
VALUES
(
  'a0000006-0000-0000-0000-000000000001',
  '[
    {"name":"Number & Algebra","target_items":15,"skill_slugs":["place-value","fractions-decimals","operations","word-problems"],"difficulty_split":{"easy":0.3,"mid":0.4,"hard":0.3}},
    {"name":"Measurement & Space","target_items":10,"skill_slugs":["geometry","data-interpretation"],"difficulty_split":{"easy":0.3,"mid":0.4,"hard":0.3}}
  ]'
),
(
  'a0000006-0000-0000-0000-000000000002',
  '[
    {"name":"Number & Algebra","target_items":15,"skill_slugs":["place-value","fractions-decimals","operations","word-problems"],"difficulty_split":{"easy":0.3,"mid":0.4,"hard":0.3}},
    {"name":"Measurement & Space","target_items":10,"skill_slugs":["geometry","data-interpretation"],"difficulty_split":{"easy":0.3,"mid":0.4,"hard":0.3}}
  ]'
)
ON CONFLICT (id) DO NOTHING;

-- ─── pathways (2) ────────────────────────────────────────────────────────────

INSERT INTO pathway (id, slug, display_name, exam_family, program, country, curriculum, framework_config_id, engine_type, year_levels, required_feature_key)
VALUES
(
  'a0000007-0000-0000-0000-000000000001',
  'naplan-y5-numeracy',
  'NAPLAN Year 5 Numeracy',
  'naplan', 'NAPLAN', 'AU', 'australian_curriculum_v9',
  'a0000005-0000-0000-0000-000000000001',
  'adaptive',
  ARRAY[5],
  'naplan_y5'
),
(
  'a0000007-0000-0000-0000-000000000002',
  'icas-math-y5',
  'ICAS Mathematics Year 5',
  'icas', 'ICAS', 'AU', 'australian_curriculum_v9',
  'a0000005-0000-0000-0000-000000000002',
  'linear',
  ARRAY[5],
  'icas_math_y5'
)
ON CONFLICT (id) DO NOTHING;

-- ─── assessment_profiles (2) ─────────────────────────────────────────────────

INSERT INTO assessment_profile (id, exam_family, program, year_level, version, framework_config_id, blueprint_id, duration_minutes)
VALUES
(
  'a0000008-0000-0000-0000-000000000001',
  'naplan', 'NAPLAN', 5, '2024',
  'a0000005-0000-0000-0000-000000000001',
  'a0000006-0000-0000-0000-000000000001',
  45
),
(
  'a0000008-0000-0000-0000-000000000002',
  'icas', 'ICAS', 5, '2024',
  'a0000005-0000-0000-0000-000000000002',
  'a0000006-0000-0000-0000-000000000002',
  60
)
ON CONFLICT (id) DO NOTHING;
