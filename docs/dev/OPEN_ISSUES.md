# OPEN_ISSUES.md — living list

> Pruned on audit days (every 5 stages). Resolved → ## Resolved with date.
> Use the severity rubric in CLAUDE.md.

## Open

### ISSUE-0006 — intelligence-svc L3a bypasses skill-graph cache (architectural inconsistency vs arch §9.3)

- Status: open
- Severity: medium
- Reported: 2026-05-09 (Stage 21 §2A)
- Area: backend (intelligence-svc)
- Tags: architectural-consistency · cache · pre-launch

**Summary.** `supabase/functions/intelligence-svc/handlers.ts` (Stage 20)
runs L3a's depth-1 prereq walk by querying `skill_edge` directly:

```ts
const edgesRes = await client
  .from('skill_edge')
  .select('from_node_id, to_node_id')
  .in('to_node_id', touchedSkills);
```

Per arch §9.3 (Cache Strategy table), the Active skill graph cache —
`supabase/functions/_shared/skill-graph-cache.ts` — is **the read path** for
skill-graph data inside Edge Functions (1h TTL, watermark-invalidated on
graph publish). intelligence-svc L3a is the only consumer in v1 that reads
graph data without going through the cache. content-svc already uses the
cache; orchestration-svc and analytics-svc are not yet built.

**Impact.** Not breaking. Functional correctness is unaffected (the direct
query returns the same rows the cache would). Cost: one extra DB round-trip
per `/intelligence/process-session/{id}` call — acceptable inside the 3 s
sync SLA, measurable but small at Stage 26 load test. The real concern is
**architectural consistency**: arch §9.3 names the cache as the single
read path; having one service bypass it is a footgun for future changes
(graph version migrations, tenant-scoped variants, replay-determinism
tightening).

**Why not in Stage 21.** Q-21.1 = NO per scope discipline. Stage 21's
brief is *cache hardening* (in-flight dedup + stale-while-revalidate per
ADR-0028), not *cache adoption*. Pulling in a new caller would
double-scope the stage, expand the test surface beyond the 1-day budget,
and risk replay-determinism regressions in Stage 20's named exit-criterion
test (the cache's iteration order + module-scope state would need to be
proven byte-stable across runs).

**Recommended fix.** Either (a) a small dedicated pre-launch stage that
migrates intelligence-svc L3a to read via `getSkillGraph()` + adds a
follow-up replay-determinism test, or (b) fold into Stage 28 (jobs-worker)
when the orchestration-svc + analytics-svc readers are built so all three
services pick up the cache pattern at once.

**Reproduction.** `grep -n "skill_edge" supabase/functions/intelligence-svc/handlers.ts`
returns one match — the bypass site at the L3a entry.

### ISSUE-0005 — `apps/web/.env.local.example` populated with real Supabase URL + anon JWT

- Status: open
- Severity: medium
- Reported: 2026-05-08 (Stage 19 audit close)
- Area: infra / dx
- Tags: hygiene · footgun · secrets-policy

**Summary.** `apps/web/.env.local.example` is unstaged-modified to contain a real
project URL (`https://tohmshcpdhcdfsubvnok.supabase.co`) and a real anon JWT
(`role=anon`, `iat=2026-04-29`, `exp=2036-04-26`). Anon keys are *intentionally*
browser-exposed by Supabase's RLS-first model — this is **not a security
incident** in the credentials-leak sense. It is a hygiene/footgun issue:

1. `*.example` files are conventionally placeholders (`your-project.supabase.co`
   / `your-anon-key`). The current state nudges every new clone toward a
   single shared dev project.
2. Any future rotation of the anon key (e.g. tenant-isolation issue, RLS
   policy bug requiring revocation) must update this file too — easy to forget.
3. If anyone later confuses "anon key looks safe to commit" with "service role
   key looks safe to commit", the precedent is set in the wrong direction.

**Reproduction.** `git diff apps/web/.env.local.example` on `main` post-Stage 19.

**Recommended fix.** Either (a) restore placeholders and instruct local devs
to copy → `.env.local`; or (b) keep populated but rename to `.env.dev.shared`
+ add comment "anon key, RLS-protected, safe to commit; do NOT mirror this for
service-role".

**Why not in Stage 20.** Stage 20 is the highest-risk Phase 1 stage (replay
determinism). Hygiene cleanups don't belong in the same atomic commit. File
as a separate small chore commit at next audit (Stage 24) or sooner.



## Resolved

### ISSUE-0004 — outbox_event 7-day cleanup not wired (arch §5.6)

- Status: resolved
- Severity: low
- Reported: 2026-05-03 (Stage 10)
- Closed: 2026-05-04 (Stage 14 close)
- Resolution: Migration 0011 adds `fn_cleanup_outbox()` (DELETEs processed outbox_events
  older than 7 days) and schedules `outbox.cleanup` cron via `cron.schedule()` at `'15 4 * * *'`
  (04:15 UTC daily). Commit: c3df874.

### ISSUE-0003 — GitHub Actions internal Node.js 20 runtime — upstream action upgrade required before 2026-06-02

- Status: resolved
- Severity: medium
- Reported: 2026-05-02 (post Stage 5 close)
- Closed: 2026-05-03 (Stage 10 audit day)
- Resolution: Bumped `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` from @v4
  to @v5 in `.github/workflows/ci.yml`. All 4 jobs (lint, typecheck, unit, migration-dryrun)
  updated. No ADR filed — no non-trivial behavior change (version bump only).
  Commit: 9eb2f4b. Well ahead of 2026-06-02 forced-upgrade deadline.

### ISSUE-0002 — SECURITY DEFINER helpers: Stage 2/3 helpers missing `REVOKE EXECUTE FROM anon`

- Status: resolved
- Severity: low
- Reported: 2026-05-02 (Stage 5)
- Closed: 2026-05-03 (Stage 10 audit day)
- Resolution: Migration 0009 adds REVOKE FROM authenticated + REVOKE FROM anon + GRANT TO
  authenticated for all 6 Stage 2/3 SECURITY DEFINER helpers. 009_security_definer_retrofit.sql
  pgTAP tests confirm anon denial + authenticated access (440/440 green). No ADR filed —
  A1 triple-REVOKE pattern already documented in BUILD_CONTRACT §6 and PGTAP_PATTERNS P3.
  Commit: 75ac299.

### ISSUE-0001 — CI node-version: GitHub Actions Node 20 deprecation; upgrade to Node 22 LTS

- Status: resolved
- Severity: medium
- Reported: 2026-05-02 (Stage 3 morning reconciliation)
- Closed: 2026-05-02 (Stage 5 audit day)
- Resolution: Bumped `node-version` to `"22"` in all three CI runner jobs (lint, typecheck, unit);
  updated `package.json` `engines.node` to `>=22`; created `.nvmrc` with `22`.
  ADR-0010 filed. Commit: this audit day commit.

### ISSUE-0001 (original, 2026-05-01) — UTA-table SELECT policies: tenant-scoped only, per-role absent until Stage 5

- Status: wont-fix
- Severity: medium (at close)
- Reported: 2026-05-01 (Stage 2)
- Closed: 2026-05-02
- Rationale: Duplicate of ADR-0004 deferral. ADR-0004 fully documents the scope decision and
  the Stage 5 obligation. The same forward-flag is recorded in PROJECT_STATE.md "Notes for next
  session". A separate issue entry added noise without adding information. Node-runtime CI bump
  refiled as ISSUE-0001 — that issue has a hard external deadline (2026-06-02) that warrants
  an open issue; the RLS deferral does not (it is a planned Stage 5 deliverable, not a deadline risk).
