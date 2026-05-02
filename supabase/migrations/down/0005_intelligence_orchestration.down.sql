-- =============================================================================
-- Migration 0005 DOWN — Intelligence Foundation
-- Stage 6 · 2026-05-03
-- Reverses 0005_intelligence_orchestration.sql
-- Drop order: reverse FK dependency (most-constrained first).
--   plan_revision (FK → learning_plan CASCADE) before learning_plan.
--   recommendation (FK → learning_plan SET NULL) before learning_plan.
--   All other Stage 6 tables have no intra-Stage 6 FK dependencies.
-- Triggers are dropped automatically with their tables.
-- intelligence_audit_log drop also drops intelligence_audit_log_default partition.
-- =============================================================================

DROP TABLE IF EXISTS cohort_metric_cache;
DROP TABLE IF EXISTS intervention_alert;
DROP TABLE IF EXISTS plan_override;
DROP TABLE IF EXISTS recommendation;
DROP TABLE IF EXISTS plan_revision;
DROP TABLE IF EXISTS learning_plan;
DROP TABLE IF EXISTS intelligence_audit_log;  -- drops _default partition automatically
DROP TABLE IF EXISTS repair_record;
DROP TABLE IF EXISTS student_misconception;
DROP TABLE IF EXISTS behaviour_profile;
DROP TABLE IF EXISTS learning_velocity;
DROP TABLE IF EXISTS skill_mastery;
