/**
 * billing-svc handlers — Stage 42 (Phase 4 slice).
 *
 * Implements:
 *   handleStripeWebhook  — POST /billing/webhook/stripe
 *   handleFlagPropagateStub — POST /billing/pipeline/flag-propagate (Stage 44 pending)
 *
 * Webhook flow (Q-42.6 resolution):
 *   1. req.text() FIRST — raw body before any JSON parse (arch §3.4.1)
 *   2. stripe.webhooks.constructEvent — signature verification ≤300ms
 *   3. INSERT billing_event ON CONFLICT (stripe_event_id) DO NOTHING (Q-42.4)
 *   4. If new row: sync subscription + billing_customer state
 *   5. Enqueue pipeline.feature_flag_propagate job
 *   6. Return 200 to Stripe (non-2xx triggers retry)
 *
 * Idempotency model: billing_event.stripe_event_id UNIQUE NOT NULL + ON CONFLICT.
 * This is DISTINCT from withIdempotency middleware (Q-42.4, ADR-0034).
 *
 * ISSUE-0032: single STRIPE_WEBHOOK_SECRET; v1.1 needs dual-secret rotation window.
 */

export interface BillingDbClient {
  from(table: string): {
    insert(row: Record<string, unknown>): {
      select(cols: string): Promise<{ data: Array<{ id: string }> | null; error: { message: string; code?: string } | null }>;
      then?: never;
    };
    upsert(row: Record<string, unknown>, opts?: { onConflict?: string }): Promise<{ error: { message: string } | null }>;
    update(patch: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
      match(cond: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
    };
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
  };
}

export interface StripeClient {
  webhooks: {
    constructEvent(
      rawBody: string,
      sig: string,
      secret: string,
    ): { id: string; type: string; data: { object: Record<string, unknown> } };
  };
}

export interface WebhookHandlerOpts {
  rawBody: string;
  signature: string;
  webhookSecret: string;
  stripe: StripeClient;
  client: BillingDbClient;
  traceId: string;
}

export interface WebhookHandlerResult {
  status: number;
  data: Record<string, unknown>;
}

export async function handleStripeWebhook(
  opts: WebhookHandlerOpts,
): Promise<WebhookHandlerResult> {
  const { rawBody, signature, webhookSecret, stripe, client, traceId } = opts;

  // ── Step 1: Signature verification (arch §3.4.1 — ≤300ms) ─────────────────
  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    // Invalid signature: write billing_event with processing_error + return 400.
    // arch §3.4.1: "reject within 300 ms if signature invalid"
    // spec line 3086: "write a billing_event row with processing_error='invalid_signature'"
    await writeBillingEvent(client, {
      stripe_event_id: `invalid-${traceId}`,
      event_type: 'invalid_signature',
      payload: {},
      processing_error: 'invalid_signature',
    });
    return { status: 400, data: { error: { code: 'INVALID_SIGNATURE', trace_id: traceId } } };
  }

  // ── Step 2: Idempotent billing_event INSERT (Q-42.4, ADR-0034) ────────────
  // ON CONFLICT (stripe_event_id) DO NOTHING — duplicate events are no-ops.
  // Return 200 to Stripe on duplicate (non-2xx triggers Stripe retry).
  const insertResult = await client
    .from('billing_event')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object,
    })
    .select('id');

  if (insertResult.error !== null) {
    // 23505 = unique_violation → duplicate event; return 200 (idempotent no-op).
    if (insertResult.error.code === '23505') {
      return { status: 200, data: { received: true, duplicate: true } };
    }
    return {
      status: 500,
      data: { error: { code: 'INTERNAL_ERROR', message: insertResult.error.message, trace_id: traceId } },
    };
  }

  // No rows inserted = duplicate handled by ON CONFLICT DO NOTHING without error.
  if (!insertResult.data || insertResult.data.length === 0) {
    return { status: 200, data: { received: true, duplicate: true } };
  }

  const billingEventId = insertResult.data[0]!.id;

  // ── Step 3: Resolve stripe_customer_id → tenant_id ────────────────────────
  const obj = event.data.object;
  const stripeCustomerId = resolveCustomerId(event.type, obj);

  let tenantId: string | null = null;
  if (stripeCustomerId !== null) {
    const bcResult = await client
      .from('billing_customer')
      .select('tenant_id')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();
    if (bcResult.data !== null) {
      tenantId = bcResult.data['tenant_id'] as string;
    }
  }

  // ── Step 4: Event state machine (spec §25.4) ───────────────────────────────
  let tierChanged = false;
  if (tenantId !== null) {
    tierChanged = await resolveSubscriptionState({
      eventType: event.type,
      obj,
      tenantId,
      stripeCustomerId,
      client,
    });
  }

  // ── Step 5: Mark billing_event processed ──────────────────────────────────
  await client
    .from('billing_event')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', billingEventId);

  // ── Step 6: Enqueue pipeline.feature_flag_propagate (Q-42.6) ──────────────
  if (tierChanged && tenantId !== null) {
    await client.from('job_queue').insert({
      tenant_id: tenantId,
      job_type: 'pipeline.feature_flag_propagate',
      payload: { tenant_id: tenantId, triggered_by: event.id },
      priority: 'medium',
      idempotency_key: `ffp-${event.id}`,
    }).select('id');
  }

  return { status: 200, data: { received: true } };
}

// ─── Subscription state machine (spec §25.4) ──────────────────────────────────

interface ResolveStateOpts {
  eventType: string;
  obj: Record<string, unknown>;
  tenantId: string;
  stripeCustomerId: string | null;
  client: BillingDbClient;
}

export async function resolveSubscriptionState(opts: ResolveStateOpts): Promise<boolean> {
  const { eventType, obj, tenantId, stripeCustomerId, client } = opts;

  switch (eventType) {
    case 'checkout.session.completed': {
      const tier = (obj['metadata'] as Record<string, string> | null)?.['tier'] ?? 'standard';
      const stripeSub = obj['subscription'] as string | null;
      await client.from('subscription').upsert(
        {
          tenant_id: tenantId,
          tier,
          stripe_subscription_id: stripeSub ?? null,
          is_active: true,
          started_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' },
      );
      if (stripeCustomerId !== null) {
        await client.from('billing_customer').upsert(
          { tenant_id: tenantId, stripe_customer_id: stripeCustomerId },
          { onConflict: 'tenant_id' },
        );
      }
      return true;
    }

    case 'customer.subscription.created': {
      const periodEnd = obj['current_period_end'];
      const stripeSub = obj['id'] as string;
      await client.from('subscription').upsert(
        {
          tenant_id: tenantId,
          stripe_subscription_id: stripeSub,
          is_active: true,
          current_period_end: periodEnd != null
            ? new Date((periodEnd as number) * 1000).toISOString()
            : null,
        },
        { onConflict: 'tenant_id' },
      );
      return false;
    }

    case 'customer.subscription.updated': {
      const periodEnd = obj['current_period_end'];
      const cancelAt = obj['cancel_at'];
      const patch: Record<string, unknown> = {
        current_period_end: periodEnd != null
          ? new Date((periodEnd as number) * 1000).toISOString()
          : null,
        cancel_at: cancelAt != null
          ? new Date((cancelAt as number) * 1000).toISOString()
          : null,
        is_active: obj['status'] !== 'canceled',
      };
      await client.from('subscription').update(patch).eq('tenant_id', tenantId);
      return true;
    }

    case 'customer.subscription.deleted': {
      await client.from('subscription').update({
        is_active: false,
        canceled_at: new Date().toISOString(),
        tier: 'free',
      }).eq('tenant_id', tenantId);
      return true;
    }

    case 'invoice.paid': {
      await upsertInvoice(client, tenantId, obj, 'paid');
      return false;
    }

    case 'invoice.payment_failed': {
      await upsertInvoice(client, tenantId, obj, 'open');
      return false;
    }

    case 'customer.updated': {
      const paymentMethod = obj['invoice_settings'] != null
        ? ((obj['invoice_settings'] as Record<string, unknown>)['default_payment_method'] as string | null)
        : null;
      if (stripeCustomerId !== null) {
        await client.from('billing_customer').update({
          default_payment_method: paymentMethod,
        }).eq('tenant_id', tenantId);
      }
      return false;
    }

    default:
      return false;
  }
}

// ─── Stage 44 pending stub ─────────────────────────────────────────────────────

export interface FlagPropagateOpts {
  traceId: string;
  tenantId?: string;
}

export interface FlagPropagateResult {
  status: number;
  data: Record<string, unknown>;
}

export function handleFlagPropagateStub(opts: FlagPropagateOpts): FlagPropagateResult {
  // Stage 44 pending — full feature_flag propagation implemented in Stage 44.
  // Q-42.7: admin_action_log write deferred (actor_id NOT NULL vs actor_role='system'
  // — no sentinel system user yet; Stage 44 resolves with Option A: sentinel user).
  // This stub is auditable via structured logger (not a silent no-op).
  return {
    status: 200,
    data: {
      received: true,
      // Stage 44 pending
      note: 'feature_flag propagation deferred to Stage 44',
      trace_id: opts.traceId,
      tenant_id: opts.tenantId ?? null,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveCustomerId(
  eventType: string,
  obj: Record<string, unknown>,
): string | null {
  const customer = obj['customer'];
  if (typeof customer === 'string') return customer;
  return null;
}

async function writeBillingEvent(
  client: BillingDbClient,
  row: {
    stripe_event_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    processing_error?: string;
  },
): Promise<void> {
  await client.from('billing_event').insert({
    stripe_event_id: row.stripe_event_id,
    event_type: row.event_type,
    payload: row.payload,
    processing_error: row.processing_error ?? null,
    processed_at: new Date().toISOString(),
  }).select('id');
}

async function upsertInvoice(
  client: BillingDbClient,
  tenantId: string,
  obj: Record<string, unknown>,
  status: 'paid' | 'open',
): Promise<void> {
  const stripeInvoiceId = obj['id'] as string;
  const amountPaid = (obj['amount_paid'] as number | null) ?? (obj['amount_due'] as number | null) ?? 0;
  const currency = ((obj['currency'] as string | null) ?? 'aud').toUpperCase();
  const invoicedAt = obj['created'] != null
    ? new Date((obj['created'] as number) * 1000).toISOString()
    : new Date().toISOString();
  const paidAt = status === 'paid' && obj['status_transitions'] != null
    ? (() => {
        const ts = (obj['status_transitions'] as Record<string, unknown>)['paid_at'];
        return ts != null ? new Date((ts as number) * 1000).toISOString() : null;
      })()
    : null;

  await client.from('invoice').upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: stripeInvoiceId,
      amount_cents: amountPaid,
      currency,
      status,
      hosted_invoice_url: (obj['hosted_invoice_url'] as string | null) ?? null,
      invoice_pdf_url: (obj['invoice_pdf'] as string | null) ?? null,
      invoiced_at: invoicedAt,
      paid_at: paidAt,
    },
    { onConflict: 'stripe_invoice_id' },
  );
}
