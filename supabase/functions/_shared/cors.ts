// Canonical CORS config for all MindMosaic Edge Functions.
// MmClient (packages/sdk/src/client.ts:59) sends X-Client-Version on every request.
// To tighten origins pre-launch: change the single '*' value here.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Authorization',
    'Content-Type',
    'X-Trace-Id',
    'X-Client-Version',
    'Idempotency-Key',
    'X-Session-Lock',
    'x-mm-service-role',
    'x-mm-trace-id',
    'stripe-signature',
  ].join(', '),
} as const;
