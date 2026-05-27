-- =============================================================================
-- Migration 0025 — Deny-all RLS on _default partitions (ISSUE-0060 remediation)
-- v1.1 · 2026-05-27
-- Refs: ISSUE-0060, rls-check-e2e.sql q2+q4 (empirical gate — exit 3 confirmed)
--
-- Problem: PostgreSQL 15 does not propagate ENABLE ROW LEVEL SECURITY from a
-- partitioned parent to its partitions. learning_event and intelligence_audit_log
-- have ENABLE RLS + full policy sets (migrations 0004/0005), but their _default
-- partitions were created without explicit RLS. Direct access to a partition
-- bypasses the parent's policies; rls-check-e2e.sql q2 + q4 returned N_ROWS as
-- anon, confirming the bypass.
--
-- Fix: ENABLE ROW LEVEL SECURITY + a deny-all USING(false) policy on each
-- _default partition.
--
-- Why USING(false) is safe here:
--   In PostgreSQL 15, a partition's own policies apply ONLY on direct access to
--   that partition. Queries routed via the parent table (learning_event /
--   intelligence_audit_log) use the parent's policies exclusively; the partition
--   policy is NOT applied in addition. All legitimate reads go through the parent.
--
--   Writes to learning_event go through create_session_response_atomic
--   (SECURITY DEFINER — bypasses RLS). Writes to intelligence_audit_log go
--   through intelligence-svc as service_role (BYPASSRLS). Both write paths are
--   unaffected by this policy.
--
--   The deny-all policy closes the PostgREST direct-partition attack surface for
--   all roles (anon, authenticated).
--
-- Partition layout at time of this migration (v1 static):
--   learning_event         → learning_event_default (sole partition)
--   intelligence_audit_log → intelligence_audit_log_default (sole partition)
--   No pg_partman, no monthly ranges. Monthly carve-up deferred to v1.1
--   (see ISSUE-0071 — new partitions born RLS-disabled; apply same pattern on
--   creation).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- learning_event_default
-- Parent policies (le_student_select / le_parent_select / le_teacher_select /
-- le_org_admin / le_platform_admin) remain active on learning_event and govern
-- all app-layer access. This policy denies direct partition reads only.
-- ---------------------------------------------------------------------------
ALTER TABLE learning_event_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY "led_deny_all"
  ON learning_event_default
  FOR ALL
  USING (false);

-- ---------------------------------------------------------------------------
-- intelligence_audit_log_default
-- Parent policies (ial_student_select / ial_parent_select / ial_teacher_select /
-- ial_org_admin / ial_platform_admin) remain active on intelligence_audit_log.
-- ---------------------------------------------------------------------------
ALTER TABLE intelligence_audit_log_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iald_deny_all"
  ON intelligence_audit_log_default
  FOR ALL
  USING (false);
