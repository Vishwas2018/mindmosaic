-- =============================================================================
-- Migration 0024 — exam_family enum rename
-- v1.1-S7 · 2026-05-20
-- Q-1.1-S7-LEGAL-2 Option A: remove trademark strings from the DB enum.
-- 'naplan' → 'au_numeracy_y5_format'
-- 'icas'   → 'au_math_paper_c_format'
-- Existing rows updated in-place by Postgres; no data backfill required.
-- =============================================================================

ALTER TYPE exam_family RENAME VALUE 'naplan' TO 'au_numeracy_y5_format';
ALTER TYPE exam_family RENAME VALUE 'icas'   TO 'au_math_paper_c_format';
