/**
 * Shared mock Supabase client for Edge Function contract tests (Vitest in Node).
 *
 * Stage 19 (Q-19.13): hoisted from
 * `supabase/functions/content-svc/__tests__/contract.test.ts:54–82` so
 * assessment-svc and any subsequent Edge Function with contract tests can
 * import the same callable-Proxy harness.
 *
 * Usage:
 *   import { createMockSupabase, type QueryStub } from '../../_test-helpers/mock-supabase.ts';
 *   const client = createMockSupabase({
 *     pathway: { data: [...], error: null },
 *     feature_flag: [
 *       { data: [...], error: null },                  // first call
 *       { data: [...], error: null },                  // second call
 *     ],
 *   });
 *
 * Contract:
 *   - The mock is structurally compatible with the chained Postgrest
 *     builder (`.select().eq().in().order().maybeSingle()` etc.).
 *   - Awaiting the proxy resolves to the configured stub (`.then` trap).
 *   - `.maybeSingle()` / `.single()` resolve to the stub directly.
 *   - Per-table call ordering is tracked: pass an array of stubs to return
 *     a different result on each call to that table; pass a single stub for
 *     a uniform answer.
 *
 * RPC calls (`.rpc(name, args)`) are stubbed via the `_rpc` key — the mock
 * looks at `responses._rpc[name]` and returns the configured stub.
 */
import { vi } from 'vitest';

export interface QueryStub {
  data: unknown;
  error: { message: string; code?: string } | null;
}

/**
 * Map of table name → stub(s). The reserved `_rpc` key carries stubs for
 * `client.rpc(name, args)` calls (keyed by RPC name).
 */
export interface MockResponses {
  [table: string]: QueryStub | QueryStub[] | Record<string, QueryStub | QueryStub[]> | undefined;
  /** Stubs keyed by RPC name (`client.rpc('name', args)`). */
  _rpc?: Record<string, QueryStub | QueryStub[]>;
}

/**
 * Build a chainable mock that records calls. Every chain method (`.select`,
 * `.eq`, `.in`, …) returns another callable proxy; awaiting the proxy OR
 * invoking `.maybeSingle()` / `.single()` resolves to the configured stub.
 *
 * Proxy target is a function so the proxy itself is callable — chained method
 * invocations like `.select('cols')` work.
 */
export function mockBuilder(stub: QueryStub): unknown {
  const target = function () {} as unknown as object;
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: (v: QueryStub) => unknown) => resolve(stub);
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return () => Promise.resolve(stub);
      }
      return new Proxy(target, handler);
    },
    apply() {
      return new Proxy(target, handler);
    },
  };
  return new Proxy(target, handler);
}

export interface MockSupabaseExtras {
  /** Captures every `from(table)` call for assertions. */
  from: ReturnType<typeof vi.fn>;
  /** Captures every `rpc(name, args)` call for assertions. */
  rpc: ReturnType<typeof vi.fn>;
  /** Snapshot of how many times each table was queried so far. */
  callCounts(): Record<string, number>;
}

/**
 * Build a mock SupabaseClient-like object that returns canned results per
 * (table, callIndex) and per-RPC. Compatible with handlers expecting a
 * minimal structural client (`{ from, rpc }`).
 */
export function createMockSupabase<T extends object = object>(
  responses: MockResponses,
): T & MockSupabaseExtras {
  const counters: Record<string, number> = {};
  const rpcCounters: Record<string, number> = {};

  const fromSpy = vi.fn((table: string) => {
    const i = counters[table] ?? 0;
    counters[table] = i + 1;
    const entry = responses[table];
    if (entry === undefined) {
      throw new Error(`mockSupabase: unexpected table '${table}'`);
    }
    const stubs = entry as QueryStub | QueryStub[];
    const stub = Array.isArray(stubs)
      ? stubs[i] ?? stubs[stubs.length - 1]!
      : stubs;
    return mockBuilder(stub) as never;
  });

  const rpcSpy = vi.fn(async (name: string, _args?: unknown) => {
    const i = rpcCounters[name] ?? 0;
    rpcCounters[name] = i + 1;
    const rpcMap = responses._rpc;
    if (rpcMap === undefined || rpcMap[name] === undefined) {
      throw new Error(`mockSupabase: unexpected RPC '${name}'`);
    }
    const entry = rpcMap[name]!;
    const stub = Array.isArray(entry) ? entry[i] ?? entry[entry.length - 1]! : entry;
    return stub;
  });

  return {
    from: fromSpy,
    rpc: rpcSpy,
    callCounts() {
      return { ...counters };
    },
  } as T & MockSupabaseExtras;
}
