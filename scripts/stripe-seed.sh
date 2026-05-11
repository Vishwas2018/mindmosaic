#!/usr/bin/env bash
# =============================================================================
# scripts/stripe-seed.sh
# Creates Stripe test-mode Products + Prices for MindMosaic v1 billing.
# Stage 42 (Phase 4 slice).
#
# Usage: bash scripts/stripe-seed.sh
#
# Prerequisites:
#   - Stripe CLI installed and authenticated: stripe login
#   - Test mode active (all IDs will be test-mode; livemode=false)
#
# Outputs:
#   Product IDs + Price IDs to stdout. Copy the price IDs into:
#     apps/web/.env.local  →  STRIPE_PRICE_ID_STANDARD_MONTHLY etc.
#     Supabase Dashboard   →  Edge Function env vars
#
# AU Note: Prices are in AUD (cents). GST is 10% — apply in checkout session
#   when tenant billing address is AU. Stripe Tax handles collection if enabled
#   (v1.1 scope; not enabled in v1 MVP).
#
# Products:
#   MindMosaic Standard  — monthly + yearly
#   MindMosaic Premium   — monthly + yearly
#
# Idempotency: re-running creates duplicates. Use --idempotency-key on
#   stripe products create / stripe prices create if needed for CI.
# =============================================================================
set -euo pipefail

echo "=== MindMosaic Stripe seed (test mode) ==="

# ── Standard product ──────────────────────────────────────────────────────────
echo ""
echo "Creating product: MindMosaic Standard"
STANDARD_PRODUCT=$(stripe products create \
  --name="MindMosaic Standard" \
  --description="Adaptive NAPLAN + ICAS learning — Standard plan" \
  --metadata[tier]=standard \
  --format=json)

STANDARD_PRODUCT_ID=$(echo "$STANDARD_PRODUCT" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "  product_id: $STANDARD_PRODUCT_ID"

echo ""
echo "Creating price: Standard monthly (AUD)"
STANDARD_MONTHLY=$(stripe prices create \
  --product="$STANDARD_PRODUCT_ID" \
  --unit-amount=1990 \
  --currency=aud \
  --recurring[interval]=month \
  --nickname="Standard Monthly" \
  --metadata[tier]=standard \
  --format=json)

STANDARD_MONTHLY_ID=$(echo "$STANDARD_MONTHLY" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "  price_id (monthly): $STANDARD_MONTHLY_ID"

echo ""
echo "Creating price: Standard yearly (AUD)"
STANDARD_YEARLY=$(stripe prices create \
  --product="$STANDARD_PRODUCT_ID" \
  --unit-amount=19900 \
  --currency=aud \
  --recurring[interval]=year \
  --nickname="Standard Yearly" \
  --metadata[tier]=standard \
  --format=json)

STANDARD_YEARLY_ID=$(echo "$STANDARD_YEARLY" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "  price_id (yearly):  $STANDARD_YEARLY_ID"

# ── Premium product ───────────────────────────────────────────────────────────
echo ""
echo "Creating product: MindMosaic Premium"
PREMIUM_PRODUCT=$(stripe products create \
  --name="MindMosaic Premium" \
  --description="Adaptive NAPLAN + ICAS learning — Premium plan" \
  --metadata[tier]=premium \
  --format=json)

PREMIUM_PRODUCT_ID=$(echo "$PREMIUM_PRODUCT" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "  product_id: $PREMIUM_PRODUCT_ID"

echo ""
echo "Creating price: Premium monthly (AUD)"
PREMIUM_MONTHLY=$(stripe prices create \
  --product="$PREMIUM_PRODUCT_ID" \
  --unit-amount=3990 \
  --currency=aud \
  --recurring[interval]=month \
  --nickname="Premium Monthly" \
  --metadata[tier]=premium \
  --format=json)

PREMIUM_MONTHLY_ID=$(echo "$PREMIUM_MONTHLY" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "  price_id (monthly): $PREMIUM_MONTHLY_ID"

echo ""
echo "Creating price: Premium yearly (AUD)"
PREMIUM_YEARLY=$(stripe prices create \
  --product="$PREMIUM_PRODUCT_ID" \
  --unit-amount=39900 \
  --currency=aud \
  --recurring[interval]=year \
  --nickname="Premium Yearly" \
  --metadata[tier]=premium \
  --format=json)

PREMIUM_YEARLY_ID=$(echo "$PREMIUM_YEARLY" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "  price_id (yearly):  $PREMIUM_YEARLY_ID"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=== Seed complete. Copy these into .env.local and Supabase env vars: ==="
echo ""
echo "STRIPE_PRICE_ID_STANDARD_MONTHLY=$STANDARD_MONTHLY_ID"
echo "STRIPE_PRICE_ID_STANDARD_YEARLY=$STANDARD_YEARLY_ID"
echo "STRIPE_PRICE_ID_PREMIUM_MONTHLY=$PREMIUM_MONTHLY_ID"
echo "STRIPE_PRICE_ID_PREMIUM_YEARLY=$PREMIUM_YEARLY_ID"
echo ""
echo "Products:"
echo "  STRIPE_PRODUCT_ID_STANDARD=$STANDARD_PRODUCT_ID"
echo "  STRIPE_PRODUCT_ID_PREMIUM=$PREMIUM_PRODUCT_ID"
echo ""
echo "Next: run 'stripe listen --forward-to localhost:54321/functions/v1/billing-svc/billing/webhook/stripe'"
echo "      to capture STRIPE_WEBHOOK_SECRET for local dev."
