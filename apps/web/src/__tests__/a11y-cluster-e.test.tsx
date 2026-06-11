// Cluster E a11y fix verification — ISSUE-0045, ISSUE-0046, ISSUE-0065.
//
// 0046: form field validation errors carry role="status" (polite, not assertive alert)
// 0065: overdue-assignment banner carries role="status" (rendered at load time, not async-injected)
// 0045: /practice page h1 receives programmatic focus on mount (necessary-not-sufficient;
//       AT announcement timing requires preview gate)

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type * as MmUi from '@mm/ui'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@mm/sdk', () => ({
  usePathways: vi.fn(),
  useCreateSession: vi.fn(),
  useMyNotifications: vi.fn(),
  useMe: vi.fn(),
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

// Keep PageHeader real (via ...mod spread) for ISSUE-0045 ref-forwarding to work.
// Stub shell + Radix primitives that cause jsdom mismatches.
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
    LoadingState: () => <div role="status" aria-label="Loading" />,
    UpgradeState: ({ description }: { description?: string }) => (
      <p>{description ?? 'Upgrade'}</p>
    ),
    Tabs: () => <div />,
  }
})

// ── Imports (after mock setup) ────────────────────────────────────────────────

import {
  usePathways,
  useCreateSession,
  useMyNotifications,
  useMe,
  useStudentAssignments,
  useStartAssignment,
} from '@mm/sdk'
import { StudentComposerForm } from '../components/student/StudentComposerForm'
import StudentAssignmentsPage from '../app/(student)/assignments/page'
import PracticePage from '../app/(student)/practice/page'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ok = (data: unknown = null): any => ({
  data,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Cluster E a11y fixes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('0046 — StudentComposerForm field validation errors carry role="status" not role="alert"', async () => {
    vi.mocked(usePathways).mockReturnValue(
      ok([{ id: 'p1', display_name: 'NAPLAN Y5 Numeracy', entitled: true }]),
    )
    vi.mocked(useCreateSession).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      reset: vi.fn(),
      error: null,
    } as any)

    const { container } = render(<StudentComposerForm simulationLocked={false} />)

    // Submit with default pathway_id='' (fails z.string().min(1)) to trigger validation
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => {
      expect(container.querySelector('[role="status"]')).not.toBeNull()
    })
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('0065 — overdue assignment banner carries role="status" not role="alert"', () => {
    vi.mocked(useMe).mockReturnValue(ok({ id: 'u1', display_name: 'Tester' }))
    vi.mocked(useMyNotifications).mockReturnValue(ok([]))
    vi.mocked(useStartAssignment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: undefined,
    } as any)
    vi.mocked(useStudentAssignments).mockReturnValue(
      ok([
        {
          id: 'a1',
          title: 'Math Quiz',
          my_status: 'pending',
          due_at: new Date(Date.now() - 86_400_000).toISOString(),
          mode: 'exam',
          item_count: 10,
          my_session_id: null,
          completed_at: null,
        },
      ]),
    )

    const { container } = render(<StudentAssignmentsPage />)

    // Banner is outside <Tabs> (mocked to <div />) so it always renders
    expect(container.querySelector('.border-l-red-500[role="status"]')).not.toBeNull()
    expect(container.querySelector('.border-l-red-500[role="alert"]')).toBeNull()
  })

  it('0045 — practice page h1 receives focus on mount (necessary-not-sufficient; AT announcement → preview gate)', async () => {
    vi.mocked(useMyNotifications).mockReturnValue(ok([]))
    // isPending=true → StudentComposerForm renders <LoadingState />; form does not mount
    vi.mocked(usePathways).mockReturnValue({ ...ok([]), isPending: true })
    vi.mocked(useCreateSession).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      reset: vi.fn(),
      error: null,
    } as any)

    await act(async () => {
      render(<PracticePage />)
    })

    const heading = screen.getByRole('heading', { level: 1 })
    expect(document.activeElement).toBe(heading)
  })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
