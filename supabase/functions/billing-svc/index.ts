/// <reference lib="deno.ns" />
/**
 * billing-svc — Stage 42 (Phase 4 slice).
 *
 * Endpoints:
 *   POST /billing/webhook/stripe          [Stripe-Signature only] Stripe webhook receiver.
 *   POST /billing/pipeline/flag-propagate [service-role only]     Stage 44 pending stub.
 *     Dispatched by jobs-worker (ADR-0031 fifth amendment, pipeline.feature_flag_propagate).
 *
 * Webhook auth: stripe-signature header verified with STRIPE_WEBHOOK_SECRET.
 *   Raw body read via req.text() BEFORE any JSON parse (arch §3.4.1, ≤300ms budget).
 *
 * ISSUE-0032: single STRIPE_WEBHOOK_SECRET; v1.1 needs dual-secret rotation window.
 *
 * Service env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@16';
import { getTraceId } from '../_shared/trace-id.ts';
import { jsonOk, jsonError } from '../_shared/error-envelope.ts';
import { log } from '../_shared/logger.ts';
import {
  handleStripeWebhook,
  handleFlagPropagateStub,
  type BillingDbClient,
} from './handlers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
// ISSUE-0032: single-secret; v1.1 needs dual-secret rotation window.
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  const traceId = getTraceId(req);
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, '');
  let status = 200;

  try {
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'X-Trace-Id': traceId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'Content-Type, stripe-signature, x-mm-service-role, x-mm-trace-id',
        },
      });
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── POST /billing/webhook/stripe — Stripe-Signature auth only ─────────
    // raw body via req.text() MUST precede any JSON parse (arch §3.4.1).
    if (method === 'POST' && path === '/billing/webhook/stripe') {
      const rawBody = await req.text();
      const signature = req.headers.get('stripe-signature') ?? '';
      const result = await handleStripeWebhook({
        rawBody,
        signature,
        webhookSecret: STRIPE_WEBHOOK_SECRET,
        stripe,
        client: db as unknown as BillingDbClient,
        traceId,
      });
      status = result.status;
      return jsonOk(result.data, traceId, result.status);
    }

    // ── Service-role gate — all remaining routes ──────────────────────────
    const serviceHeader = req.headers.get('x-mm-service-role');
    if (serviceHeader === null || serviceHeader !== SERVICE_ROLE_KEY) {
      status = 401;
      return jsonError('UNAUTHENTICATED', 'service-role header required', traceId, 401);
    }

    // ── POST /billing/pipeline/flag-propagate — service-role only ─────────
    // Stage 44 pending — dispatched by jobs-worker (ADR-0031 fifth amendment).
    if (method === 'POST' && path === '/billing/pipeline/flag-propagate') {
      const rawBody: unknown = await req.json();
      const tenantId =
        rawBody !== null && typeof rawBody === 'object' && 'tenant_id' in rawBody
          ? ((rawBody as Record<string, unknown>)['tenant_id'] as string | undefined)
          : undefined;
      const result = handleFlagPropagateStub({ traceId, tenantId });
      status = result.status;
      return jsonOk(result.data, traceId, result.status);
    }

    status = 404;
    return jsonError('NOT_FOUND', `No route for ${method} ${path}`, traceId, 404);
  } catch (errCaught) {
    status = 500;
    console.error(JSON.stringify({ level: 'error', trace_id: traceId, err: String(errCaught) }));
    return jsonError('INTERNAL_ERROR', 'An unexpected error occurred', traceId, 500);
  } finally {
    log({
      level: status >= 500 ? 'error' : 'info',
      service: 'billing-svc',
      trace_id: traceId,
      endpoint: `${method} ${path}`,
      status_code: status,
      duration_ms: Date.now() - t0,
    });
  }
});
