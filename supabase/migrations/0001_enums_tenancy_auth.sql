-- =============================================================================
-- Migration 0001 — Enums + Tenancy + Auth
-- Stage 2 · 2026-05-01
-- Implements: DEV_PLAN.md Stage 2; Arch §1.2, §1.3, §1.6, §2.1, §2.2, §3.1, §3.2, §11.1
-- Spec refs: Spec §20.2, §20.3.1; G1; G2
-- ADRs: ADR-0003 (actor_role='parent' for self_service_signup log entries)
--        ADR-0004 (UTA-table RLS — minimal tenant-isolation, per-role deferred to Stage 5)
--        ADR-0005 (SECURITY DEFINER helpers for cross-table RLS — BUILD_CONTRACT §6)
-- Note: handle_new_user() — Arch §3.1 shows a simplified version; Arch §11.1 is authoritative.
--       §11.1 specifies two branches only in v1 (parent auto-create | else RAISE).
-- =============================================================================

-- =============================================================================
-- SECTION 1 — Custom Types (all enums)
-- =============================================================================

-- Roles & Auth
CREATE TYPE user_role AS ENUM (
  'student', 'parent', 'teacher', 'tutor', 'org_admin', 'platform_admin'
);
CREATE TYPE subscription_tier AS ENUM (
  'free', 'standard', 'premium', 'institutional'
);

-- Content
CREATE TYPE skill_level AS ENUM (
  'domain', 'strand', 'skill', 'subskill'
);
CREATE TYPE edge_type AS ENUM (
  'prerequisite', 'related', 'cross_domain'
);
CREATE TYPE dependency_class AS ENUM (
  'required', 'supportive', 'enriching'
);
CREATE TYPE exam_family AS ENUM (
  'naplan', 'icas', 'selective', 'singapore_math', 'olympiad'
);
CREATE TYPE response_type AS ENUM (
  'mcq', 'multi_select', 'short_answer', 'extended_response',
  'drag_drop', 'cloze', 'numeric_entry'
);
CREATE TYPE bloom_level AS ENUM (
  'remember', 'understand', 'apply', 'analyse', 'evaluate', 'create'
);
CREATE TYPE stimulus_type AS ENUM (
  'passage', 'image_set', 'data_table', 'audio_clip', 'video_clip'
);
CREATE TYPE item_lifecycle AS ENUM (
  'draft', 'review', 'active', 'monitored', 'retired'
);
CREATE TYPE misconception_category AS ENUM (
  'conceptual', 'procedural', 'transfer', 'careless', 'guessing'
);
CREATE TYPE misconception_severity AS ENUM (
  'minor', 'moderate', 'critical'
);
CREATE TYPE graph_version_status AS ENUM (
  'draft', 'published', 'archived'
);

-- Session & Engine
CREATE TYPE engine_type AS ENUM (
  'adaptive', 'linear', 'skill', 'diagnostic', 'repair'
);
CREATE TYPE session_mode AS ENUM (
  'exam', 'practice', 'diagnostic', 'skill_drill', 'repair', 'challenge'
);
CREATE TYPE session_status AS ENUM (
  'created', 'active', 'interrupted', 'submitted', 'processed', 'abandoned'
);
CREATE TYPE pipeline_status AS ENUM (
  'pending', 'sync_complete', 'async_complete', 'async_partial', 'async_failed'
);
CREATE TYPE learning_event_type AS ENUM (
  'answer', 'hint_requested', 'skip', 'pause', 'resume',
  'submit', 'timeout', 'repair_stage_complete'
);

-- Intelligence
CREATE TYPE misconception_status AS ENUM (
  'active', 'suspected', 'repairing', 'resolved', 'recurred'
);
CREATE TYPE repair_status AS ENUM (
  'queued', 'in_progress', 'completed', 'failed', 'deferred'
);
CREATE TYPE follow_up_result AS ENUM (
  'passed', 'regressed', 'pending'
);
CREATE TYPE plan_type AS ENUM (
  'weekly', 'exam_countdown', 'long_term', 'transition'
);
CREATE TYPE plan_status AS ENUM (
  'active', 'superseded', 'expired'
);
CREATE TYPE plan_session_status AS ENUM (
  'pending', 'completed', 'skipped'
);
CREATE TYPE plan_override_type AS ENUM (
  'pin_skill', 'dismiss_recommendation', 'override_plan_item'
);
CREATE TYPE alert_type AS ENUM (
  'declining_performance', 'persistent_misconception', 'high_fatigue',
  'low_persistence', 'repair_failure', 'exceptional_progress'
);
CREATE TYPE alert_severity AS ENUM (
  'info', 'warning', 'urgent'
);
CREATE TYPE alert_status AS ENUM (
  'active', 'acknowledged', 'dismissed', 'resolved'
);

-- Jobs
CREATE TYPE job_priority AS ENUM (
  'high', 'medium', 'low'
);
CREATE TYPE job_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'dead_letter'
);
CREATE TYPE pipeline_step_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'skipped'
);

-- Feature flags
CREATE TYPE flag_source AS ENUM (
  'subscription', 'admin_override', 'experiment'
);

-- Assignments
CREATE TYPE assignment_status AS ENUM (
  'draft', 'published', 'archived'
);
CREATE TYPE assignment_session_status AS ENUM (
  'pending', 'in_progress', 'completed', 'overdue'
);

-- Billing
CREATE TYPE invoice_status AS ENUM (
  'draft', 'open', 'paid', 'uncollectible', 'void'
);

-- Engagement
CREATE TYPE achievement_tier AS ENUM (
  'bronze', 'silver', 'gold', 'platinum'
);

-- Notifications
CREATE TYPE notification_type AS ENUM (
  'assignment_assigned', 'assignment_due_soon', 'assignment_overdue',
  'repair_ready', 'plan_updated', 'achievement_earned',
  'intervention_alert', 'system'
);

-- =============================================================================
-- SECTION 2 — Universal updated-at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- SECTION 3 — JWT helper functions (SECURITY DEFINER, STABLE)
-- Per ADR-0005: each helper has SET search_path, REVOKE FROM PUBLIC,
-- GRANT TO authenticated.
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    current_setting('request.jwt.claims', true)::jsonb
    -> 'app_metadata' ->> 'tenant_id'
  )::uuid;
$$;

REVOKE EXECUTE ON FUNCTION auth_tenant_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION auth_tenant_id() TO   authenticated;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )::uuid;
$$;

REVOKE EXECUTE ON FUNCTION auth_user_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION auth_user_id() TO   authenticated;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    current_setting('request.jwt.claims', true)::jsonb
    -> 'app_metadata' ->> 'role'
  )::user_role;
$$;

REVOKE EXECUTE ON FUNCTION auth_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION auth_role() TO   authenticated;

-- =============================================================================
-- SECTION 4 — handle_new_user trigger function (G1 — two branches only)
-- Per Arch §11.1 (authoritative; §3.1 simplified version is a placeholder).
-- Per ADR-0003: actor_role='parent', action='self_service_signup'.
-- PHASE-2: school self-serve onboarding (org_admin/teacher invite branches)
--          see OWNERS.md auth-svc deferred endpoints
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id  uuid;
  v_role       text;
  v_display_name text;
BEGIN
  v_role         := NEW.raw_user_meta_data ->> 'role';
  v_display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    split_part(NEW.email, '@', 1)
  );

  IF v_role = 'parent' THEN
    -- Auto-create family tenant (G1 — Spec Part III.5 §V1.1)
    INSERT INTO tenant (name, slug, type, region)
    VALUES (
      v_display_name || '''s Family',
      left(gen_random_uuid()::text, 8) || '-family',
      'family',
      'au-syd'
    )
    RETURNING id INTO v_tenant_id;

    INSERT INTO user_profile (id, tenant_id, role, email, display_name)
    VALUES (
      NEW.id,
      v_tenant_id,
      'parent'::user_role,
      NEW.email,
      v_display_name
    );

    -- Audit trail: actor_role='parent', action='self_service_signup' (ADR-0003)
    INSERT INTO admin_action_log (
      actor_id, actor_role, action, entity_type, entity_id, payload
    ) VALUES (
      NEW.id,
      'parent'::user_role,
      'self_service_signup',
      'tenant',
      v_tenant_id,
      jsonb_build_object('email', NEW.email, 'display_name', v_display_name)
    );

  ELSE
    -- PHASE-2: school self-serve onboarding (org_admin/teacher invite branches)
    --          see OWNERS.md auth-svc deferred endpoints
    RAISE EXCEPTION
      'INVALID_SIGNUP_ROLE: only parent self-service signup is supported in v1; '
      'students are created by parents via POST /users/me/children; '
      'teachers and org_admins are provisioned by service-role admin scripts';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;

-- =============================================================================
-- SECTION 5 — Tables (FK dependency order: tenant → user_profile →
--             parent_student_link / class_group → class_student /
--             feature_flag / admin_action_log)
-- =============================================================================

CREATE TABLE tenant (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  type       text        NOT NULL DEFAULT 'family'
               CHECK (type IN ('family', 'school', 'tutor_centre')),
  region     text        NOT NULL DEFAULT 'au-syd',
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------

CREATE TABLE user_profile (
  id           uuid        PRIMARY KEY,  -- matches auth.users.id
  tenant_id    uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  role         user_role   NOT NULL,
  email        text,
  display_name text        NOT NULL,
  year_level   int         CHECK (year_level BETWEEN 1 AND 12),
  preferences  jsonb       NOT NULL DEFAULT '{}',
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_tenant      ON user_profile(tenant_id);
CREATE INDEX idx_user_tenant_role ON user_profile(tenant_id, role);

-- ---------------------------------------------------------------------------

CREATE TABLE parent_student_link (
  parent_id  uuid        NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX idx_psl_parent  ON parent_student_link(parent_id);
CREATE INDEX idx_psl_student ON parent_student_link(student_id);

-- ---------------------------------------------------------------------------

CREATE TABLE class_group (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  teacher_id uuid        NOT NULL REFERENCES user_profile(id) ON DELETE RESTRICT,
  name       text        NOT NULL,
  year_level int,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_teacher ON class_group(teacher_id);
CREATE INDEX idx_class_tenant  ON class_group(tenant_id);

-- ---------------------------------------------------------------------------

CREATE TABLE class_student (
  class_id   uuid        NOT NULL REFERENCES class_group(id)   ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES user_profile(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

CREATE INDEX idx_cs_student        ON class_student(student_id);
CREATE INDEX idx_cs_class_student  ON class_student(class_id, student_id);

-- ---------------------------------------------------------------------------

CREATE TABLE feature_flag (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        REFERENCES tenant(id) ON DELETE CASCADE,  -- NULL = platform default
  feature_key text        NOT NULL,
  enabled     boolean     NOT NULL DEFAULT false,
  config      jsonb,
  source      flag_source NOT NULL DEFAULT 'subscription',
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Two partial unique indexes — replaces magic-UUID pattern (Arch §2.2 v2.0 change #15)
CREATE UNIQUE INDEX idx_ff_platform ON feature_flag(feature_key)           WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_ff_tenant   ON feature_flag(tenant_id, feature_key) WHERE tenant_id IS NOT NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE admin_action_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        NOT NULL REFERENCES user_profile(id) ON DELETE RESTRICT,
  actor_role  user_role   NOT NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  payload     jsonb,
  ip_address  inet,
  trace_id    uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_log_actor  ON admin_action_log(actor_id, created_at DESC);
CREATE INDEX idx_admin_log_entity ON admin_action_log(entity_type, entity_id);

-- =============================================================================
-- SECTION 6 — SECURITY DEFINER helpers for junction-table RLS
-- Required by ADR-0005: any policy subquerying a tenant-scoped table with RLS
-- enabled must use a SECURITY DEFINER helper (prefix fn_), not an inline subquery.
-- fn_user_in_my_tenant  — used by parent_student_link policy (refs user_profile)
-- fn_class_in_my_tenant — used by class_student policy        (refs class_group)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_user_in_my_tenant(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profile
    WHERE id = user_uuid
      AND tenant_id = auth_tenant_id()
  );
$$;

REVOKE EXECUTE ON FUNCTION fn_user_in_my_tenant(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_user_in_my_tenant(uuid) TO   authenticated;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_class_in_my_tenant(class_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_group
    WHERE id = class_uuid
      AND tenant_id = auth_tenant_id()
  );
$$;

REVOKE EXECUTE ON FUNCTION fn_class_in_my_tenant(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_class_in_my_tenant(uuid) TO   authenticated;

-- =============================================================================
-- SECTION 7 — set_updated_at triggers (mutable tables only)
-- =============================================================================

CREATE TRIGGER trg_tenant_updated_at
  BEFORE UPDATE ON tenant
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_class_group_updated_at
  BEFORE UPDATE ON class_group
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_feature_flag_updated_at
  BEFORE UPDATE ON feature_flag
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 8 — handle_new_user trigger on auth.users
-- =============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- SECTION 9 — Row-Level Security
-- Per ADR-0004: minimal tenant-isolation policies for UTA tables.
-- Per-role SELECT granularity deferred to Stage 5 (when Pattern A student-data
-- tables are created and cross-table subqueries against user_profile become live).
-- admin_action_log uses Pattern G (deny-all from client JWTs).
-- =============================================================================

-- tenant: only see your own tenant row
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_self_select" ON tenant
  FOR SELECT
  USING (id = auth_tenant_id());

-- user_profile: see all profiles in your tenant
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "up_tenant_select" ON user_profile
  FOR SELECT
  USING (tenant_id = auth_tenant_id());

-- parent_student_link: no tenant_id column — use SECURITY DEFINER helper (ADR-0005)
ALTER TABLE parent_student_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psl_tenant_select" ON parent_student_link
  FOR SELECT
  USING (fn_user_in_my_tenant(parent_id));

-- class_group: see classes in your tenant
ALTER TABLE class_group ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cg_tenant_select" ON class_group
  FOR SELECT
  USING (tenant_id = auth_tenant_id());

-- class_student: no tenant_id column — use SECURITY DEFINER helper (ADR-0005)
ALTER TABLE class_student ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_tenant_select" ON class_student
  FOR SELECT
  USING (fn_class_in_my_tenant(class_id));

-- feature_flag: platform defaults (tenant_id IS NULL) visible to all authenticated;
-- tenant-specific flags visible only to that tenant
ALTER TABLE feature_flag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ff_tenant_select" ON feature_flag
  FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = auth_tenant_id());

-- admin_action_log: Pattern G — deny-all from client JWTs (service role bypasses RLS)
ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;
-- No policies = deny all. Service role bypasses RLS.
