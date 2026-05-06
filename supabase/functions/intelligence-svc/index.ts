/// <reference lib="deno.ns" />
/**
 * intelligence-svc — Stage 20.
 *
 * Single endpoint:
 *   POST /intelligence/process-session/{id}   [service-role only]
 *
 * Called inline from assessment-svc /sessions/{id}/submit (Q-20.1, ADR-0027)
 * within a 4s timeout window. The handler runs Spec §7.2 sync portion
 * (L1 + L2 + L3a) and returns 200 with a deterministic payload. On
 * audit-log dedup hit (Q-20.7) returns 200 `already_processed` —
 * Stage 28's worker re-pickup is therefore a no-op.
 *
 * Service env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTraceId } from '../_shared/trace-id.ts';
import { jsonOk, jsonError } from '../_shared/error-envelope.ts';
import { log } from '../_shared/logger.ts';
import { processSession, type DbClient as HandlerDbClient } from './handlers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  const traceId = getTraceId(req);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/intelligence-svc/, '');
  const method = req.method;
  let status = 200;

  try {
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'X-Trace-Id': traceId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Trace-Id, x-mm-service-role, x-mm-trace-id',
        },
      });
    }

    // Service-role only: require x-mm-service-role header matching the env key.
    const serviceHeader = req.headers.get('x-mm-service-role');
    if (serviceHeader === null || serviceHeader !== SERVICE_ROLE_KEY) {
      status = 401;
      return jsonError('UNAUTHENTICATED', 'service-role header required', traceId, 401);
    }

    const processMatch = path.match(/^\/intelligence\/process-session\/([^/]+)$/);
    if (method === 'POST' && processMatch !== null) {
      const sessionId = processMatch[1]!;
      const db = serviceClient();
      const client = db as unknown as HandlerDbClient;
      const result = await processSession({
        client,
        sessionId,
        traceId,
      });
      status = result.status;
      if (result.ok) return jsonOk(result.data, traceId, result.status);
      return jsonError(result.code, result.message, traceId, result.status);
    }

    status = 404;
    return jsonError('NOT_FOUND', 'Endpoint not found', traceId, 404);
  } catch (errCaught) {
    status = 500;
    console.error(JSON.stringify({ level: 'error', trace_id: traceId, err: String(errCaught) }));
    return jsonError('INTERNAL_ERROR', 'An unexpected error occurred', traceId, 500);
  } finally {
    log({
      level: status >= 500 ? 'error' : 'info',
      service: 'intelligence-svc',
      trace_id: traceId,
      endpoint: `${method} ${path}`,
      status_code: status,
      duration_ms: Date.now() - t0,
    });
  }
});
