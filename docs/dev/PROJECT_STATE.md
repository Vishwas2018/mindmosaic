# PROJECT_STATE.md

> Overwritten end-of-day. If a value is unknown, write
> "unknown — TODO measure". Never invent numbers.

## Position

- Last completed stage: Stage 14 — apps/web scaffold + auth-svc + users-svc + seeds (2026-05-04)
- Next stage: Stage 15 — engines-client package (AdaptiveEngine, LinearEngine interfaces)
- Days remaining (target 75): 63
- Buffer days consumed in Phase 0 (Stages 1–14): 0 of 3

## Test suite

| Suite        | Status   | Count     | Last run   |
| ------------ | -------- | --------- | ---------- |
| Unit         | ✅ green  | 171/171   | 2026-05-03 |
| Integration  | n/a      | n/a       | n/a        |
| pgTAP        | ✅ green  | 451/451   | 2026-05-03 |
| Contract     | n/a      | n/a       | n/a        |
| RLS          | ✅ green  | 451/451 (53 tables) | 2026-05-03 |
| E2E          | n/a      | n/a       | n/a        |

Unit breakdown: 97 (@mm/types) + 24 (@mm/sdk) + 50 (@mm/ui: 26 axe + 24 functional)
pgTAP/RLS not re-run for Stage 14 — no new tables; migration 0011 adds functions only.

## Quality gates

| Gate            | Last status | Last run   |
| --------------- | ----------- | ---------- |
| pnpm lint       | ✅ green (all packages) | 2026-05-04 |
| pnpm typecheck  | ✅ green (all packages) | 2026-05-04 |
| pnpm test       | ✅ green (171/171 unit) | 2026-05-03 |
| pnpm build      | ✅ green (cached from Stage 1) | 2026-04-30 |
| RLS coverage    | ✅ 53/53 tables enabled + tested | 2026-05-03 |
| pnpm audit      | unknown — TODO measure | n/a |
| pnpm test:migration | ✅ green (10 migrations roundtrip) | 2026-05-03 |

## Performance vs BUILD_CONTRACT §10 budgets

| Endpoint                          | Budget p95 | Measured p95 |
| --------------------------------- | ---------- | ------------ |
| POST /sessions/{id}/respond       | 300 ms     | n/a          |
| POST /sessions/{id}/submit + sync | 5000 ms    | n/a          |
| Pipeline async                    | 30000 ms   | n/a          |
| Dashboard load                    | 2000 ms    | n/a          |

## Open items

- ADRs accepted: 21 (ADR-0001 through ADR-0021)
- ADRs proposed: 0
- Issues critical / high / medium / low: 0/0/0/0
- Open questions: 0
- Open bugs: 0
- Deviations logged: 2 (DEV-20260430-1 ongoing Stage 15; DEV-20260503-2 ongoing v1.1)

## Notes for next session

**Stage 14 complete (2026-05-04):**

**Cluster A — apps/web (commit 5e3e1f0):**
- Next.js 14 App Router: route groups (public/student/parent/teacher/admin), server components
- @supabase/ssr cookie handling (ADR-0021); middleware role guard at src/middleware.ts
- AuthProvider + EntitlementsProvider (PHASE-2 stub) + Providers wrapper
- LoginForm + SignupForm: RHF + Zod; Input component with {...register()} pattern
- AuthPageShell two-panel layout; all role-gated dashboard placeholder pages
- Key TS issue: noPropertyAccessFromIndexSignature requires bracket notation everywhere

**Cluster B — Edge Functions + migration 0011 (commit c3df874):**
- auth-svc: signup/login/refresh/logout/forgot-password/reset-password (6 endpoints)
  Rate limits: 10/min for signup+login, 3/hr for forgot-password
  G1: student self-signup blocked at endpoint (422) + DB trigger defence-in-depth
- users-svc: GET+PATCH /users/me, GET /users/me/children, POST stub (422 invite-only)
- _shared: trace-id, error-envelope, rate-limit (fn_check_rate_limit RPC), auth, logger
- migration 0011: fn_check_rate_limit SECURITY DEFINER + fn_cleanup_outbox + outbox.cleanup cron
- ISSUE-0004 resolved in this migration

**Cluster C — Seeds + Scripts + CI (commit 969ec57):**
- 6 seed files loaded via supabase/seeds/*.sql glob (config.toml updated)
- G5 content: 9 skill nodes, 4 edges, 2 stimuli, 10 misconceptions, 50 items (15/20/15 difficulty split)
- validate-content.ts: asserts all G5 minimums (pnpm validate:content)
- set-tenant-tier.ts: delete+insert feature flags by tier (G2 authorised writer; no Stripe until Stage 42)
- feature_flag partial unique index (tenant_id, feature_key WHERE NOT NULL) — use delete+insert pattern
- subscription partial unique index (tenant_id WHERE is_active) — use SELECT+UPDATE-or-INSERT

**ADR-0021:** @supabase/ssr chosen over manual cookie handling.

**DEV-20260430-1:** ongoing, resolves Stage 15.
**DEV-20260503-2:** ongoing, resolves v1.1 (content.recalibration stub).

**Supabase remote project:** https://tohmshcpdhcdfsubvnok.supabase.co (ap-southeast-2)

**Stage 15 pre-cues:**
- Build engines-client package: AdaptiveEngine, LinearEngine, SkillEngine, DiagnosticEngine interfaces
- Wire up session scaffolding in packages/engines or packages/sdk
- Check DEV_PLAN Stage 15 preconditions before coding
