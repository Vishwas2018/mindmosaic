# OPEN_ISSUES.md — living list

> Pruned on audit days (every 5 stages). Resolved → ## Resolved with date.
> Use the severity rubric in CLAUDE.md.

## Open

### ISSUE-0001 — UTA-table SELECT policies: tenant-scoped only, per-role absent until Stage 5

- Severity: medium
- Reported: 2026-05-01 (Stage 2)
- Area: backend
- Tags: rls

The SELECT policies on `tenant`, `user_profile`, `parent_student_link`, `class_group`,
`class_student`, and `feature_flag` enforce tenant isolation only (`tenant_id = auth_tenant_id()`).
There is no per-role row filtering. Until Stage 5, any authenticated user in a tenant can
SELECT all rows in all UTA tables in that tenant regardless of role — e.g., a student in a
family tenant can read the parent's `user_profile` row.

This is an intentional deferral (ADR-0004). Stage 5 must add per-role SELECT policies on all
6 UTA tables when Pattern A student-data tables are created and the full SECURITY DEFINER helper
suite is live.

- Linked: ADR-0004
- Resolution: Stage 5 (per-role SELECT policies on all 6 UTA tables)

## Resolved

<!-- none -->
