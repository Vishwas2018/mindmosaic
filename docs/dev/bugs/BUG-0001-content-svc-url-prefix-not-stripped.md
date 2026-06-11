# BUG-0001 — content-svc route dispatcher: URL prefix not stripped in local dev

- Status: fixed
- Severity: critical
- Reported: 2026-05-21 (v1.1-S7.1 Gate II unblock)
- Area: backend
- Tags: edge-runtime · routing · local-dev
- Cross-reference: ISSUE-0056 in OPEN_ISSUES.md is the living-list entry for this bug; BUG-NNNN files are the parallel detailed-report scheme per CLAUDE.md § Dev journal (both trackers intentional).

## Summary

All content-svc routes returned 404 "Endpoint not found" in local development.
The Supabase edge runtime v1.73.13 passes `req.url` with a pathname of
`/content-svc/<rest>` (no `/functions/v1/` prefix). The dispatcher stripped
only `/functions/v1/content-svc`, leaving path as `/content-svc/content/import`
instead of `/content/import`. Every route comparison failed.

## Reproduction

1. Run `supabase start` with edge runtime v1.73.13
2. `POST /functions/v1/content-svc/content/import?dry_run=true` with valid auth
3. Expected: 200 with import result
4. Actual: 404 `{"code":"NOT_FOUND","message":"Endpoint not found"}`
5. Function log confirms: `"endpoint":"POST /content-svc/content/import"` — prefix not stripped

## Root cause

`content-svc/index.ts:96` (pre-fix):
```typescript
const path = url.pathname.replace(/^\/functions\/v1\/content-svc/, '');
```
Production Supabase sends `/functions/v1/content-svc/content/import` → regex matches → `/content/import`.
Local dev edge runtime sends `/content-svc/content/import` → regex does NOT match → path stays `/content-svc/content/import`.

## Fix

- Commit: (pending — `fix(content-svc): normalise URL prefix in route dispatcher`)
- Change: `index.ts:96` regex to `/^\/(functions\/v1\/)?content-svc/`
  - Production form `/functions/v1/content-svc/<rest>` → `/<rest>` ✓
  - Local dev form `/content-svc/<rest>` → `/<rest>` ✓
- Tests added: `contract.test.ts` — describe `'content-svc — route prefix stripping (BUG-0001)'`
  - 5 cases: production strip, local-dev strip, no-prefix passthrough (incl. /functions/v1/billing-svc/x), mid-path anchor, bare /content-svc → empty string
- Regression-tested: Gate II dry-run confirmed HTTP 200 post-fix
