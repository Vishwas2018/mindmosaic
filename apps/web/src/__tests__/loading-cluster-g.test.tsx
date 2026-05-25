// Cluster G error-consistency — one isError→role="alert" test per guard.
// Verifies each surface renders the shared ErrorState primitive (role="alert")
// instead of an inline <p class="text-sm text-[var(--error)]"> string or wrong primitive.
//
// Guard count: 16 G1 (teacher-dashboard ×4, student-detail ×3, assignments-list ×1,
//   assignments-tracking ×1, parent-dashboard ×6, billing ×1) + G2 (1) + G3 (1) = 18 total.

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react'
import type * as ReactTypes from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import type * as MmUi from '@mm/ui'

// ── Module mocks ──────────────────────────────────────────────────────────────

// React 18.3 does not export `use()` for Promises in jsdom.
// Patch so pages using `use(params)` (Next.js async-params pattern) render synchronously.
vi.mock('react', async (importActual) => {
  const actual = await importActual<typeof ReactTypes>()
  return {
    ...actual,
    use: <T,>(val: Promise<T> | T): T => {
      if (val !== null && typeof (val as any).then === 'function') {
        return { id: 'test-id' } as unknown as T
      }
      return val as T
    },
  }
})

vi.mock('@mm/sdk', () => ({
  usePathways: vi.fn(),
  useCreateSession: vi.fn(),
  useMyNotifications: vi.fn(),
  useMe: vi.fn(),
  useStudentAssignments: vi.fn(),
  useStartAssignment: vi.fn(),
  useSessionSummary: vi.fn(),
  useSessionState: vi.fn(),
  useRecordResponse: vi.fn(),
  useSubmitSession: vi.fn(),
  useCheckpoint: vi.fn(),
  usePlanCatalog: vi.fn(),
  useSubscription: vi.fn(),
  useInvoices: vi.fn(),
  useCreateCheckout: vi.fn(),
  useCreatePortalSession: vi.fn(),
  useCancelSubscription: vi.fn(),
  mmKeys: { billing: { all: () => ['billing'] } },
  useMyChildren: vi.fn(),
  useLearnerProfile: vi.fn(),
  useChildRecentSessions: vi.fn(),
  useCausalMap: vi.fn(),
  useMyClasses: vi.fn(),
  useClassKpi: vi.fn(),
  useClassStudents: vi.fn(),
  useInterventionAlerts: vi.fn(),
  useDismissAlert: vi.fn(),
  useAssignmentsForClass: vi.fn(),
  useStudentProfile: vi.fn(),
  useTeacherRecentSessions: vi.fn(),
  useFlagForReview: vi.fn(),
  useAssignmentTracking: vi.fn(),
  useAssignment: vi.fn(),
  useArchiveAssignment: vi.fn(),
  useListRecentSessions: vi.fn(),
  useLearningPlan: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
  useParams: vi.fn(() => ({ id: 'test-id' })),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({ user: { email: 'test@example.com' } })),
}))

vi.mock('@/lib/dashboard-utils', () => ({
  findActiveSession: vi.fn(() => null),
  formatMode: vi.fn((m: string) => m),
  greetingText: vi.fn((n: string) => `Hello, ${n}!`),
  sessionPagePath: vi.fn(() => '/session'),
  sessionsThisWeek: vi.fn(() => 0),
}))

vi.mock('@mm/core', () => ({
  buildExplanationCards: vi.fn(() => []),
}))

vi.mock('@/lib/content-labels', () => ({
  getExamFamilyLabel: vi.fn((f: string) => f),
}))

vi.mock('../../../../lib/content-labels', () => ({
  getExamFamilyLabel: vi.fn((f: string) => f),
}))

vi.mock('@mm/ui', async (importActual) => {
  const mod = await importActual<typeof MmUi>()
  return {
    ...mod,
    AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TopBar: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
    Bell: () => null,
    Button: ({
      children,
      onClick,
      disabled,
      type,
    }: {
      children: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      type?: 'button' | 'submit' | 'reset'
    }) => (
      <button onClick={onClick} disabled={disabled} type={type}>
        {children}
      </button>
    ),
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
    // ErrorState renders role="alert" so guards are queryable by role
    ErrorState: ({
      title,
      onRetry,
    }: {
      title: string
      description?: string
      onRetry?: () => void
    }) => (
      <div role="alert" aria-label={title}>
        <p>{title}</p>
        {onRetry && <button onClick={onRetry}>Try again</button>}
      </div>
    ),
    UpgradeState: ({ description }: { description?: string }) => (
      <p>{description ?? 'Upgrade'}</p>
    ),
    Tabs: ({ items }: any) => (
      <div>
        {(items ?? []).map((item: any) => (
          <div key={item.value}>{item.content}</div>
        ))}
      </div>
    ),
    Brand: () => <span>MindMosaic</span>,
    FocusHeader: ({ onExit }: { onExit?: () => void }) => (
      <div><button onClick={onExit}>Exit</button></div>
    ),
    Sidebar: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
    NavLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    StatTile: ({ label }: { label: string }) => <div>{label}</div>,
    SkillBar: () => null,
    ReadinessRing: () => null,
    ProgressBar: () => null,
    Dialog: () => null,
    PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
    Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
    TableHead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
    TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
    TableHeader: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
    TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
    QuestionMap: () => null,
    IconButton: ({ onClick }: { onClick?: () => void }) => <button onClick={onClick}>×</button>,
    useToast: vi.fn(() => ({ addToast: vi.fn() })),
  }
})

// ── Imports (after mock setup) ────────────────────────────────────────────────

import {
  usePlanCatalog,
  useSubscription,
  useInvoices,
  useCreateCheckout,
  useCreatePortalSession,
  useCancelSubscription,
  useMyChildren,
  useLearnerProfile,
  useChildRecentSessions,
  useCausalMap,
  useMyClasses,
  useClassKpi,
  useClassStudents,
  useInterventionAlerts,
  useDismissAlert,
  useAssignmentsForClass,
  useStudentAssignments,
  useStudentProfile,
  useTeacherRecentSessions,
  useFlagForReview,
  useAssignmentTracking,
  useAssignment,
  useArchiveAssignment,
  usePathways,
  useSessionSummary,
  useSessionState,
  useRecordResponse,
  useSubmitSession,
  useCheckpoint,
  useCreateSession,
} from '@mm/sdk'

import ResultsPage from '../app/(student)/results/[id]/page'
import ExamPage from '../app/(student)/session/[id]/exam/page'
import PracticeSessionPage from '../app/(student)/session/[id]/practice/page'
import SessionSelectionPage from '../app/(student)/session-selection/page'
import TeacherDashboardPage from '../app/(teacher)/teacher/page'
import TeacherStudentDetailPage from '../app/(teacher)/teacher/students/[id]/page'
import TeacherAssignmentsPage from '../app/(teacher)/teacher/assignments/page'
import TeacherAssignmentTrackingPage from '../app/(teacher)/teacher/assignments/[id]/page'
import TeacherContentPage from '../app/(teacher)/teacher/content/page'
import ParentDashboardPage from '../app/(parent)/parent/page'
import BillingPage from '../app/(parent)/billing/page'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ok = (data: unknown = null): any => ({
  data,
  isPending: false,
  isError: false,
  isLoading: false,
  refetch: vi.fn(),
})
const err = (): any => ({
  data: undefined,
  isPending: false,
  isError: true,
  isLoading: false,
  refetch: vi.fn(),
})
const loading = (): any => ({
  data: undefined,
  isPending: true,
  isError: false,
  isLoading: true,
  refetch: vi.fn(),
})
const mutok = (): any => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  reset: vi.fn(),
  error: null,
  variables: undefined,
})

/** Returns the first role="alert" element whose accessible name includes the given text. */
function getAlert(title: string) {
  const alerts = screen.getAllByRole('alert')
  const match = alerts.find((el) => el.getAttribute('aria-label')?.includes(title))
  expect(match).toBeTruthy()
  return match!
}

// Common teacher dashboard base: classes exist, unrelated hooks idle
function mockTeacherDashboardBase() {
  vi.mocked(useMyClasses).mockReturnValue(
    ok({ classes: [{ id: 'c1', name: 'Class 1', student_count: 10 }] }),
  )
  vi.mocked(useDismissAlert).mockReturnValue(mutok())
}

// Common teacher student detail base: profile loaded
function mockStudentDetailBase() {
  vi.mocked(useStudentProfile).mockReturnValue(
    ok({
      display_name: 'Alice',
      year_level: 5,
      avg_score: 80,
      last_session_at: null,
      class_name: 'Class 1',
      class_id: 'c1',
    }),
  )
  vi.mocked(useFlagForReview).mockReturnValue(mutok())
}

// Common parent dashboard base
function mockParentBase() {
  vi.mocked(useMyChildren).mockReturnValue(
    ok({ children: [{ student_id: 's1', student: { display_name: 'Alice' } }] }),
  )
}

const ONE_SESSION = [
  {
    session_id: 'x',
    mode: 'exam',
    submitted_at: null,
    raw_score: null,
    score_band: null,
    duration_ms: null,
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Cluster G error-consistency', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── G1: teacher/dashboard ────────────────────────────────────────────────────

  it('GD-1 — teacher/dashboard ClassKpiStrip: isError renders ErrorState', () => {
    mockTeacherDashboardBase()
    vi.mocked(useClassKpi).mockReturnValue(err())
    vi.mocked(useInterventionAlerts).mockReturnValue(ok([]))
    vi.mocked(useClassStudents).mockReturnValue(ok({ students: [] }))
    vi.mocked(useAssignmentsForClass).mockReturnValue(ok([]))
    render(<TeacherDashboardPage />)
    getAlert('Failed to load class stats')
  })

  it('GD-2 — teacher/dashboard InterventionAlertsSection: isError renders ErrorState', () => {
    mockTeacherDashboardBase()
    vi.mocked(useClassKpi).mockReturnValue(ok({
      active_students: 0,
      avg_class_score: null,
      sessions_this_week: 0,
      assignments_active: 0,
    }))
    vi.mocked(useInterventionAlerts).mockReturnValue(err())
    vi.mocked(useClassStudents).mockReturnValue(ok({ students: [] }))
    vi.mocked(useAssignmentsForClass).mockReturnValue(ok([]))
    render(<TeacherDashboardPage />)
    getAlert('Failed to load alerts')
  })

  it('GD-3 — teacher/dashboard StudentPerformanceTable: isError renders ErrorState', () => {
    mockTeacherDashboardBase()
    vi.mocked(useClassKpi).mockReturnValue(ok({
      active_students: 0,
      avg_class_score: null,
      sessions_this_week: 0,
      assignments_active: 0,
    }))
    vi.mocked(useInterventionAlerts).mockReturnValue(ok([]))
    vi.mocked(useClassStudents).mockReturnValue(err())
    vi.mocked(useAssignmentsForClass).mockReturnValue(ok([]))
    render(<TeacherDashboardPage />)
    getAlert('Failed to load student data')
  })

  it('GD-4 — teacher/dashboard AssignmentsWidget: isError renders ErrorState', () => {
    mockTeacherDashboardBase()
    vi.mocked(useClassKpi).mockReturnValue(ok({
      active_students: 0,
      avg_class_score: null,
      sessions_this_week: 0,
      assignments_active: 0,
    }))
    vi.mocked(useInterventionAlerts).mockReturnValue(ok([]))
    vi.mocked(useClassStudents).mockReturnValue(ok({ students: [] }))
    vi.mocked(useAssignmentsForClass).mockReturnValue(err())
    render(<TeacherDashboardPage />)
    getAlert('Failed to load assignments')
  })

  // ── G1: teacher/students/[id] ────────────────────────────────────────────────

  it('GSD-1 — teacher/student-detail StrandMasteryCard: isError renders ErrorState', () => {
    mockStudentDetailBase()
    vi.mocked(useLearnerProfile).mockReturnValue(err())
    vi.mocked(useStudentAssignments).mockReturnValue(ok([]))
    vi.mocked(useTeacherRecentSessions).mockReturnValue(ok([]))
    render(<TeacherStudentDetailPage />)
    getAlert('Failed to load strand mastery')
  })

  it('GSD-2 — teacher/student-detail AssignmentTable: isError renders ErrorState', () => {
    mockStudentDetailBase()
    vi.mocked(useLearnerProfile).mockReturnValue(ok({ domain_profiles: {} }))
    vi.mocked(useStudentAssignments).mockReturnValue(err())
    vi.mocked(useTeacherRecentSessions).mockReturnValue(ok([]))
    render(<TeacherStudentDetailPage />)
    getAlert('Failed to load assignments')
  })

  it('GSD-3 — teacher/student-detail ActivityFeed: isError renders ErrorState', () => {
    mockStudentDetailBase()
    vi.mocked(useLearnerProfile).mockReturnValue(ok({ domain_profiles: {} }))
    vi.mocked(useStudentAssignments).mockReturnValue(ok([]))
    vi.mocked(useTeacherRecentSessions).mockReturnValue(err())
    render(<TeacherStudentDetailPage />)
    getAlert('Failed to load activity')
  })

  // ── G1: teacher/assignments list ─────────────────────────────────────────────

  it('GA-1 — teacher/assignments: isError renders ErrorState not EmptyState', () => {
    vi.mocked(useMyClasses).mockReturnValue(
      ok({ classes: [{ id: 'c1', name: 'Class 1' }] }),
    )
    vi.mocked(useAssignmentsForClass).mockReturnValue(err())
    render(<TeacherAssignmentsPage />)
    getAlert('Failed to load')
  })

  // ── G1+G2: teacher/assignments/[id] ─────────────────────────────────────────

  it('GAT-1 — teacher/assignment-tracking: isError renders ErrorState not EmptyState', () => {
    vi.mocked(useAssignment).mockReturnValue(ok({ title: 'Quiz', status: 'published' }))
    vi.mocked(useAssignmentTracking).mockReturnValue(err())
    vi.mocked(useArchiveAssignment).mockReturnValue(mutok())
    render(<TeacherAssignmentTrackingPage />)
    getAlert('Failed to load')
  })

  // ── G1: student surfaces (results, exam, practice, session-selection) ────────

  it('GR-1 — results/[id]: isError renders ErrorState not inline Card/h1', async () => {
    vi.mocked(useSessionSummary).mockReturnValue(err())
    const params = Promise.resolve({ id: 'sess-1' })
    await act(async () => { render(<ResultsPage params={params} />) })
    getAlert('Could not load results')
  })

  it('GE-1 — session/[id]/exam: isError renders ErrorState not inline Card/h1', async () => {
    vi.mocked(useSessionState).mockReturnValue(err())
    vi.mocked(useRecordResponse).mockReturnValue({ ...mutok(), updateLockToken: vi.fn() } as any)
    vi.mocked(useSubmitSession).mockReturnValue(mutok())
    vi.mocked(useCheckpoint).mockReturnValue({ ...mutok(), updateLockToken: vi.fn() } as any)
    const params = Promise.resolve({ id: 'sess-1' })
    await act(async () => { render(<ExamPage params={params} />) })
    getAlert('Could not load session')
  })

  it('GPr-1 — session/[id]/practice: isError renders ErrorState not inline Card/PageHeader', async () => {
    vi.mocked(useSessionState).mockReturnValue(err())
    vi.mocked(useRecordResponse).mockReturnValue(mutok())
    vi.mocked(useSubmitSession).mockReturnValue(mutok())
    const params = Promise.resolve({ id: 'sess-1' })
    await act(async () => { render(<PracticeSessionPage params={params} />) })
    getAlert('Could not load session')
  })

  it('GSS-1 — session-selection: isError renders ErrorState not Card/EmptyState', () => {
    vi.mocked(usePathways).mockReturnValue(err())
    vi.mocked(useCreateSession).mockReturnValue(mutok())
    render(<SessionSelectionPage />)
    getAlert('Could not load pathways')
  })

  // ── G1: parent/dashboard ─────────────────────────────────────────────────────

  it('GP-1 — parent/dashboard HeroSection: profileQuery.isError renders ErrorState', async () => {
    mockParentBase()
    vi.mocked(useLearnerProfile).mockReturnValue(err())
    vi.mocked(useChildRecentSessions).mockReturnValue(ok(ONE_SESSION))
    vi.mocked(useCausalMap).mockReturnValue(ok(null))
    await act(async () => { render(<ParentDashboardPage />) })
    getAlert('Failed to load profile')
  })

  it('GP-2 — parent/dashboard SubjectAreasSection: profileQuery.isError renders ErrorState', async () => {
    mockParentBase()
    vi.mocked(useLearnerProfile).mockReturnValue(err())
    vi.mocked(useChildRecentSessions).mockReturnValue(ok(ONE_SESSION))
    vi.mocked(useCausalMap).mockReturnValue(ok(null))
    await act(async () => { render(<ParentDashboardPage />) })
    getAlert('Failed to load subject areas')
  })

  it('GP-3 — parent/dashboard AtAGlanceSection: sessionsQuery.isError renders ErrorState', async () => {
    mockParentBase()
    vi.mocked(useLearnerProfile).mockReturnValue(ok({ domain_profiles: {}, pathway_readiness: {} }))
    vi.mocked(useChildRecentSessions).mockReturnValue(err())
    vi.mocked(useCausalMap).mockReturnValue(ok(null))
    await act(async () => { render(<ParentDashboardPage />) })
    getAlert('Failed to load stats')
  })

  it('GP-4 — parent/dashboard RecentSessionsSection: sessionsQuery.isError renders ErrorState', async () => {
    mockParentBase()
    vi.mocked(useLearnerProfile).mockReturnValue(ok({ domain_profiles: {}, pathway_readiness: {} }))
    vi.mocked(useChildRecentSessions).mockReturnValue(err())
    vi.mocked(useCausalMap).mockReturnValue(ok(null))
    await act(async () => { render(<ParentDashboardPage />) })
    getAlert('Failed to load recent sessions')
  })

  it('GP-5 — parent/dashboard NoticedSection: causalMapQuery.isError renders ErrorState', async () => {
    mockParentBase()
    vi.mocked(useLearnerProfile).mockReturnValue(
      ok({ domain_profiles: {}, pathway_readiness: {} }),
    )
    vi.mocked(useChildRecentSessions).mockReturnValue(ok(ONE_SESSION))
    vi.mocked(useCausalMap).mockReturnValue(err())
    await act(async () => { render(<ParentDashboardPage />) })
    getAlert('Failed to load insights')
  })

  it('GP-6 — parent/dashboard WhatHelpsSection: causalMapQuery.isError renders ErrorState', async () => {
    mockParentBase()
    vi.mocked(useLearnerProfile).mockReturnValue(
      ok({ domain_profiles: {}, pathway_readiness: {} }),
    )
    vi.mocked(useChildRecentSessions).mockReturnValue(ok(ONE_SESSION))
    vi.mocked(useCausalMap).mockReturnValue(err())
    await act(async () => { render(<ParentDashboardPage />) })
    getAlert('Failed to load recommendations')
  })

  // ── G1: billing ──────────────────────────────────────────────────────────────

  it('GB-1 — billing plans tab: catalogQuery.isError renders ErrorState', () => {
    vi.mocked(usePlanCatalog).mockReturnValue(err())
    vi.mocked(useSubscription).mockReturnValue(
      ok({ tier: 'free', is_active: true, cancel_at: null, current_period_end: null }),
    )
    vi.mocked(useInvoices).mockReturnValue(ok({ invoices: [], truncated: false }))
    vi.mocked(useCreateCheckout).mockReturnValue(mutok())
    vi.mocked(useCreatePortalSession).mockReturnValue(mutok())
    vi.mocked(useCancelSubscription).mockReturnValue(mutok())
    render(<BillingPage />)
    getAlert('Failed to load plans')
  })

  // ── G2: teacher/assignment-tracking loading skeleton ──────────────────────────

  it('G2 — teacher/assignment-tracking isLoading: stat tiles use LoadingState not animate-pulse divs', () => {
    vi.mocked(useAssignment).mockReturnValue(ok({ title: 'Quiz', status: 'published' }))
    vi.mocked(useAssignmentTracking).mockReturnValue(loading())
    vi.mocked(useArchiveAssignment).mockReturnValue(mutok())
    render(<TeacherAssignmentTrackingPage />)
    // LoadingState renders role="status" aria-label="Loading…"
    const loaders = screen.getAllByRole('status', { name: 'Loading…' })
    // 3 card tiles + 1 row = at least 4
    expect(loaders.length).toBeGreaterThanOrEqual(4)
  })

  // ── G3: teacher/content error → shared ErrorState ────────────────────────────

  it('G3 — teacher/content isError: renders shared ErrorState (role="alert") not EmptyState', () => {
    vi.mocked(usePathways).mockReturnValue(err())
    render(<TeacherContentPage />)
    // Shared ErrorState renders role="alert"; local ErrorState (deleted) was <p> via EmptyState mock
    getAlert('Failed to load pathways')
  })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
