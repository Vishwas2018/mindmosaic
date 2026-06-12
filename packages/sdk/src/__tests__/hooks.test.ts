// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { MmClient, MmClientProvider } from '../index.js';
import { useMe, useListRecentSessions, useRecordResponse } from '../hooks/index.js';
import { mmKeys } from '../keys.js';

function mockFetchOk(body: unknown, traceId?: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (h: string): string | null => (h === 'X-Trace-Id' ? (traceId ?? null) : null) },
    json: async () => body,
  });
}

function makeWrapper(client: MmClient) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: qc },
      createElement(MmClientProvider, { client }, children),
    );
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMe — plumbing test (Q4 jsdom)', () => {
  it('returns typed UserMeDTO on success', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOk({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'student@example.com',
        display_name: 'Alice',
        role: 'student',
        tenant_id: '00000000-0000-0000-0000-000000000002',
        year_level: 5,
        subscription_tier: 'free',
        entitlements: {},
        preferences: {},
      }),
    );

    const client = new MmClient({
      baseUrl: 'https://api.test',
      getToken: async () => 'tok',
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.display_name).toBe('Alice');
    expect(result.current.data?.role).toBe('student');
    expect(result.current.data?.subscription_tier).toBe('free');
  });

  it('returns APIError on 4xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => null },
        json: async () => ({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Not authenticated',
            status: 401,
            details: null,
            trace_id: 'trace-xyz',
          },
        }),
      }),
    );

    const client = new MmClient({
      baseUrl: 'https://api.test',
      getToken: async () => null,
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const { APIError } = await import('../client.js');
    expect(result.current.error).toBeInstanceOf(APIError);
  });
});

describe('useListRecentSessions — Stage 22 / Q-22.1', () => {
  it('fetches GET /sessions/recent and parses SessionSummaryDTO[]', async () => {
    const fetchMock = mockFetchOk([
      {
        session_id: '11111111-1111-4111-8111-111111111111',
        mode: 'practice',
        pathway_name: 'NAPLAN Y5 Numeracy',
        started_at: '2026-05-10T08:00:00.000Z',
        submitted_at: '2026-05-10T08:30:00.000Z',
        duration_ms: 1800000,
        active_duration_ms: 1500000,
        score_band: 'developing',
        raw_score: 7,
        skills_touched_count: 4,
      },
      {
        session_id: '22222222-2222-4222-8222-222222222222',
        mode: 'exam',
        pathway_name: null,
        started_at: '2026-05-09T08:00:00.000Z',
        submitted_at: null,
        duration_ms: null,
        active_duration_ms: null,
        score_band: null,
        raw_score: null,
        skills_touched_count: 0,
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({
      baseUrl: 'https://api.test',
      getToken: async () => 'tok',
    });

    const { result } = renderHook(() => useListRecentSessions(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.mode).toBe('practice');
    expect(result.current.data?.[1]?.pathway_name).toBeNull();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[0]).toMatch(
      /\/assessment-svc\/sessions\/recent$/,
    );
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('uses mmKeys.sessions.recent() as query key', () => {
    expect(mmKeys.sessions.recent()).toEqual(['sessions', 'recent']);
  });
});

// ── useRecordResponse — idempotency key derivation (ISSUE-0091) ───────────────
//
// Regression net for the per-mount key bug: a single autoKey ref was shared
// across all mutate() calls, causing item 2+ to send the same Idempotency-Key
// with a different body → 422 IDEMPOTENCY_MISMATCH on the server.
// The fix derives the key from the request payload so retries are safe and
// distinct answers are unique.

const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ITEM_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ITEM_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const BASE_TELEMETRY = {
  time_to_answer_ms: 1,
  time_to_first_action_ms: 1,
  answer_changes: 0,
  items_since_session_start: 0,
  time_since_session_start_ms: 1,
  skipped_then_returned: false,
  scroll_to_bottom: null,
};

const RESPOND_OK = {
  is_correct: true,
  explanation: null,
  next_item: null,
  termination: null,
  progress: { answered: 1, total: 1 },
  version: 2,
  lock_token: 'tok-2',
};

function makeRespondMock() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (): string | null => null },
    json: async () => RESPOND_OK,
  });
}

function idemKey(calls: unknown[][], idx: number): string {
  const init = (calls[idx] as [string, RequestInit])[1];
  return (init.headers as Record<string, string>)['Idempotency-Key'] ?? '';
}

describe('useRecordResponse — idempotency key derivation (ISSUE-0091)', () => {
  it('different items produce different Idempotency-Key headers', async () => {
    const fetchMock = makeRespondMock();
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useRecordResponse(SESSION_ID), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({
      item_id: ITEM_A,
      expected_version: 1,
      response_data: { option_id: 'a' },
      telemetry: BASE_TELEMETRY,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    result.current.mutate({
      item_id: ITEM_B,
      expected_version: 2,
      response_data: { option_id: 'a' },
      telemetry: BASE_TELEMETRY,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(idemKey(fetchMock.mock.calls, 0)).toBe(`${SESSION_ID}:${ITEM_A}:1`);
    expect(idemKey(fetchMock.mock.calls, 1)).toBe(`${SESSION_ID}:${ITEM_B}:2`);
    expect(idemKey(fetchMock.mock.calls, 0)).not.toBe(idemKey(fetchMock.mock.calls, 1));
  });

  it('same item + version (retry) reuses the same Idempotency-Key', async () => {
    const fetchMock = makeRespondMock();
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useRecordResponse(SESSION_ID), {
      wrapper: makeWrapper(client),
    });

    const req = {
      item_id: ITEM_A,
      expected_version: 1,
      response_data: { option_id: 'a' },
      telemetry: BASE_TELEMETRY,
    };

    result.current.mutate(req);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    result.current.mutate(req);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const k0 = idemKey(fetchMock.mock.calls, 0);
    const k1 = idemKey(fetchMock.mock.calls, 1);
    expect(k0).toBe(`${SESSION_ID}:${ITEM_A}:1`);
    expect(k1).toBe(`${SESSION_ID}:${ITEM_A}:1`);
    expect(k0).toBe(k1);
  });

  it('respects caller-supplied options.idempotencyKey override', async () => {
    const fetchMock = makeRespondMock();
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(
      () => useRecordResponse(SESSION_ID, { idempotencyKey: 'caller-stable-key' }),
      { wrapper: makeWrapper(client) },
    );

    result.current.mutate({
      item_id: ITEM_A,
      expected_version: 1,
      response_data: { option_id: 'a' },
      telemetry: BASE_TELEMETRY,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(idemKey(fetchMock.mock.calls, 0)).toBe('caller-stable-key');
  });
});
