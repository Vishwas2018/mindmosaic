-- 0022_assignments_composer_fields.down.sql
ALTER TABLE assignment
  DROP COLUMN IF EXISTS simulation_params,
  DROP COLUMN IF EXISTS composer_params;
