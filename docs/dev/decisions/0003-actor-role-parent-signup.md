# ADR-0003 — actor_role='parent' for self_service_signup log entries

- Status: accepted
- Date: 2026-05-01
- Stage: 2
- Tags: backend, data, security

## Context

`handle_new_user()` (Arch §11.1) inserts an `admin_action_log` entry on parent
self-service signup. Arch §11.1 specifies `action = 'self_service_signup'` and
`entity_type = 'tenant'` but is silent on what `actor_role` value to use.

The `user_role` enum values in v1 are: 'student', 'parent', 'teacher', 'tutor',
'org_admin', 'platform_admin'. The trigger fires after INSERT on `auth.users`,
before the `user_profile` row is committed. The intended role is known from
`raw_user_meta_data ->> 'role'` (set by the signup client).

## Options considered

1. **'parent'** — Actor is signing up as a parent; role is known from metadata at
   trigger time. Accurate representation of who initiated the action.
2. **'platform_admin'** — System-initiated framing. Misrepresents the actor — the
   parent, not an admin, initiated the signup.
3. **NULL** — actor_role column is NOT NULL; not a valid option.

## Decision

Use `actor_role = 'parent'::user_role`.

## Rationale

The parent's intended role is known from JWT metadata at trigger time. The log
entry records who initiated the action; the parent initiated it. Using 'parent'
is accurate and consistent with audit-log semantics elsewhere in the system.

## Consequences

- Positive: Audit log accurately reflects the actor type.
- Negative: None material — the trigger is atomic with the INSERT so there is no
  partial-state risk.
- Follow-ups: Phase-2 school onboarding branches (org_admin / teacher invite)
  will use their respective role values; no change to parent path needed.

## Implementation notes

Files: `supabase/migrations/0001_enums_tenancy_auth.sql` §4 · Commit: e58a925
