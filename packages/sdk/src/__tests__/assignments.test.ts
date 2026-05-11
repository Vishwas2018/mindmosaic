// @vitest-environment jsdom
// Stage 39 — SDK hook tests for assignment engine (D2/D3 hooks).
// Verifies URL patterns, query key shapes, and Idempotency-Key presence.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { MmClient, MmClientProvider } from '../index.js';
import {
  useAssignmentTracking,
  useCreateAssignment,
  useArchiveAssignment,
} from '../hooks/index.js';
import { mmKeys } from '../keys.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (): string | null => null },
    json: async () => body,
  });
}

function makeWrapper(client: MmClient) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
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

// ── mmKeys.assignments (D2) ───────────────────────────────────────────────────

describe('mmKeys.assignments — D2 query key shapes', () => {
  it('all() is the root invalidation key', () => {
    expect(mmKeys.assignments.all()).toEqual(['assignments']);
  });

  it('byId(id) is scoped under the root key', () => {
    const id = 'asgn-001';
    expect(mmKeys.assignments.byId(id)).toEqual(['assignments', id]);
    expect(mmKeys.assignments.byId(id)[0]).toBe(mmKeys.assignments.all()[0]);
  });

  it('tracking(id) is scoped under byId(id)', () => {
    const id = 'asgn-001';
    const byId = mmKeys.assignments.byId(id);
    const tracking = mmKeys.assignments.tracking(id);
    expect(tracking).toEqual([...byId, 'tracking']);
    expect(tracking[0]).toBe('assignments');
    expect(tracking[1]).toBe(id);
    expect(tracking[2]).toBe('tracking');
  });

  it('forClass and forStudent produce distinct keys', () => {
    const forClass = mmKeys.assignments.forClass('cls-1')[1];
    const forStudent = mmKeys.assignments.forStudent('stu-1')[1];
    expect(forClass).not.toBe(forStudent);
  });
});

// ── useAssignmentTracking (D3) ────────────────────────────────────────────────

const TRACKING_FIXTURE = {
  assignment_id: '00000000-0000-0000-0000-000000000003',
  targets: [
    {
      student_id: '00000000-0000-0000-0000-000000000005',
      display_name: 'Alice',
      status: 'completed',
      session_id: '00000000-0000-0000-0000-000000000006',
      score: 0.85,
      completed_at: '2026-05-11T09:00:00.000Z',
    },
  ],
  completion_rate: 1.0,
};

describe('useAssignmentTracking — D3', () => {
  it('fetches from /assignments-svc/assignments/{id}/tracking', async () => {
    const fetchMock = mockFetchOk(TRACKING_FIXTURE);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const id = '00000000-0000-0000-0000-000000000003';

    const { result } = renderHook(() => useAssignmentTracking(id), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments-svc\/assignments\/[^/]+\/tracking$/);
    expect(result.current.data?.completion_rate).toBe(1.0);
    expect(result.current.data?.targets).toHaveLength(1);
  });

  it('does not fetch when id is empty string', async () => {
    const fetchMock = mockFetchOk(TRACKING_FIXTURE);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });

    renderHook(() => useAssignmentTracking(''), { wrapper: makeWrapper(client) });

    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── useCreateAssignment (D3) ──────────────────────────────────────────────────

const ASSIGNMENT_DTO = {
  id: '00000000-0000-0000-0000-000000000003',
  title: 'Fractions Practice',
  description: null,
  mode: 'practice',
  pathway_id: '00000000-0000-0000-0000-000000000010',
  target_skill_ids: [],
  target_skill_names: [],
  difficulty_range: null,
  item_count: 10,
  time_limit_ms: null,
  due_at: null,
  status: 'draft',
  auto_generated: false,
  rationale: null,
  created_by: { id: '00000000-0000-0000-0000-000000000004', display_name: 'Teacher' },
  created_at: '2026-05-11T00:00:00.000Z',
  published_at: null,
};

describe('useCreateAssignment — D3 idempotency', () => {
  it('POSTs to /assignments-svc/assignments and returns AssignmentDTO', async () => {
    const fetchMock = mockFetchOk(ASSIGNMENT_DTO);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useCreateAssignment(), { wrapper: makeWrapper(client) });

    result.current.mutate({
      title: 'Fractions Practice',
      mode: 'practice',
      pathway_id: '00000000-0000-0000-0000-000000000010',
      target_skill_ids: [],
      item_count: 10,
      targets: [{ type: 'class', id: '00000000-0000-0000-0000-000000000020' }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments-svc\/assignments$/);
    expect(init.method).toBe('POST');
    expect(result.current.data?.status).toBe('draft');
  });

  it('includes Idempotency-Key header on POST', async () => {
    const fetchMock = mockFetchOk(ASSIGNMENT_DTO);
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useCreateAssignment(), { wrapper: makeWrapper(client) });

    result.current.mutate({
      title: 'Test',
      mode: 'practice',
      pathway_id: '00000000-0000-0000-0000-000000000010',
      target_skill_ids: [],
      item_count: 10,
      targets: [{ type: 'class', id: '00000000-0000-0000-0000-000000000020' }],
    });

    await waitFor(() => !result.current.isPending);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const idemKey = headers['Idempotency-Key'];
    expect(idemKey).toBeDefined();
    expect(typeof idemKey).toBe('string');
    expect((idemKey ?? '').length).toBeGreaterThan(0);
  });
});

// ── useArchiveAssignment (D3) ─────────────────────────────────────────────────

describe('useArchiveAssignment — D3', () => {
  it('POSTs to /assignments-svc/assignments/{id}/archive', async () => {
    const fetchMock = mockFetchOk({ ...ASSIGNMENT_DTO, status: 'archived' });
    vi.stubGlobal('fetch', fetchMock);

    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const { result } = renderHook(() => useArchiveAssignment(), { wrapper: makeWrapper(client) });

    result.current.mutate('00000000-0000-0000-0000-000000000003');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments-svc\/assignments\/[^/]+\/archive$/);
    expect(init.method).toBe('POST');
  });
});
