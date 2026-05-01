-- =============================================================================
-- Down Migration 0001 — Enums + Tenancy + Auth
-- Stage 2 · 2026-05-01
-- Reverses: 0001_enums_tenancy_auth.sql
--
-- Drop order rationale (see BUILD_CONTRACT §10):
-- 1. auth.users trigger first — no table deps within this migration, but must
--    go before handle_new_user() function can be dropped.
-- 2. Tables in FK dependency order (most-dependent first):
--    admin_action_log (FK → user_profile)
--    class_student    (FK → class_group, user_profile)
--    parent_student_link (FK → user_profile ×2)
--    class_group      (FK → tenant, user_profile)
--    feature_flag     (FK → tenant, nullable)
--    user_profile     (FK → tenant)
--    tenant           (no FK deps within this migration)
--    Dropping each table also drops: its indexes, triggers, and RLS policies.
--    No CASCADE needed — FK relationships are handled by drop order.
-- 3. Functions after tables (no remaining dependents).
-- 4. Enum types last (all tables referencing them already gone).
-- =============================================================================

-- Step 1: Remove trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop tables in dependency order
DROP TABLE IF EXISTS admin_action_log;
DROP TABLE IF EXISTS class_student;
DROP TABLE IF EXISTS parent_student_link;
DROP TABLE IF EXISTS class_group;
DROP TABLE IF EXISTS feature_flag;
DROP TABLE IF EXISTS user_profile;
DROP TABLE IF EXISTS tenant;

-- Step 3: Drop functions
DROP FUNCTION IF EXISTS fn_class_in_my_tenant(uuid);
DROP FUNCTION IF EXISTS fn_user_in_my_tenant(uuid);
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS auth_role();
DROP FUNCTION IF EXISTS auth_user_id();
DROP FUNCTION IF EXISTS auth_tenant_id();
DROP FUNCTION IF EXISTS set_updated_at();

-- Step 4: Drop enum types
-- Notifications
DROP TYPE IF EXISTS notification_type;
-- Engagement
DROP TYPE IF EXISTS achievement_tier;
-- Billing
DROP TYPE IF EXISTS invoice_status;
-- Assignments
DROP TYPE IF EXISTS assignment_session_status;
DROP TYPE IF EXISTS assignment_status;
-- Feature flags
DROP TYPE IF EXISTS flag_source;
-- Jobs
DROP TYPE IF EXISTS pipeline_step_status;
DROP TYPE IF EXISTS job_status;
DROP TYPE IF EXISTS job_priority;
-- Intelligence
DROP TYPE IF EXISTS alert_status;
DROP TYPE IF EXISTS alert_severity;
DROP TYPE IF EXISTS alert_type;
DROP TYPE IF EXISTS plan_override_type;
DROP TYPE IF EXISTS plan_session_status;
DROP TYPE IF EXISTS plan_status;
DROP TYPE IF EXISTS plan_type;
DROP TYPE IF EXISTS follow_up_result;
DROP TYPE IF EXISTS repair_status;
DROP TYPE IF EXISTS misconception_status;
-- Session & Engine
DROP TYPE IF EXISTS learning_event_type;
DROP TYPE IF EXISTS pipeline_status;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS session_mode;
DROP TYPE IF EXISTS engine_type;
-- Content
DROP TYPE IF EXISTS graph_version_status;
DROP TYPE IF EXISTS misconception_severity;
DROP TYPE IF EXISTS misconception_category;
DROP TYPE IF EXISTS item_lifecycle;
DROP TYPE IF EXISTS stimulus_type;
DROP TYPE IF EXISTS bloom_level;
DROP TYPE IF EXISTS response_type;
DROP TYPE IF EXISTS exam_family;
DROP TYPE IF EXISTS dependency_class;
DROP TYPE IF EXISTS edge_type;
DROP TYPE IF EXISTS skill_level;
-- Roles & Auth (last — referenced by live trigger until now)
DROP TYPE IF EXISTS subscription_tier;
DROP TYPE IF EXISTS user_role;
