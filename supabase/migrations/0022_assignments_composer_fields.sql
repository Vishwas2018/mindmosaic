-- 0022_assignments_composer_fields.sql
-- v1.1-S4: Add nullable jsonb columns for exam composer params and simulation params.
--
-- Corrects ADR-0038 §Decision 4 "0 migrations" claim (Q-1.1-4.8):
-- difficulty_range already existed (semantic float-range from 0007); composer_params
-- and simulation_params are net-new exam-mode fields requiring this migration.
-- No RLS change: additive nullable columns are covered by existing assignment-table row-level policies.
-- Null-default safe: existing assignment rows are unaffected.

ALTER TABLE assignment
  ADD COLUMN composer_params   jsonb NULL,
  ADD COLUMN simulation_params jsonb NULL;
