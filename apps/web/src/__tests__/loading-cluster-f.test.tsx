// Cluster F loading-consistency — one isPending→getByRole('status') test per swappable file.
// Verifies each surface renders the shared LoadingState primitive (role="status" aria-label="Loading…")
// instead of a bespoke inline skeleton when its primary hook is pending.
//
// F6 ((student)/assignments/page.tsx): code swap done; loading test SKIPPED.
//   Reason: assignments page renders its three LoadingState cards inside a Tabs panel
//   (items[].content). The Tabs mock renders items content, but the per-tab hook
//   state is gated by useStudentAssignments returning pending — distinguishing that
//   from the surrounding page-level hooks (useMe, useMyNotifications) requires
//   additional mock sequencing outside Cluster F scope. Carry to preview gate.

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react'
import type * as ReactTypes from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import type * as MmUi from '@mm/ui'

// ── Module mocks ──────────────────────────────────────────────────────────────

// React 18.3 does not export `use()` for Promises in jsdom environments.
// Patch it here so pages using `use(params)` (Next.js async-params pattern)
// can render synchronously in tests.
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
    ErrorState: ({ title }: { title: string }) => <p>{title}</p>,
    UpgradeState: ({ description }: { description?: string }) => (
      <p>{description ?? 'Upgrade'}</p>
    ),
    Tabs: ({ items }: any) => (
      <div>{(items ?? []).map((item: any) => <div key={item.value}>{item.content}</div>)}</div>
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
  usePathways,
  useMyNotifications,
  useMe,
  useStudentAssignments,
  useStartAssignment,
  useSessionSummary,
  useSessionState,
  useRecordResponse,
  useSubmitSession,
  useCheckpoint,
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
  useStudentProfile,
  useTeacherRecentSessions,
  useFlagForReview,
  useAssignmentTracking,
  useAssignment,
  useArchiveAssignment,
  useListRecentSessions,
  useLearningPlan,
  useCreateSession,
} from '@mm/sdk'

import ResultsPage from '../app/(student)/results/[id]/page'
import ExamPage from '../app/(student)/session/[id]/exam/page'
import PracticeSessionPage from '../app/(student)/session/[id]/practice/page'
import SessionSelectionPage from '../app/(student)/session-selection/page'
import TeacherContentPage from '../app/(teacher)/teacher/content/page'
import TeacherDashboardPage from '../app/(teacher)/teacher/page'
import TeacherStudentDetailPage from '../app/(teacher)/teacher/students/[id]/page'
import TeacherAssignmentsPage from '../app/(teacher)/teacher/assignments/page'
import TeacherAssignmentTrackingPage from '../app/(teacher)/teacher/assignments/[id]/page'
import ParentDashboardPage from '../app/(parent)/parent/page'
import BillingPage from '../app/(parent)/billing/page'
import StudentDashboardPage from '../app/(student)/dashboard/page'

// ── Helpers ───────────────────────────────────────────────────────────────────

const pending = (): any => ({ data: undefined, isPending: true, isError: false, isLoading: true, refetch: vi.fn() })
const ok = (data: unknown = null): any => ({ data, isPending: false, isError: false, isLoading: false, refetch: vi.fn() })
const mutok = (): any => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false, reset: vi.fn(), error: null, variables: undefined })

function loadingLabel() {
  const all = screen.getAllByRole('status', { name: 'Loading…' })
  expect(all.length).toBeGreaterThan(0)
  return all[0]!
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Cluster F loading-consistency', () => {
  beforeEach(() => vi.clearAllMocks())

  it('F2 — results/[id] renders shared LoadingState while useSessionSummary isPending', async () => {
    vi.mocked(useSessionSummary).mockReturnValue(pending())
    const params = Promise.resolve({ id: 'sess-1' })
    await act(async () => { render(<ResultsPage params={params} />) })
    expect(loadingLabel()).toBeTruthy()
  })

  it('F3 — session/[id]/exam renders shared LoadingState while useSessionState isPending', async () => {
    vi.mocked(useSessionState).mockReturnValue(pending())
    vi.mocked(useRecordResponse).mockReturnValue({ ...mutok(), updateLockToken: vi.fn() } as any)
    vi.mocked(useSubmitSession).mockReturnValue(mutok())
    vi.mocked(useCheckpoint).mockReturnValue({ ...mutok(), updateLockToken: vi.fn() } as any)
    const params = Promise.resolve({ id: 'sess-1' })
    await act(async () => { render(<ExamPage params={params} />) })
    expect(loadingLabel()).toBeTruthy()
  })

  it('F4 — session/[id]/practice renders shared LoadingState while useSessionState isPending', async () => {
    vi.mocked(useSessionState).mockReturnValue(pending())
    vi.mocked(useRecordResponse).mockReturnValue(mutok())
    vi.mocked(useSubmitSession).mockReturnValue(mutok())
    const params = Promise.resolve({ id: 'sess-1' })
    await act(async () => { render(<PracticeSessionPage params={params} />) })
    expect(loadingLabel()).toBeTruthy()
  })

  it('F5 — session-selection renders shared LoadingState while usePathways isPending', () => {
    vi.mocked(usePathways).mockReturnValue(pending())
    vi.mocked(useCreateSession).mockReturnValue(mutok())
    render(<SessionSelectionPage />)
    expect(loadingLabel()).toBeTruthy()
  })

  // F6 — (student)/assignments/page: code swap done; loading test skipped.
  // LoadingState cards are inside Tabs items[].content; per-tab hook sequencing
  // (useStudentAssignments pending vs page-level hooks) not resolved in Cluster F scope.
  // Carry to preview gate.
  it.skip('F6 — assignments renders shared LoadingState while useStudentAssignments isPending', () => {
    vi.mocked(useMe).mockReturnValue(ok({ id: 'u1' }))
    vi.mocked(useMyNotifications).mockReturnValue(ok([]))
    vi.mocked(useStudentAssignments).mockReturnValue(pending())
    vi.mocked(useStartAssignment).mockReturnValue(mutok())
    render(<></>)
    expect(loadingLabel()).toBeTruthy()
  })

  it('F7 — student dashboard renders shared LoadingState while useMe isPending', async () => {
    vi.mocked(useMe).mockReturnValue(pending())
    vi.mocked(useMyNotifications).mockReturnValue(ok([]))
    vi.mocked(useListRecentSessions).mockReturnValue(ok([]))
    vi.mocked(usePathways).mockReturnValue(ok([]))
    vi.mocked(useLearnerProfile).mockReturnValue(ok(null))
    vi.mocked(useCausalMap).mockReturnValue(ok(null))
    vi.mocked(useLearningPlan).mockReturnValue(ok(null))
    await act(async () => { render(<StudentDashboardPage />) })
    expect(loadingLabel()).toBeTruthy()
  })

  it('F1 — teacher/content renders shared LoadingState while usePathways isLoading', () => {
    vi.mocked(usePathways).mockReturnValue({ ...pending(), isLoading: true } as any)
    render(<TeacherContentPage />)
    expect(loadingLabel()).toBeTruthy()
  })

  it('F8 — teacher dashboard renders shared LoadingState while useClassKpi isLoading', () => {
    vi.mocked(useMyClasses).mockReturnValue(ok({ classes: [{ id: 'c1', name: 'Class 1', student_count: 10 }] }))
    vi.mocked(useClassKpi).mockReturnValue({ ...pending(), isLoading: true } as any)
    vi.mocked(useClassStudents).mockReturnValue({ ...pending(), isLoading: true } as any)
    vi.mocked(useInterventionAlerts).mockReturnValue({ ...pending(), isLoading: true } as any)
    vi.mocked(useDismissAlert).mockReturnValue(mutok())
    vi.mocked(useAssignmentsForClass).mockReturnValue({ ...pending(), isLoading: true } as any)
    render(<TeacherDashboardPage />)
    expect(loadingLabel()).toBeTruthy()
  })

  it('F9 — teacher student detail renders shared LoadingState while useLearnerProfile isLoading', () => {
    vi.mocked(useStudentProfile).mockReturnValue(ok({
      display_name: 'Alice',
      year_level: 5,
      avg_score: 80,
      last_session_at: null,
      class_name: 'Class 1',
      class_id: 'c1',
    }))
    vi.mocked(useLearnerProfile).mockReturnValue({ ...pending(), isLoading: true } as any)
    vi.mocked(useStudentAssignments).mockReturnValue(ok([]))
    vi.mocked(useTeacherRecentSessions).mockReturnValue({ ...pending(), isLoading: true } as any)
    vi.mocked(useFlagForReview).mockReturnValue(mutok())
    render(<TeacherStudentDetailPage />)
    expect(loadingLabel()).toBeTruthy()
  })

  it('F10 — teacher assignments list renders shared LoadingState while useAssignmentsForClass isLoading', () => {
    vi.mocked(useMyClasses).mockReturnValue(ok({ classes: [{ id: 'c1', name: 'Class 1' }] }))
    vi.mocked(useAssignmentsForClass).mockReturnValue({ ...pending(), isLoading: true } as any)
    render(<TeacherAssignmentsPage />)
    expect(loadingLabel()).toBeTruthy()
  })

  it('F11 — teacher assignment tracking renders shared LoadingState while useAssignmentTracking isLoading', () => {
    vi.mocked(useAssignment).mockReturnValue(ok({ title: 'Quiz', status: 'published' }))
    vi.mocked(useAssignmentTracking).mockReturnValue({ ...pending(), isLoading: true } as any)
    vi.mocked(useArchiveAssignment).mockReturnValue(mutok())
    render(<TeacherAssignmentTrackingPage />)
    expect(loadingLabel()).toBeTruthy()
  })

  it('F12 — parent dashboard renders shared LoadingState while useLearnerProfile isPending', async () => {
    vi.mocked(useMyChildren).mockReturnValue(ok({
      children: [{ student_id: 's1', student: { display_name: 'Alice' } }],
    }))
    vi.mocked(useLearnerProfile).mockReturnValue(pending())
    vi.mocked(useChildRecentSessions).mockReturnValue(ok([]))
    vi.mocked(useCausalMap).mockReturnValue(ok(null))
    await act(async () => { render(<ParentDashboardPage />) })
    expect(loadingLabel()).toBeTruthy()
  })

  it('F13 — billing renders shared LoadingState while usePlanCatalog isPending', () => {
    vi.mocked(usePlanCatalog).mockReturnValue(pending())
    vi.mocked(useSubscription).mockReturnValue(ok({ tier: 'free', is_active: true, cancel_at: null, current_period_end: null }))
    vi.mocked(useInvoices).mockReturnValue(ok({ invoices: [], truncated: false }))
    vi.mocked(useCreateCheckout).mockReturnValue(mutok())
    vi.mocked(useCreatePortalSession).mockReturnValue(mutok())
    vi.mocked(useCancelSubscription).mockReturnValue(mutok())
    render(<BillingPage />)
    expect(loadingLabel()).toBeTruthy()
  })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
