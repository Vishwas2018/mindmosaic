# Performance Measurements

> Append-only. Each section: run date, environment, tool, results against BUILD_CONTRACT §10 budgets.
> Unknown values written as "not measured — TODO measure". Never invent numbers.

---

## Stage 48 — 2026-06-07 — SLA budget baseline

**Environment:** Not measured — deployed environment required (sandbox does not have running services with production data).
**Tool:** k6 (binary absent in sandbox; scripts authored at Stage 48)
**Reference scripts:**
- `k6/session-loop.js` — assessment-svc 500 VU ramping (pre-existing, Stage 20+)
- `k6/billing-webhook.js` — billing-svc webhook + flag propagation (NEW, Stage 48 D8)

**Status:** All 8 SLA budget measurements deferred to Stage 49 launch-window operational verification.
See `docs/dev/stage-48-exit-report.md` §5 for deployed-env deferrals.

### BUILD_CONTRACT §10 + §8 budgets

| Endpoint / Operation | Budget p95 | Measured p95 | Last measured |
|---|---|---|---|
| Session create — POST /sessions/create | 1000 ms | not measured — Stage 49 k6 run | n/a |
| Session respond — POST /sessions/{id}/respond | 300 ms | not measured — Stage 49 k6 run | n/a |
| Session submit — POST /sessions/{id}/submit + sync pipeline | 5000 ms | not measured — Stage 49 k6 run | n/a |
| Pipeline async (background analytics pipeline) | 30 000 ms | not measured — Stage 49 k6 run | n/a |
| Dashboard load (apps/web) | 2000 ms | not measured — Stage 49 k6 run | n/a |
| Stripe webhook — POST /billing-svc/webhooks/stripe | 300 ms | not measured — Stage 49 k6 run | n/a |
| Flag propagation (subscription change → feature flag read) | 30 000 ms | not measured — Stage 49 k6 run | n/a |
| Item delivery — GET /items/{id} | 200 ms | not measured — Stage 49 k6 run | n/a |

### Notes

- Session create budget (1000 ms) is from BUILD_CONTRACT §10 table (`Session create ≤1s`).
- Session respond + submit budgets verified by `k6/session-loop.js` thresholds.
- Stripe webhook (300 ms) is BUILD_CONTRACT §8 line 99 (`webhook p95 ≤300ms`).
- Flag propagation (30 000 ms) is BUILD_CONTRACT §10 `Pipeline async ≤30s` — same budget applies to the full subscription-to-flag-read cycle.
- Item delivery (200 ms) is BUILD_CONTRACT §10 `Item delivery ≤200ms`.
- Dashboard load (2000 ms) requires Playwright or browser-based measurement; not covered by k6 session-loop.

### Stage 49 execution plan

```
# Session loop (500 VU, 3-min ramp):
BASE_URL=https://PROD.supabase.co/functions/v1 TOKEN=<student-jwt> k6 run k6/session-loop.js

# Billing webhook + flag propagation:
BASE_URL=... SERVICE_ROLE_KEY=... STUDENT_ID=... TENANT_ID=... STRIPE_CUSTOMER_ID=... k6 run k6/billing-webhook.js
```

Record measurements in the next section of this file.
