// @vitest-environment jsdom
// Stage 40 — hook tests: useMyNotifications, useStartAssignment, useLearningPlan path fix.
// ISSUE-0026 regression guard: useLearningPlan must hit /{studentId}/current.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { MmClient, MmClientProvider } from '../index.js';
import { useMyNotifications, useStartAssignment, useLearningPlan } from '../hooks/index.js';

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (): string | null => null },
    json: async () => body,
  });
}

function makeWrapper(client: MmClient) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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

// ── useMyNotifications ─────────────────────────────────────────────────────────

const NOTIFICATION_FIXTURE = [
  {
    id: 'notif-001',
    type: 'assignment_published',
    title: 'New assignment',
    body: 'Fractions Practice has been assigned',
    link: '/assignments',
    read: false,
    created_at: '2026-05-30T09:00:00.000Z',
  },
];

describe('useMyNotifications — D3 Stage 40', () => {
  it('fetches /notifications-svc/notifications/me?unread=true when unreadOnly=true', async () => {
    const fetchMock = mockFetchOk(NOTIFICATION_FIXTURE);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useMyNotifications(true), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/notifications-svc\/notifications\/me\?unread=true$/);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.type).toBe('assignment_published');
  });

  it('fetches /notifications-svc/notifications/me without query when unreadOnly is not set', async () => {
    const fetchMock = mockFetchOk([]);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useMyNotifications(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/notifications-svc\/notifications\/me$/);
    expect(url).not.toContain('unread=true');
  });
});

// ── useStartAssignment ─────────────────────────────────────────────────────────

const START_RESPONSE = {
  session_id: '00000000-0000-0000-0000-000000000099',
  assignment_session_status: 'in_progress',
};

describe('useStartAssignment — D4 Stage 40', () => {
  it('POSTs to /assignments-svc/assignments/{id}/start', async () => {
    const fetchMock = mockFetchOk(START_RESPONSE);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useStartAssignment(), { wrapper: makeWrapper(client) });

    result.current.mutate('asgn-001');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments-svc\/assignments\/[^/]+\/start$/);
    expect(init.method).toBe('POST');
    expect(result.current.data?.session_id).toBe('00000000-0000-0000-0000-000000000099');
  });

  it('includes Idempotency-Key header on POST to /start', async () => {
    const fetchMock = mockFetchOk(START_RESPONSE);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useStartAssignment(), { wrapper: makeWrapper(client) });

    result.current.mutate('asgn-002');

    await waitFor(() => !result.current.isPending);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const idemKey = headers['Idempotency-Key'];
    expect(idemKey).toBeDefined();
    expect(typeof idemKey).toBe('string');
    expect((idemKey ?? '').length).toBeGreaterThan(0);
  });
});

// ── useLearningPlan — ISSUE-0026 regression guard ─────────────────────────────

const LEARNING_PLAN_FIXTURE = {
  plan_id: '00000000-0000-0000-0000-000000000010',
  plan_type: 'weekly',
  status: 'active',
  created_at: '2026-05-27T00:00:00.000Z',
  valid_until: '2026-06-03T00:00:00.000Z',
  sessions: [],
  milestones: null,
  stale_since: null,
};

describe('useLearningPlan — ISSUE-0026 path fix', () => {
  it('fetches /orchestration-svc/orchestration/plan/{studentId}/current', async () => {
    const fetchMock = mockFetchOk(LEARNING_PLAN_FIXTURE);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const studentId = '00000000-0000-0000-0000-000000000001';

    const { result } = renderHook(() => useLearningPlan(studentId), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/orchestration-svc\/orchestration\/plan\/[^/]+\/current$/);
    expect(url).toContain('/current');
  });
});
