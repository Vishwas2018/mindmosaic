// Cluster B — render tests for ErrorState wiring on dashboard + assignments.
// jsdom + @testing-library/react; added per Q-1.1-POLISH-B1 (ISSUE-0062 pre-launch blocker).
//
// Mock strategy:
//   @mm/sdk       — all hooks mocked; per-test overrides via wireDashboard()
//   next/navigation — useRouter stubbed (push is a no-op fn)
//   next/link      — renders as plain <a> to avoid Next.js SSR context requirement
//   @mm/ui         — importActual keeps ErrorState real; shells/charts stubbed
//   @mm/core       — buildExplanationCards stubbed → []
//
// NOT mocked (pure functions / constants, safe in jsdom):
//   @/copy/student, @/lib/dashboard-utils

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type * as MmUi from '@mm/ui'

// ── Module mocks (factories are lazy; vi.mock REGISTRATION is hoisted) ────────

vi.mock('@mm/sdk', () => ({
  useCausalMap: vi.fn(),
  useLearnerProfile: vi.fn(),
  useLearningPlan: vi.fn(),
  useListRecentSessions: vi.fn(),
  useMe: vi.fn(),
  useMyNotifications: vi.fn(),
  usePathways: vi.fn(),
  useStudentAssignments: vi.fn(),
  useStartAssignment: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Keep ErrorState real so we can assert on role="alert". Stub everything else
// that touches Radix primitives or complex layout to avoid jsdom mismatches.
vi.mock('@mm/ui', async (importActual) => {
  const mod = await importActual<typeof MmUi>()
  return {
    ErrorState: mod.ErrorState,
    AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TopBar: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
    Bell: () => null,
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children: React.ReactNode
      onClick?: () => void
      disabled?: boolean
    }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
    StatTile: () => <div />,
    SkillBar: () => <div />,
    Tabs: () => <div />,
  }
})

vi.mock('@mm/core', () => ({
  buildExplanationCards: vi.fn(() => []),
}))

// ── Imports (after mock setup) ────────────────────────────────────────────────

import {
  useCausalMap,
  useLearnerProfile,
  useLearningPlan,
  useListRecentSessions,
  useMe,
  useMyNotifications,
  usePathways,
  useStudentAssignments,
  useStartAssignment,
} from '@mm/sdk'
import StudentDashboardPage from '../app/(student)/dashboard/page'
import StudentAssignmentsPage from '../app/(student)/assignments/page'

// ── Return-value builders ─────────────────────────────────────────────────────

const ok = (data: unknown = null): any => ({
  data,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
})

const fail = (): any => ({
  data: undefined,
  isPending: false,
  isError: true,
  refetch: vi.fn(),
})

// ── Dashboard wire helper ─────────────────────────────────────────────────────
// Each argument defaults to a healthy (ok) state. Override one at a time per test.

function wireDashboard({
  sessions = ok([]),
  pathways = ok([]),
  profile = ok(null),
  causal = ok(null),
  plan = ok(null),
}: {
  sessions?: any
  pathways?: any
  profile?: any
  causal?: any
  plan?: any
} = {}) {
  vi.mocked(useMe).mockReturnValue({
    data: { id: 'u1', display_name: 'Tester', year_level: 5 },
    isPending: false,
    isError: false,
  } as any)
  vi.mocked(useListRecentSessions).mockReturnValue(sessions)
  vi.mocked(usePathways).mockReturnValue(pathways)
  vi.mocked(useLearnerProfile).mockReturnValue(profile)
  vi.mocked(useCausalMap).mockReturnValue(causal)
  vi.mocked(useLearningPlan).mockReturnValue(plan)
  vi.mocked(useMyNotifications).mockReturnValue(ok([]))
}

// ── Dashboard ErrorState guards ───────────────────────────────────────────────

describe('dashboard widget ErrorState guards', () => {
  beforeEach(() => vi.clearAllMocks())

  it("D1 recentSessions.isError → renders \"Couldn't load session data\"", () => {
    wireDashboard({ sessions: fail() })
    render(<StudentDashboardPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load session data" }),
    ).toBeInTheDocument()
  })

  it("D2 recentSessions.isError → renders \"Couldn't load recent activity\"", () => {
    wireDashboard({ sessions: fail() })
    render(<StudentDashboardPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load recent activity" }),
    ).toBeInTheDocument()
  })

  it("D3 pathways.isError → renders \"Couldn't load pathways\"", () => {
    wireDashboard({ pathways: fail() })
    render(<StudentDashboardPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load pathways" }),
    ).toBeInTheDocument()
  })

  it("D4 learningPlan.isError → renders \"Couldn't load this week's plan\"", () => {
    wireDashboard({ plan: fail() })
    render(<StudentDashboardPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load this week's plan" }),
    ).toBeInTheDocument()
  })

  it("D5 learnerProfile.isError → renders \"Couldn't load mastery data\"", () => {
    wireDashboard({ profile: fail() })
    render(<StudentDashboardPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load mastery data" }),
    ).toBeInTheDocument()
  })

  it("D6 causalMap.isError → renders \"Couldn't load insights\"", () => {
    wireDashboard({ causal: fail() })
    render(<StudentDashboardPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load insights" }),
    ).toBeInTheDocument()
  })
})

// ── Assignments ErrorState guard ──────────────────────────────────────────────

describe('assignments widget ErrorState guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it("assignments.isError → renders \"Couldn't load assignments\"", () => {
    vi.mocked(useMe).mockReturnValue({
      data: { id: 'u1' },
      isPending: false,
      isError: false,
    } as any)
    vi.mocked(useStudentAssignments).mockReturnValue(fail())
    vi.mocked(useMyNotifications).mockReturnValue(ok([]))
    vi.mocked(useStartAssignment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: undefined,
    } as any)
    render(<StudentAssignmentsPage />)
    expect(
      screen.getByRole('alert', { name: "Couldn't load assignments" }),
    ).toBeInTheDocument()
  })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
