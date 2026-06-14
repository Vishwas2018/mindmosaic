# BUG-0003 — content-svc /content/import 500 with service-role auth (non-UUID tenant_id)

- Status: fixed
- Severity: high (blocked all live imports via service-role)
- Reported: 2026-06-14 (R-CONTENT-IMPORT-LIVE)
- Area: backend
- Tags: idempotency · content-svc · service-role

## Summary

`POST /content/import` returned 500 `INTERNAL_ERROR: invalid input syntax for type uuid: "_service_"` for all service-role authenticated calls. Dry-run calls (`?dry_run=true`) were unaffected because the dry-run path bypasses `withIdempotency`.

## Reproduction

1. Call `POST /content/import` with `x-mm-service-role: <SERVICE_ROLE_KEY>` and a valid `Idempotency-Key` header.
2. Expected: HTTP 200/207 with import results.
3. Actual: HTTP 500 `{"error":{"code":"INTERNAL_ERROR","message":"invalid input syntax for type uuid: \"_service_\""}}`

## Root cause

`content-svc/index.ts:135` initialised `importIdempScope = '_service_'` for service-role calls. This string was passed as `tenantId` to `withIdempotency`, which inserts it into `api_idempotency_key.tenant_id` — a `uuid NOT NULL` column. Postgres rejected the non-UUID value immediately.

The dry-run branch (line 164–172) calls `importItems` directly and never reaches `withIdempotency`, which is why dry-run worked.

## Fix

- Commit: (see R-CONTENT-IMPORT-LIVE fix commit on `v1.1.1/content-y5-numeracy`)
- File: `supabase/functions/content-svc/index.ts:135`
- Change: `importIdempScope = '_service_'` → `importIdempScope = '00000000-0000-0000-0000-000000000000'`
- Nil UUID chosen because `api_idempotency_key` has no FK on `tenant_id` (documented in migration 0004 comment: "no FK deps").

## Tests added

None beyond manual verification (live import of 132-item manifest producing 122 items in DB). Unit test for the service-role import path to be added in v1.1.1 test sweep.

## Regression-tested

Live import run 2026-06-14: batch-01 HTTP 200 (91 imported, 9 skipped), batch-02 HTTP 200 (31 imported, 1 skipped). DB count confirmed 122 draft items.
