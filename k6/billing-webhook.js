/**
 * billing-webhook.js — k6 load test for billing-svc SLA budgets.
 *
 * Two scenarios (BUILD_CONTRACT §8 + §10):
 *
 *   1. webhook_p95       — POST /billing-svc/webhooks/stripe
 *                          Stripe webhook processing p95 ≤ 300 ms (BUILD_CONTRACT §8, line 99)
 *                          500 concurrent VUs, ramping (mirrors session-loop.js ramp shape)
 *
 *   2. flag_propagation  — POST webhook → poll intelligence-svc GET /flags/{studentId}
 *                          Feature-flag propagation p95 ≤ 30 s (BUILD_CONTRACT §10 Pipeline async)
 *                          10 VUs, sequential, each measuring end-to-end propagation time
 *
 * Usage (requires k6 + deployed environment):
 *   BASE_URL=https://YOUR_PROJECT.supabase.co/functions/v1 \
 *   STRIPE_WEBHOOK_SECRET=whsec_... \
 *   SERVICE_ROLE_KEY=... \
 *   STUDENT_ID=<uuid-of-test-student> \
 *   k6 run k6/billing-webhook.js
 *
 * Environment variables:
 *   BASE_URL             — Supabase Edge Functions base URL (required)
 *   STRIPE_WEBHOOK_SECRET — whsec_... secret (used to sign test payloads; required)
 *   SERVICE_ROLE_KEY     — Supabase service-role key for billing-svc auth (required)
 *   STUDENT_ID           — UUID of a pre-seeded test student in the target env (scenario 2)
 *   TENANT_ID            — UUID of the test student's tenant (scenario 2)
 *   STRIPE_CUSTOMER_ID   — Stripe test-mode customer ID for the test tenant (scenario 2)
 *
 * Stripe test-mode note:
 *   billing-svc validates stripe-signature in production mode.
 *   In test mode (STRIPE_WEBHOOK_SECRET = whsec_test_...) Stripe provides
 *   a test clock endpoint. For load testing, generate signed payloads
 *   server-side or use a test-mode bypass toggled by BILLING_ENV=test.
 *   See docs/dev/deployment.md §billing-webhook-load-test.
 *
 * Stage 48 status: authored as deploy-ready artefact (Q-48.3).
 *   Not executed in sandbox — k6 binary absent + deployed billing-svc required.
 *   Execute at Stage 49 launch-window verification.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// ─── CLI / env inputs ─────────────────────────────────────────────────────────

const BASE_URL          = __ENV.BASE_URL          ?? 'https://placeholder.supabase.co/functions/v1';
const SERVICE_ROLE_KEY  = __ENV.SERVICE_ROLE_KEY  ?? '';
const STUDENT_ID        = __ENV.STUDENT_ID        ?? '00000000-0000-0000-0000-000000000001';
const TENANT_ID         = __ENV.TENANT_ID         ?? '00000000-0000-0000-0000-000000000001';
const STRIPE_CUSTOMER   = __ENV.STRIPE_CUSTOMER_ID ?? 'cus_test_placeholder';

// ─── Custom metrics ───────────────────────────────────────────────────────────

const webhookLatency        = new Trend('billing_webhook_latency',   true);
const flagPropagationTime   = new Trend('flag_propagation_latency',  true);
const webhookErrors         = new Counter('billing_webhook_errors');
const propagationErrors     = new Counter('flag_propagation_errors');

// ─── k6 options ───────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Scenario 1: Stripe webhook endpoint p95 ≤ 300 ms
    webhook_p95: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '2m',  target: 500 },
        { duration: '30s', target: 0 },
      ],
      exec: 'webhookScenario',
    },
    // Scenario 2: End-to-end flag propagation p95 ≤ 30 s
    flag_propagation: {
      executor:  'constant-vus',
      vus:       10,
      duration:  '5m',
      exec:      'flagPropagationScenario',
      startTime: '3m30s', // start after webhook scenario ramp-down
    },
  },
  thresholds: {
    // BUILD_CONTRACT §8 line 99: Stripe webhook p95 ≤ 300 ms
    billing_webhook_latency:  ['p(95)<300'],
    // BUILD_CONTRACT §10: Pipeline async p95 ≤ 30 s (30 000 ms)
    flag_propagation_latency: ['p(95)<30000'],
    http_req_failed:          ['rate<0.01'],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serviceHeaders(idempotencyKey) {
  const h = {
    'Content-Type':   'application/json',
    'Authorization':  `Bearer ${SERVICE_ROLE_KEY}`,
  };
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
  return h;
}

/** Construct a minimal invoice.payment_succeeded test payload.
 *  In production, billing-svc validates stripe-signature; in test mode
 *  set BILLING_ENV=test to skip signature verification (see deployment.md).
 */
function webhookPayload(iteration) {
  return JSON.stringify({
    id:            `evt_test_k6_${__VU}_${iteration}_${Date.now()}`,
    object:        'event',
    type:          'invoice.payment_succeeded',
    created:       Math.floor(Date.now() / 1000),
    livemode:      false,
    data: {
      object: {
        id:          `in_test_k6_${__VU}_${iteration}`,
        object:      'invoice',
        customer:    STRIPE_CUSTOMER,
        amount_paid: 2900,
        currency:    'aud',
        status:      'paid',
        subscription: `sub_test_k6_${__VU}`,
        lines: {
          data: [{
            price: { id: 'price_test_standard_monthly', product: 'prod_test' },
          }],
        },
      },
    },
  });
}

// ─── Scenario 1: webhook p95 ─────────────────────────────────────────────────

export function webhookScenario() {
  const idemKey = `k6-billing-webhook-${__VU}-${__ITER}-${Date.now()}`;
  const headers = serviceHeaders(idemKey);

  const res = http.post(
    `${BASE_URL}/billing-svc/webhooks/stripe`,
    webhookPayload(__ITER),
    { headers },
  );

  webhookLatency.add(res.timings.duration);

  const ok = check(res, {
    'webhook: status 200':          (r) => r.status === 200,
    'webhook: response < 300 ms':   (r) => r.timings.duration < 300,
  });

  if (!ok) webhookErrors.add(1);

  sleep(0.5);
}

// ─── Scenario 2: flag propagation ────────────────────────────────────────────

/**
 * Measures end-to-end flag propagation:
 *   1. POST a customer.subscription.updated (downgrade) webhook event
 *   2. Poll GET /intelligence-svc/flags/{studentId} until the flag tier
 *      reflects the new subscription tier, or until 35 s timeout.
 *   3. Record total elapsed time as flag_propagation_latency.
 *
 * The BUILD_CONTRACT §10 Pipeline async budget is 30 s; threshold above is
 * p(95)<30000. The 35 s polling window gives headroom for genuine failures
 * to be captured rather than timing out before measurement.
 */
export function flagPropagationScenario() {
  const idemKey  = `k6-flag-prop-${__VU}-${__ITER}-${Date.now()}`;
  const headers  = serviceHeaders(idemKey);
  const flagUrl  = `${BASE_URL}/intelligence-svc/flags/${STUDENT_ID}`;

  // Step 1: Trigger subscription downgrade via webhook
  const downgradePayload = JSON.stringify({
    id:       `evt_test_flagprop_${__VU}_${__ITER}`,
    object:   'event',
    type:     'customer.subscription.updated',
    created:  Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id:         `sub_test_flagprop_${__VU}`,
        object:     'subscription',
        customer:   STRIPE_CUSTOMER,
        status:     'active',
        items: {
          data: [{
            price: { id: 'price_test_free', product: 'prod_test' },
          }],
        },
      },
      previous_attributes: {
        items: {
          data: [{
            price: { id: 'price_test_standard_monthly', product: 'prod_test' },
          }],
        },
      },
    },
  });

  const triggerStart = Date.now();

  const webhookRes = http.post(
    `${BASE_URL}/billing-svc/webhooks/stripe`,
    downgradePayload,
    { headers },
  );

  const triggerOk = check(webhookRes, {
    'flag-prop trigger: status 200': (r) => r.status === 200,
  });

  if (!triggerOk) {
    propagationErrors.add(1);
    return;
  }

  // Step 2: Poll flag endpoint until tier reflects downgrade or 35 s elapsed
  const POLL_INTERVAL_MS  = 500;
  const POLL_TIMEOUT_MS   = 35000;
  let   propagated        = false;

  while (Date.now() - triggerStart < POLL_TIMEOUT_MS) {
    sleep(POLL_INTERVAL_MS / 1000);

    const flagRes = http.get(flagUrl, {
      headers: serviceHeaders(null),
    });

    if (flagRes.status === 200) {
      try {
        const body = JSON.parse(flagRes.body);
        // Flag has propagated when subscription_tier = 'free' (downgraded)
        if (body.subscription_tier === 'free') {
          propagated = true;
          break;
        }
      } catch {
        // non-JSON response — continue polling
      }
    }
  }

  const elapsed = Date.now() - triggerStart;
  flagPropagationTime.add(elapsed);

  if (!propagated) {
    propagationErrors.add(1);
  }

  check({ propagated, elapsed }, {
    'flag-prop: propagated within 30 s': (v) => v.propagated && v.elapsed < 30000,
  });

  sleep(2);
}
