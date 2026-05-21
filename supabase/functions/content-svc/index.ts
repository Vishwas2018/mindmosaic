/// <reference lib="deno.ns" />
/**
 * content-svc — Stage 18.
 *
 * Thin Deno.serve dispatcher. All endpoint logic lives in `handlers.ts` so it
 * can be tested in Node Vitest without resolving Deno URL imports.
 *
 * Endpoints (arch §4.3):
 *   GET  /pathways
 *   GET  /pathways/{slug}
 *   GET  /assessment-profiles?exam_family=&year_level=
 *   GET  /content/items/{id}
 *   POST /content/select                     [service-role only]
 *   POST /content/import                     [platform_admin OR service-role; dual-gate]
 *   GET  /content/search?q=&...              [admin only]
 *   GET  /skill-graphs/active
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ImportManifestSchema } from '@mm/types';
import { getTraceId } from '../_shared/trace-id.ts';
import { jsonOk, jsonError } from '../_shared/error-envelope.ts';
import { verifyBearer } from '../_shared/auth.ts';
import { log } from '../_shared/logger.ts';
import { withIdempotency, type IdempotencyDbClient } from '../_shared/idempotency.ts';
import {
  createDbLoader,
  type DbClient as CacheDbClient,
} from '../_shared/skill-graph-cache.ts';
import {
  listPathways,
  getPathwayBySlug,
  listAssessmentProfiles,
  getItem,
  selectItems,
  searchContent,
  getActiveSkillGraph,
  createItem,
  updateItem,
  createItemVersion,
  transitionItemLifecycle,
  listItemVersions,
  createStimulus,
  updateStimulus,
  importItems,
  type ImportResult,
  type DbClient as HandlerDbClient,
  type ContentSelectRequest,
  type ItemAdminDTO,
  type ItemVersionDTO,
  type StimulusAdminDTO,
  type ItemCreateBody,
  type ItemUpdateBody,
  type ItemVersionCreateBody,
  type ItemLifecycleBody,
  type StimulusCreateBody,
  type StimulusUpdateBody,
} from './handlers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SERVICE_HEADER = 'x-mm-service-role';

function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

async function callerTenantId(
  client: ReturnType<typeof serviceClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from('user_profile')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

async function callerRole(
  client: ReturnType<typeof serviceClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from('user_profile')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  const traceId = getTraceId(req);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/(functions\/v1\/)?content-svc/, '');
  const method = req.method;

  let status = 200;
  let userId: string | undefined;
  let tenantId: string | undefined;

  try {
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'X-Trace-Id': traceId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Trace-Id, Idempotency-Key',
        },
      });
    }

    const db = serviceClient();
    const handlerClient = db as unknown as HandlerDbClient;
    const cacheClient = db as unknown as CacheDbClient;

    // ── Service-role gate for /content/select (no Bearer) ────────────────────
    if (method === 'POST' && path === '/content/select') {
      const provided = req.headers.get(SERVICE_HEADER);
      if (provided === null || provided !== SERVICE_ROLE_KEY) {
        status = 403;
        return jsonError('FORBIDDEN', 'Service-role header required', traceId, 403);
      }
      const body = (await req.json().catch(() => ({}))) as ContentSelectRequest;
      const result = await selectItems(handlerClient, body);
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    // ── Dual-auth gate for /content/import (platform_admin Bearer OR service-role) ─
    if (method === 'POST' && path === '/content/import') {
      let importCallerId = 'service-role';
      let importIdempScope = '_service_';
      const serviceToken = req.headers.get(SERVICE_HEADER);
      const isServiceRole = serviceToken !== null && serviceToken === SERVICE_ROLE_KEY;
      if (!isServiceRole) {
        const importAuth = await verifyBearer(req, db);
        if (!importAuth) {
          status = 401;
          return jsonError('UNAUTHENTICATED', 'Valid Bearer token required', traceId, 401);
        }
        const importRole = await callerRole(db, importAuth.user.id);
        if (importRole !== 'platform_admin') {
          status = 403;
          return jsonError('FORBIDDEN', 'platform_admin or service-role required', traceId, 403);
        }
        userId = importAuth.user.id;
        tenantId = (await callerTenantId(db, userId)) ?? undefined;
        importCallerId = userId;
        importIdempScope = tenantId ?? userId;
      }

      const rawBody = await req.text();
      const bodyJson = JSON.parse(rawBody) as unknown;
      const parsed = ImportManifestSchema.safeParse(bodyJson);
      if (!parsed.success) {
        const first = parsed.error.issues[0]!;
        status = 422;
        return jsonError('VALIDATION_ERROR', `${first.path.join('.')}: ${first.message}`, traceId, 422);
      }

      const dryRun = url.searchParams.get('dry_run') === 'true';

      if (dryRun) {
        const result = await importItems(handlerClient, parsed.data, true, importCallerId);
        if (!result.ok) { status = result.status; return jsonError(result.code, result.message, traceId, result.status); }
        const s = result.data.rejected === 0 ? 200 : result.data.rejected < result.data.total ? 207 : 422;
        status = s;
        return jsonOk(result.data, traceId, s);
      }

      const idempKey = req.headers.get('Idempotency-Key') ?? '';
      if (idempKey.length === 0) {
        status = 422;
        return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422);
      }

      type OutImport = { ok: true; data: ImportResult } | { ok: false; httpStatus: number; code: string; message: string };
      const iResult = await withIdempotency<OutImport>({
        client: db as unknown as IdempotencyDbClient,
        idempotencyKey: idempKey,
        tenantId: importIdempScope,
        endpoint: 'POST /content/import',
        bodyText: rawBody,
        handler: async () => {
          const result = await importItems(handlerClient, parsed.data, false, importCallerId);
          if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
          const s = result.data.rejected === 0 ? 200 : result.data.rejected < result.data.total ? 207 : 422;
          return { status: s, data: { ok: true as const, data: result.data } };
        },
      });
      if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
      const outcome = iResult.data;
      if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
      status = iResult.status;
      return jsonOk(outcome.data, traceId, status);
    }

    // ── Bearer auth for everything else ──────────────────────────────────────
    const auth = await verifyBearer(req, db);
    if (!auth) {
      status = 401;
      return jsonError('UNAUTHENTICATED', 'Valid Bearer token required', traceId, 401);
    }
    userId = auth.user.id;
    tenantId = (await callerTenantId(db, userId)) ?? undefined;
    // Q-1.1-1.8: platform_admin may have no tenant; fall back to userId for idempotency scope
    const idempTenantId = tenantId ?? userId;

    // ── Content authoring (platform_admin only) ────────────────────────────────
    // Routes: POST /content/items; PATCH /content/items/{id}; GET|POST /content/items/{id}/versions;
    //         PATCH /content/items/{id}/lifecycle; POST /content/stimuli; PATCH /content/stimuli/{id}
    const itemsWriteMatch = path.match(/^\/content\/items\/([^/]+)$/);
    const versionsMatch   = path.match(/^\/content\/items\/([^/]+)\/versions$/);
    const lifecycleMatch  = path.match(/^\/content\/items\/([^/]+)\/lifecycle$/);
    const stimuliMatch    = path.match(/^\/content\/stimuli\/([^/]+)$/);

    const isAdminWriteRoute =
      (method === 'POST'  && path === '/content/items') ||
      (method === 'PATCH' && itemsWriteMatch !== null)  ||
      (method === 'POST'  && versionsMatch   !== null)  ||
      (method === 'GET'   && versionsMatch   !== null)  ||
      (method === 'PATCH' && lifecycleMatch  !== null)  ||
      (method === 'POST'  && path === '/content/stimuli') ||
      (method === 'PATCH' && stimuliMatch    !== null);

    if (isAdminWriteRoute) {
      const role = await callerRole(db, userId);
      if (role !== 'platform_admin') {
        status = 403;
        return jsonError('FORBIDDEN', 'platform_admin role required', traceId, 403);
      }

      // POST /content/items
      if (method === 'POST' && path === '/content/items') {
        const idempKey = req.headers.get('Idempotency-Key') ?? '';
        if (idempKey.length === 0) {
          status = 422;
          return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422);
        }
        const rawBody = await req.text();
        const body = JSON.parse(rawBody) as ItemCreateBody;
        type OutCreateItem = { ok: true; data: ItemAdminDTO } | { ok: false; httpStatus: number; code: string; message: string };
        const iResult = await withIdempotency<OutCreateItem>({
          client: db as unknown as IdempotencyDbClient,
          idempotencyKey: idempKey,
          tenantId: idempTenantId,
          endpoint: 'POST /content/items',
          bodyText: rawBody,
          handler: async () => {
            const result = await createItem(handlerClient, body);
            if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
            return { status: 201, data: { ok: true as const, data: result.data } };
          },
        });
        if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
        const outcome = iResult.data;
        if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
        status = iResult.fromCache ? 200 : 201;
        return jsonOk(outcome.data, traceId, status);
      }

      // PATCH /content/items/{id}
      if (method === 'PATCH' && itemsWriteMatch !== null) {
        const itemId = itemsWriteMatch[1]!;
        const idempKey = req.headers.get('Idempotency-Key') ?? '';
        if (idempKey.length === 0) { status = 422; return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422); }
        const rawBody = await req.text();
        const body = JSON.parse(rawBody) as ItemUpdateBody;
        type OutUpdateItem = { ok: true; data: ItemAdminDTO } | { ok: false; httpStatus: number; code: string; message: string };
        const iResult = await withIdempotency<OutUpdateItem>({
          client: db as unknown as IdempotencyDbClient,
          idempotencyKey: idempKey,
          tenantId: idempTenantId,
          endpoint: `PATCH /content/items/${itemId}`,
          bodyText: rawBody,
          handler: async () => {
            const result = await updateItem(handlerClient, itemId, body);
            if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
            return { status: 200, data: { ok: true as const, data: result.data } };
          },
        });
        if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
        const outcome = iResult.data;
        if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
        status = iResult.status;
        return jsonOk(outcome.data, traceId, status);
      }

      // GET /content/items/{id}/versions
      if (method === 'GET' && versionsMatch !== null) {
        const itemId = versionsMatch[1]!;
        const result = await listItemVersions(handlerClient, itemId);
        if (!result.ok) { status = result.status; return jsonError(result.code, result.message, traceId, result.status); }
        return jsonOk(result.data, traceId);
      }

      // POST /content/items/{id}/versions
      if (method === 'POST' && versionsMatch !== null) {
        const itemId = versionsMatch[1]!;
        const idempKey = req.headers.get('Idempotency-Key') ?? '';
        if (idempKey.length === 0) { status = 422; return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422); }
        const rawBody = await req.text();
        const body = JSON.parse(rawBody) as ItemVersionCreateBody;
        type OutCreateVersion = { ok: true; data: ItemVersionDTO } | { ok: false; httpStatus: number; code: string; message: string };
        const iResult = await withIdempotency<OutCreateVersion>({
          client: db as unknown as IdempotencyDbClient,
          idempotencyKey: idempKey,
          tenantId: idempTenantId,
          endpoint: `POST /content/items/${itemId}/versions`,
          bodyText: rawBody,
          handler: async () => {
            const result = await createItemVersion(handlerClient, itemId, body, userId!);
            if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
            return { status: 201, data: { ok: true as const, data: result.data } };
          },
        });
        if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
        const outcome = iResult.data;
        if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
        status = iResult.fromCache ? 200 : 201;
        return jsonOk(outcome.data, traceId, status);
      }

      // PATCH /content/items/{id}/lifecycle
      if (method === 'PATCH' && lifecycleMatch !== null) {
        const itemId = lifecycleMatch[1]!;
        const idempKey = req.headers.get('Idempotency-Key') ?? '';
        if (idempKey.length === 0) { status = 422; return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422); }
        const rawBody = await req.text();
        const body = JSON.parse(rawBody) as ItemLifecycleBody;
        type OutLifecycle = { ok: true; data: { id: string; lifecycle: string } } | { ok: false; httpStatus: number; code: string; message: string };
        const iResult = await withIdempotency<OutLifecycle>({
          client: db as unknown as IdempotencyDbClient,
          idempotencyKey: idempKey,
          tenantId: idempTenantId,
          endpoint: `PATCH /content/items/${itemId}/lifecycle`,
          bodyText: rawBody,
          handler: async () => {
            const result = await transitionItemLifecycle(handlerClient, itemId, body);
            if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
            return { status: 200, data: { ok: true as const, data: result.data } };
          },
        });
        if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
        const outcome = iResult.data;
        if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
        status = iResult.status;
        return jsonOk(outcome.data, traceId, status);
      }

      // POST /content/stimuli
      if (method === 'POST' && path === '/content/stimuli') {
        const idempKey = req.headers.get('Idempotency-Key') ?? '';
        if (idempKey.length === 0) { status = 422; return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422); }
        const rawBody = await req.text();
        const body = JSON.parse(rawBody) as StimulusCreateBody;
        type OutCreateStimulus = { ok: true; data: StimulusAdminDTO } | { ok: false; httpStatus: number; code: string; message: string };
        const iResult = await withIdempotency<OutCreateStimulus>({
          client: db as unknown as IdempotencyDbClient,
          idempotencyKey: idempKey,
          tenantId: idempTenantId,
          endpoint: 'POST /content/stimuli',
          bodyText: rawBody,
          handler: async () => {
            const result = await createStimulus(handlerClient, body);
            if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
            return { status: 201, data: { ok: true as const, data: result.data } };
          },
        });
        if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
        const outcome = iResult.data;
        if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
        status = iResult.fromCache ? 200 : 201;
        return jsonOk(outcome.data, traceId, status);
      }

      // PATCH /content/stimuli/{id}
      if (method === 'PATCH' && stimuliMatch !== null) {
        const stimulusId = stimuliMatch[1]!;
        const idempKey = req.headers.get('Idempotency-Key') ?? '';
        if (idempKey.length === 0) { status = 422; return jsonError('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header required', traceId, 422); }
        const rawBody = await req.text();
        const body = JSON.parse(rawBody) as StimulusUpdateBody;
        type OutUpdateStimulus = { ok: true; data: StimulusAdminDTO } | { ok: false; httpStatus: number; code: string; message: string };
        const iResult = await withIdempotency<OutUpdateStimulus>({
          client: db as unknown as IdempotencyDbClient,
          idempotencyKey: idempKey,
          tenantId: idempTenantId,
          endpoint: `PATCH /content/stimuli/${stimulusId}`,
          bodyText: rawBody,
          handler: async () => {
            const result = await updateStimulus(handlerClient, stimulusId, body);
            if (!result.ok) return { status: result.status, data: { ok: false as const, httpStatus: result.status, code: result.code, message: result.message } };
            return { status: 200, data: { ok: true as const, data: result.data } };
          },
        });
        if (!iResult.ok) { status = iResult.status; return jsonError(iResult.code, iResult.message, traceId, iResult.status); }
        const outcome = iResult.data;
        if (!outcome.ok) { status = outcome.httpStatus; return jsonError(outcome.code, outcome.message, traceId, outcome.httpStatus); }
        status = iResult.status;
        return jsonOk(outcome.data, traceId, status);
      }
    }

    // GET /pathways
    if (method === 'GET' && path === '/pathways') {
      if (tenantId === undefined) {
        status = 403;
        return jsonError('FORBIDDEN', 'No tenant for caller', traceId, 403);
      }
      const result = await listPathways(handlerClient, tenantId);
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    // GET /pathways/{slug}
    const slugMatch = path.match(/^\/pathways\/([^/]+)$/);
    if (method === 'GET' && slugMatch !== null) {
      if (tenantId === undefined) {
        status = 403;
        return jsonError('FORBIDDEN', 'No tenant for caller', traceId, 403);
      }
      const result = await getPathwayBySlug(handlerClient, tenantId, slugMatch[1]!);
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    // GET /assessment-profiles
    if (method === 'GET' && path === '/assessment-profiles') {
      const exam = url.searchParams.get('exam_family') ?? undefined;
      const yearStr = url.searchParams.get('year_level');
      const filters: { exam_family?: string; year_level?: number } = {};
      if (exam !== undefined) filters.exam_family = exam;
      if (yearStr !== null) filters.year_level = parseInt(yearStr, 10);
      const result = await listAssessmentProfiles(handlerClient, filters);
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    // GET /content/items/{id}
    const itemMatch = path.match(/^\/content\/items\/([^/]+)$/);
    if (method === 'GET' && itemMatch !== null) {
      const result = await getItem(handlerClient, itemMatch[1]!);
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    // GET /content/search (admin only — Q-18.1)
    if (method === 'GET' && path === '/content/search') {
      const role = await callerRole(db, userId);
      if (role !== 'platform_admin' && role !== 'org_admin') {
        status = 403;
        return jsonError('FORBIDDEN', 'Admin role required', traceId, 403);
      }
      const result = await searchContent(handlerClient, {
        q: url.searchParams.get('q') ?? undefined,
        skill_ids: url.searchParams.get('skill_ids')?.split(',') ?? undefined,
        difficulty_band: (url.searchParams.get('difficulty_band') as 'easy' | 'mid' | 'hard' | null) ?? undefined,
        page: url.searchParams.get('page') !== null ? parseInt(url.searchParams.get('page')!, 10) : undefined,
        page_size: url.searchParams.get('page_size') !== null ? parseInt(url.searchParams.get('page_size')!, 10) : undefined,
      });
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    // GET /skill-graphs/active
    if (method === 'GET' && path === '/skill-graphs/active') {
      const loader = createDbLoader(cacheClient);
      const result = await getActiveSkillGraph(loader);
      if (!result.ok) {
        status = result.status;
        return jsonError(result.code, result.message, traceId, result.status);
      }
      return jsonOk(result.data, traceId);
    }

    status = 404;
    return jsonError('NOT_FOUND', 'Endpoint not found', traceId, 404);
  } catch (err) {
    status = 500;
    console.error(JSON.stringify({ level: 'error', trace_id: traceId, err: String(err) }));
    return jsonError('INTERNAL_ERROR', 'An unexpected error occurred', traceId, 500);
  } finally {
    log({
      level: status >= 500 ? 'error' : 'info',
      service: 'content-svc',
      trace_id: traceId,
      user_id: userId,
      tenant_id: tenantId,
      endpoint: `${method} ${path}`,
      status_code: status,
      duration_ms: Date.now() - t0,
    });
  }
});
