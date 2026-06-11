// @vitest-environment jsdom
// Cluster D — ISSUE-0040 staleTime audit.
// Verifies that each modified hook's staleTime reaches the TanStack Query cache.
//
// Test wrapper uses staleTime:60_000 (matching the app's QueryClient default in
// Providers.tsx:48) so the three →0 overrides (useSessionState,
// useListRecentSessions, useMyNotifications) are actually exercised against a
// non-zero baseline. A bare new QueryClient() would default staleTime to 0, making
// toBe(0) pass even if the hook sets nothing — silently unguarded on the
// correctness-critical useSessionState path.
//
// Dead-code hooks (zero consumers, no staleTime added):
//   useAssessmentProfile, useItemAdmin, useItemVersions (content.ts)
//   useLearningDNA, useSkillProgress (intelligence.ts)
//   usePathwayReadiness (orchestration.ts)

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { MmClient, MmClientProvider } from '../index.js';
import {
  usePathways,
  usePlanCatalog,
  useMyChildren,
  useMyClasses,
  useClassStudents,
  useStudentProfile,
  useInvoices,
  useLearnerProfile,
  useCausalMap,
  useLearningPlan,
  useClassKpi,
  useInterventionAlerts,
  useSubscription,
  useSessionSummary,
  useAssignment,
  useSessionState,
  useListRecentSessions,
  useChildRecentSessions,
  useTeacherRecentSessions,
  useStudentAssignments,
  useAssignmentsForClass,
  useAssignmentTracking,
  useMyNotifications,
} from '../hooks/index.js';
import { mmKeys } from '../keys.js';

const S = '00000000-0000-0000-0000-000000000001';

function makeWrapper(client: MmClient, qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: qc },
      createElement(MmClientProvider, { client }, children),
    );
  };
}

afterEach(() => vi.restoreAllMocks());

// Explicit type so invoke is () => unknown across all entries. The staleTime
// assertion is on the cache entry, not on the hook return value, so the return
// type is irrelevant here.
const STALE_MATRIX: Array<{
  name: string;
  invoke: () => unknown;
  key: readonly unknown[];
  expected: number;
}> = [
  // Tier A — catalog/reference: 300_000
  { name: 'usePathways',              invoke: () => usePathways(),                   key: mmKeys.pathways.list(),                    expected: 300_000 },
  { name: 'usePlanCatalog',           invoke: () => usePlanCatalog(),                key: mmKeys.billing.plans(),                    expected: 300_000 },
  { name: 'useMyChildren',            invoke: () => useMyChildren(),                 key: mmKeys.users.children(),                   expected: 300_000 },
  { name: 'useMyClasses',             invoke: () => useMyClasses(),                  key: mmKeys.users.classes(),                    expected: 300_000 },
  { name: 'useClassStudents',         invoke: () => useClassStudents(S, 1),          key: mmKeys.users.classStudents(S),             expected: 300_000 },
  { name: 'useStudentProfile',        invoke: () => useStudentProfile(S),            key: mmKeys.users.student(S),                   expected: 300_000 },
  { name: 'useInvoices',              invoke: () => useInvoices(),                   key: mmKeys.billing.invoices(),                 expected: 300_000 },
  // Tier B — profile/mastery aggregates: 120_000
  { name: 'useLearnerProfile',        invoke: () => useLearnerProfile(S),            key: mmKeys.intelligence.learnerProfile(S),     expected: 120_000 },
  { name: 'useCausalMap',             invoke: () => useCausalMap(S),                 key: mmKeys.intelligence.causalMap(S),          expected: 120_000 },
  { name: 'useLearningPlan',          invoke: () => useLearningPlan(S),              key: mmKeys.orchestration.learningPlan(S),      expected: 120_000 },
  { name: 'useClassKpi',              invoke: () => useClassKpi(S),                  key: mmKeys.analytics.classKpi(S),              expected: 120_000 },
  { name: 'useInterventionAlerts',    invoke: () => useInterventionAlerts(S),        key: mmKeys.analytics.interventionAlerts(S),    expected: 120_000 },
  { name: 'useSubscription',          invoke: () => useSubscription(),               key: mmKeys.billing.subscription(),             expected: 120_000 },
  { name: 'useSessionSummary',        invoke: () => useSessionSummary(S),            key: mmKeys.sessions.summary(S),                expected: 120_000 },
  { name: 'useAssignment',            invoke: () => useAssignment(S),                key: mmKeys.assignments.byId(S),                expected: 120_000 },
  // Tier C — activity/transactional: 0 or 30_000
  { name: 'useSessionState',          invoke: () => useSessionState(S),              key: mmKeys.sessions.state(S),                  expected: 0 },
  { name: 'useListRecentSessions',    invoke: () => useListRecentSessions(),         key: mmKeys.sessions.recent(),                  expected: 0 },
  { name: 'useChildRecentSessions',   invoke: () => useChildRecentSessions(S, 5),   key: mmKeys.sessions.childRecent(S),            expected: 30_000 },
  { name: 'useTeacherRecentSessions', invoke: () => useTeacherRecentSessions(S, 5), key: mmKeys.sessions.teacherRecent(S),          expected: 30_000 },
  { name: 'useStudentAssignments',    invoke: () => useStudentAssignments(S),        key: mmKeys.assignments.forStudent(S),          expected: 30_000 },
  { name: 'useAssignmentsForClass',   invoke: () => useAssignmentsForClass(S),       key: mmKeys.assignments.forClass(S),            expected: 30_000 },
  { name: 'useAssignmentTracking',    invoke: () => useAssignmentTracking(S),        key: mmKeys.assignments.tracking(S),            expected: 30_000 },
  { name: 'useMyNotifications',       invoke: () => useMyNotifications(),            key: mmKeys.notifications.mine(),               expected: 0 },
];

describe('staleTime per hook (ISSUE-0040)', () => {
  it.each(STALE_MATRIX)('$name → $expected ms', ({ invoke, key, expected }) => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<never>(() => {})));
    const client = new MmClient({ baseUrl: 'https://api.test', getToken: async () => 'tok' });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    renderHook(invoke, { wrapper: makeWrapper(client, qc) });
    const query = qc.getQueryCache().find({ queryKey: key, exact: true });
    // TanStack Query v5 types QueryOptions without observer-level fields; staleTime
    // is stored on the merged options object at runtime. Cast to access it.
    expect((query?.options as any)?.staleTime).toBe(expected);
  });
});

/* eslint-enable @typescript-eslint/no-explicit-any */
