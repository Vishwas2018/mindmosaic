/**
 * billing-svc contract tests — Stage 44.
 *
 * Vitest in Node. Pure handler function tests; Deno dispatcher not exercised.
 *
 * Coverage (18 tests):
 *   Free tier propagation (2): 17 upserts emitted; mode.challenge disabled
 *   Standard tier propagation (2): mode.repair enabled; intelligence.causal enabled
 *   Premium tier propagation (2): pathway.* config=null; mode.challenge enabled + teacher.auto_groups disabled
 *   admin_override preservation (2): protected key skipped; unprotected keys still written
 *   sessions.monthly_limit config (2): Free=10; Standard=null
 *   pathway.* max_pathways config (3): Free=1; Standard=2; Premium=null
 *   admin_action_log write (1): actor_role='system' + sentinel UUID + payload
 *   Idempotent re-run (1): second call returns 200
 *   Handler return shape (1): 200 + propagated count
 *   Missing tenantId (1): 400 early return
 *   Missing subscription row (1): free-tier propagation (no 500)
 */
import { describe, expect, it, afterEach, vi } from 'vitest';
import {
  handleFlagPropagate,
  SENTINEL_SYSTEM_USER_ID,
  FEATURE_REGISTRY,
  type BillingDbClient,
} from '../handlers.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Mock harness ─────────────────────────────────────────────────────────────

interface TableStub {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

function buildClient(
  stubs: Record<string, TableStub | TableStub[]>,
): BillingDbClient & { calls: Array<{ table: string; op: string; row?: unknown }> } {
  const calls: Array<{ table: string; op: string; row?: unknown }> = [];
  const counters: Record<string, number> = {};

  function getStub(table: string): TableStub {
    const i = counters[table] ?? 0;
    counters[table] = i + 1;
    const entry = stubs[table];
    if (entry === undefined) throw new Error(`buildClient: unexpected table '${table}'`);
    return Array.isArray(entry) ? (entry[i] ?? entry[entry.length - 1]!) : entry;
  }

  return {
    calls,
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          return {
            select(_cols: string) {
              const stub = getStub(table);
              calls.push({ table, op: 'insert', row });
              return Promise.resolve({
                data: (stub.data ?? null) as Array<{ id: string }> | null,
                error: (stub.error ?? null) as { message: string; code?: string } | null,
              });
            },
          };
        },
        upsert(row: Record<string, unknown>, _opts?: { onConflict?: string }) {
          const stub = getStub(table);
          calls.push({ table, op: 'upsert', row });
          return Promise.resolve({ error: (stub.error ?? null) as { message: string } | null });
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(_col: string, _val: unknown) {
              const stub = getStub(table);
              calls.push({ table, op: 'update', row: patch });
              return Promise.resolve({ error: (stub.error ?? null) as { message: string } | null });
            },
            match(_cond: Record<string, unknown>) {
              const stub = getStub(table);
              calls.push({ table, op: 'update', row: patch });
              return Promise.resolve({ error: (stub.error ?? null) as { message: string } | null });
            },
          };
        },
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                maybeSingle() {
                  const stub = getStub(table);
                  calls.push({ table, op: 'select' });
                  return Promise.resolve({
                    data: (stub.data ?? null) as Record<string, unknown> | null,
                    error: (stub.error ?? null) as { message: string } | null,
                  });
                },
                order(_col: string, _opts: { ascending: boolean }) {
                  return {
                    limit(_n: number) {
                      const stub = getStub(table);
                      calls.push({ table, op: 'select-list' });
                      return Promise.resolve({
                        data: (stub.data ?? null) as Array<Record<string, unknown>> | null,
                        error: (stub.error ?? null) as { message: string } | null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as BillingDbClient & { calls: Array<{ table: string; op: string; row?: unknown }> };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 't0000044-0000-4000-8000-000000000001';
const TRACE_ID  = 'trace-44-test';

// Default happy-path client: no existing admin_override flags, all upserts succeed.
function happyClient(tier: string, existingFlags: Array<Record<string, unknown>> = []) {
  return buildClient({
    subscription:      { data: { tier }, error: null },
    feature_flag:      [
      { data: existingFlags, error: null },  // SELECT existing flags (index 0)
      { error: null },                        // UPSERT fallback for all 17 entries
    ],
    admin_action_log:  { data: [{ id: 'log-44-1' }], error: null },
  });
}

// ─── Free tier propagation ────────────────────────────────────────────────────

describe('handleFlagPropagate — free tier', () => {
  it('emits 17 upsert calls (all registry entries, no admin_override)', async () => {
    const client = happyClient('free');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const upserts = client.calls.filter(c => c.table === 'feature_flag' && c.op === 'upsert');
    expect(upserts).toHaveLength(FEATURE_REGISTRY['free']!.length);
    expect(upserts).toHaveLength(17);
  });

  it('mode.challenge is disabled for free tier', async () => {
    const client = happyClient('free');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const challengeUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'mode.challenge');
    expect(challengeUpsert).toBeDefined();
    expect((challengeUpsert!.row as Record<string, unknown>)['enabled']).toBe(false);
  });
});

// ─── Standard tier propagation ───────────────────────────────────────────────

describe('handleFlagPropagate — standard tier', () => {
  it('mode.repair is enabled for standard tier', async () => {
    const client = happyClient('standard');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const repairUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'mode.repair');
    expect((repairUpsert!.row as Record<string, unknown>)['enabled']).toBe(true);
  });

  it('intelligence.causal is enabled for standard tier', async () => {
    const client = happyClient('standard');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const causalUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'intelligence.causal');
    expect((causalUpsert!.row as Record<string, unknown>)['enabled']).toBe(true);
  });
});

// ─── Premium tier propagation ────────────────────────────────────────────────

describe('handleFlagPropagate — premium tier', () => {
  it('pathway.* config is null (unlimited) for premium tier (Q-44.3)', async () => {
    const client = happyClient('premium');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const pathwayUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'pathway.*');
    expect((pathwayUpsert!.row as Record<string, unknown>)['config']).toBeNull();
  });

  it('mode.challenge enabled, teacher.auto_groups disabled for premium tier', async () => {
    const client = happyClient('premium');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const upserts = client.calls.filter(c => c.table === 'feature_flag' && c.op === 'upsert');
    const challenge  = upserts.find(c => (c.row as Record<string, unknown>)['feature_key'] === 'mode.challenge');
    const autoGroups = upserts.find(c => (c.row as Record<string, unknown>)['feature_key'] === 'teacher.auto_groups');
    expect((challenge!.row as Record<string, unknown>)['enabled']).toBe(true);
    expect((autoGroups!.row as Record<string, unknown>)['enabled']).toBe(false);
  });
});

// ─── admin_override preservation ─────────────────────────────────────────────

describe('handleFlagPropagate — admin_override preservation (arch §11.2)', () => {
  it('skips upsert for a key with source=admin_override', async () => {
    const client = happyClient('standard', [
      { feature_key: 'mode.challenge', source: 'admin_override' },
    ]);
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const upserts = client.calls.filter(c => c.table === 'feature_flag' && c.op === 'upsert');
    const hasChallenge = upserts.some(
      c => (c.row as Record<string, unknown>)['feature_key'] === 'mode.challenge',
    );
    expect(hasChallenge).toBe(false);
  });

  it('still writes non-protected keys when one key is admin_override', async () => {
    const client = happyClient('standard', [
      { feature_key: 'mode.challenge', source: 'admin_override' },
    ]);
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const upserts = client.calls.filter(c => c.table === 'feature_flag' && c.op === 'upsert');
    // 17 registry entries minus 1 admin_override = 16 upserts
    expect(upserts).toHaveLength(16);
    const hasModeRepair = upserts.some(
      c => (c.row as Record<string, unknown>)['feature_key'] === 'mode.repair',
    );
    expect(hasModeRepair).toBe(true);
  });
});

// ─── sessions.monthly_limit config shape (Q-44.4) ────────────────────────────

describe('handleFlagPropagate — sessions.monthly_limit config (Q-44.4)', () => {
  it('Free tier: config = { max_sessions_per_month: 10 }', async () => {
    const client = happyClient('free');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const limitUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'sessions.monthly_limit');
    expect((limitUpsert!.row as Record<string, unknown>)['config']).toEqual({ max_sessions_per_month: 10 });
  });

  it('Standard tier: sessions.monthly_limit config is null (unlimited)', async () => {
    const client = happyClient('standard');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const limitUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'sessions.monthly_limit');
    expect((limitUpsert!.row as Record<string, unknown>)['config']).toBeNull();
  });
});

// ─── pathway.* max_pathways config (Q-44.3) ──────────────────────────────────

describe('handleFlagPropagate — pathway.* max_pathways config (Q-44.3)', () => {
  it('Free tier: pathway.* config = { max_pathways: 1 }', async () => {
    const client = happyClient('free');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const pathwayUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'pathway.*');
    expect((pathwayUpsert!.row as Record<string, unknown>)['config']).toEqual({ max_pathways: 1 });
  });

  it('Standard tier: pathway.* config = { max_pathways: 2 }', async () => {
    const client = happyClient('standard');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const pathwayUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'pathway.*');
    expect((pathwayUpsert!.row as Record<string, unknown>)['config']).toEqual({ max_pathways: 2 });
  });

  it('Premium tier: pathway.* config is null (unlimited)', async () => {
    const client = happyClient('premium');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const pathwayUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'pathway.*');
    expect((pathwayUpsert!.row as Record<string, unknown>)['config']).toBeNull();
  });
});

// ─── admin_action_log write (spec §25.5) ─────────────────────────────────────

describe('handleFlagPropagate — admin_action_log write (spec §25.5, Q-44.1)', () => {
  it('inserts admin_action_log with actor_role=system, sentinel UUID, and tier payload', async () => {
    const client = happyClient('premium');
    await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    const logCall = client.calls.find(c => c.table === 'admin_action_log' && c.op === 'insert');
    expect(logCall).toBeDefined();
    const row = logCall!.row as Record<string, unknown>;
    expect(row['actor_role']).toBe('system');
    expect(row['actor_id']).toBe(SENTINEL_SYSTEM_USER_ID);
    expect(row['action']).toBe('feature_flag_propagate');
    expect(row['entity_type']).toBe('tenant');
    expect(row['entity_id']).toBe(TENANT_ID);
    expect((row['payload'] as Record<string, unknown>)['tier']).toBe('premium');
  });
});

// ─── Idempotent re-run ────────────────────────────────────────────────────────

describe('handleFlagPropagate — idempotency', () => {
  it('second call with same input returns 200 (upsert is idempotent)', async () => {
    const client1 = happyClient('standard');
    const r1 = await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client: client1 });
    expect(r1.status).toBe(200);

    const client2 = happyClient('standard');
    const r2 = await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client: client2 });
    expect(r2.status).toBe(200);
  });
});

// ─── Handler return shape ─────────────────────────────────────────────────────

describe('handleFlagPropagate — return shape', () => {
  it('returns 200 with propagated count, tenant_id, trace_id', async () => {
    const client = happyClient('standard');
    const result = await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    expect(result.status).toBe(200);
    expect(result.data['propagated']).toBe(17);
    expect(result.data['tenant_id']).toBe(TENANT_ID);
    expect(result.data['trace_id']).toBe(TRACE_ID);
  });
});

// ─── Missing tenantId → 400 ──────────────────────────────────────────────────

describe('handleFlagPropagate — missing tenantId', () => {
  it('returns 400 when tenantId is undefined', async () => {
    const client = buildClient({});
    const result = await handleFlagPropagate({ traceId: TRACE_ID, tenantId: undefined, client });
    expect(result.status).toBe(400);
    expect((result.data['error'] as Record<string, unknown>)['code']).toBe('BAD_REQUEST');
  });
});

// ─── Missing subscription row → free-tier propagation ────────────────────────

describe('handleFlagPropagate — missing subscription row', () => {
  it('defaults to free tier when no subscription row exists (no 500)', async () => {
    const client = buildClient({
      subscription:     { data: null, error: null },  // no row
      feature_flag:     [
        { data: [], error: null },
        { error: null },
      ],
      admin_action_log: { data: [{ id: 'log-44-2' }], error: null },
    });
    const result = await handleFlagPropagate({ traceId: TRACE_ID, tenantId: TENANT_ID, client });
    expect(result.status).toBe(200);
    // Free tier = 17 entries → propagated = 17
    expect(result.data['propagated']).toBe(17);
    // Verify free-tier pathway config was written
    const pathwayUpsert = client.calls
      .filter(c => c.table === 'feature_flag' && c.op === 'upsert')
      .find(c => (c.row as Record<string, unknown>)['feature_key'] === 'pathway.*');
    expect((pathwayUpsert!.row as Record<string, unknown>)['config']).toEqual({ max_pathways: 1 });
  });
});
