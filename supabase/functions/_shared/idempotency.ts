/**
 * Idempotency middleware (arch §7.3).
 *
 * Stage 19, Q-19.3: reusable for assessment-svc, assignments-svc (Stage 27+),
 * billing-svc (Stage 42+), orchestration-svc.
 *
 * Flow:
 *   Client: sends Idempotency-Key: <uuid>
 *   Server:
 *     1. Hash request body → request_hash (SHA-256 hex)
 *     2. SELECT from api_idempotency_key WHERE (key, tenant_id)
 *     3a. Not found:
 *         INSERT (key, tenant, endpoint, request_hash, status='processing')
 *         Run handler
 *         UPDATE status='completed', response_status, response_body
 *         Return { ok: true, data, fromCache: false }
 *     3b. Found, status='completed':
 *         IF request_hash matches → return cached { ok: true, data, fromCache: true }
 *         ELSE → { ok: false, status: 422, code: 'IDEMPOTENCY_MISMATCH', ... }
 *     3c. Found, status='processing':
 *         { ok: false, status: 409, code: 'IDEMPOTENCY_IN_FLIGHT', ... }
 *     3d. Found, status='failed':
 *         DELETE row and reprocess (treat as 3a)
 *
 * The middleware is pure — `client` is structurally typed; tests pass a mock
 * implementing the same surface. Hashing uses Web Crypto (works in Deno + Node
 * 20+).
 */

export interface IdempotencyDbClient {
  from(table: string): {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => {
          maybeSingle: () => Promise<{
            data: IdempotencyRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    insert: (row: IdempotencyInsertRow) => Promise<{ error: { message: string; code?: string } | null }>;
    update: (patch: Partial<IdempotencyRow>) => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>;
      };
    };
    delete: () => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
}

export interface IdempotencyRow {
  idempotency_key: string;
  tenant_id: string;
  endpoint: string;
  request_hash: string;
  status: 'processing' | 'completed' | 'failed';
  response_status: number | null;
  response_body: unknown;
  created_at: string;
  completed_at: string | null;
}

interface IdempotencyInsertRow {
  idempotency_key: string;
  tenant_id: string;
  endpoint: string;
  request_hash: string;
  status: 'processing';
}

export type IdempotencyResult<T> =
  | { ok: true; data: T; fromCache: boolean; status: number }
  | { ok: false; status: number; code: string; message: string };

export interface HandlerOutcome<T> {
  status: number;
  data: T;
}

/**
 * Hash a request body string with SHA-256, return hex digest.
 * Cross-runtime: works in Deno + Node 20+ via globalThis.crypto.subtle.
 */
export async function hashRequestBody(bodyText: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(bodyText));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface WithIdempotencyOpts<T> {
  client: IdempotencyDbClient;
  idempotencyKey: string;
  tenantId: string;
  endpoint: string;
  bodyText: string;
  /**
   * Handler closure — run only when the key is new (or after deleting a
   * 'failed' row). The middleware records the outcome's status + data.
   */
  handler: () => Promise<HandlerOutcome<T>>;
}

export async function withIdempotency<T>(
  opts: WithIdempotencyOpts<T>,
): Promise<IdempotencyResult<T>> {
  const { client, idempotencyKey, tenantId, endpoint, bodyText, handler } = opts;
  const requestHash = await hashRequestBody(bodyText);

  const existing = await client
    .from('api_idempotency_key')
    .select('idempotency_key, tenant_id, endpoint, request_hash, status, response_status, response_body, created_at, completed_at')
    .eq('idempotency_key', idempotencyKey)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing.error !== null) {
    return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: existing.error.message };
  }

  const row = existing.data;

  // ── 3b: Found, completed ──
  if (row !== null && row.status === 'completed') {
    if (row.request_hash !== requestHash) {
      return {
        ok: false,
        status: 422,
        code: 'IDEMPOTENCY_MISMATCH',
        message: 'Idempotency-Key reused with a different request body',
      };
    }
    return {
      ok: true,
      data: row.response_body as T,
      fromCache: true,
      status: row.response_status ?? 200,
    };
  }

  // ── 3c: Found, processing ──
  if (row !== null && row.status === 'processing') {
    return {
      ok: false,
      status: 409,
      code: 'IDEMPOTENCY_IN_FLIGHT',
      message: 'Original request still processing — retry later',
    };
  }

  // ── 3d: Found, failed → DELETE and reprocess (fall through to 3a) ──
  if (row !== null && row.status === 'failed') {
    const del = await client
      .from('api_idempotency_key')
      .delete()
      .eq('idempotency_key', idempotencyKey)
      .eq('tenant_id', tenantId);
    if (del.error !== null) {
      return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: del.error.message };
    }
  }

  // ── 3a: Not found (or just deleted) — INSERT processing, run handler ──
  const ins = await client.from('api_idempotency_key').insert({
    idempotency_key: idempotencyKey,
    tenant_id: tenantId,
    endpoint,
    request_hash: requestHash,
    status: 'processing',
  });
  if (ins.error !== null) {
    // 23505 = unique_violation — race with another concurrent attempt; treat
    // as in-flight. Other PG errors propagate as 500.
    if (ins.error.code === '23505') {
      return {
        ok: false,
        status: 409,
        code: 'IDEMPOTENCY_IN_FLIGHT',
        message: 'Concurrent request with the same Idempotency-Key',
      };
    }
    return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: ins.error.message };
  }

  let outcome: HandlerOutcome<T>;
  try {
    outcome = await handler();
  } catch (err) {
    // Mark row failed so client can retry safely.
    await client
      .from('api_idempotency_key')
      .update({ status: 'failed' })
      .eq('idempotency_key', idempotencyKey)
      .eq('tenant_id', tenantId);
    throw err;
  }

  const upd = await client
    .from('api_idempotency_key')
    .update({
      status: 'completed',
      response_status: outcome.status,
      response_body: outcome.data as unknown as IdempotencyRow['response_body'],
      completed_at: new Date().toISOString(),
    })
    .eq('idempotency_key', idempotencyKey)
    .eq('tenant_id', tenantId);
  if (upd.error !== null) {
    return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: upd.error.message };
  }

  return { ok: true, data: outcome.data, fromCache: false, status: outcome.status };
}
