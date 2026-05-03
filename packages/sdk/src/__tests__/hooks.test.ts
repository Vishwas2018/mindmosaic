// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { MmClient, MmClientProvider } from '../index.js';
import { useMe } from '../hooks/index.js';

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
