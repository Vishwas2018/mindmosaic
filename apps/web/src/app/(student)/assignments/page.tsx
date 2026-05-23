'use client'

// SCREEN_SPECS §13 — Student Assignments (Screen 13, Stage 40).
// Tab structure: Assigned / In Progress / Completed (Q-40.2, DEV-20260530-1).
// Overdue items shown within Assigned tab (red border variant).
// Review button → /results/{my_session_id}; no dropdown (Q-40.UI-6, DEV-20260530-2).

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { AppShell, Bell, Button, Card, EmptyState, ErrorState, Tabs, TopBar } from '@mm/ui'
import type { TabItem } from '@mm/ui'
import { useMe, useMyNotifications, useStartAssignment, useStudentAssignments } from '@mm/sdk'
import type { StudentAssignmentDTO } from '@mm/sdk'
import { getModeIcon, STUDENT_COPY } from '@/copy/student'

// ── helpers ───────────────────────────────────────────────────────────────────

function sessionPath(sessionId: string, mode: string): string {
  return mode === 'practice'
    ? `/session/${sessionId}/practice`
    : `/session/${sessionId}/exam`
}

function isOverdue(item: StudentAssignmentDTO): boolean {
  return item.my_status === 'pending' && item.due_at !== null && new Date(item.due_at) < new Date()
}

function isDueSoon(item: StudentAssignmentDTO): boolean {
  if (item.my_status !== 'pending' || item.due_at === null) return false
  const diff = new Date(item.due_at).getTime() - Date.now()
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── nav ───────────────────────────────────────────────────────────────────────

function StudentNav({ active }: { active: 'dashboard' | 'assignments' | 'results' }) {
  const navItems = [
    { key: 'dashboard', label: STUDENT_COPY.nav.dashboard, href: '/dashboard' },
    { key: 'assignments', label: STUDENT_COPY.nav.assignments, href: '/assignments' },
    { key: 'results', label: STUDENT_COPY.nav.results, href: '/results' },
  ] as const
  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={[
            'px-3 py-1.5 rounded-btn text-sm font-medium transition-colors',
            active === item.key
              ? 'text-[var(--primary)] bg-[var(--primary-50)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--slate-75)]',
          ].join(' ')}
          aria-current={active === item.key ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

// ── cards ─────────────────────────────────────────────────────────────────────

function AssignedCard({
  item,
  onStart,
  starting,
}: {
  item: StudentAssignmentDTO
  onStart: () => void
  starting: boolean
}) {
  const overdue = isOverdue(item)
  const dueSoon = !overdue && isDueSoon(item)
  const Icon = getModeIcon(item.mode)

  const borderColor = overdue
    ? 'border-l-red-500'
    : dueSoon
      ? 'border-l-amber-400'
      : 'border-l-slate-200'

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Icon size={18} className="mt-0.5 flex-shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[var(--text)] truncate">{item.title}</span>
              {overdue && (
                <span className="rounded-pill bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                  {STUDENT_COPY.overdueLabel}
                </span>
              )}
              {dueSoon && (
                <span className="rounded-pill bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                  {STUDENT_COPY.dueSoonLabel}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {STUDENT_COPY.modeLabel(item.mode)} · {STUDENT_COPY.questions(item.item_count)}
            </p>
            {overdue && item.due_at !== null && (
              <p className="mt-1 text-xs text-red-600">{STUDENT_COPY.wasDue(item.due_at)}</p>
            )}
            {dueSoon && item.due_at !== null && (
              <p className="mt-1 text-xs text-amber-600">
                {STUDENT_COPY.dueSoonDays(daysUntil(item.due_at))}
              </p>
            )}
            {!overdue && !dueSoon && item.due_at !== null && (
              <p className="mt-1 text-xs text-[var(--muted)]">{STUDENT_COPY.dueDate(item.due_at)}</p>
            )}
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onStart}
          disabled={starting}
          className="flex-shrink-0"
        >
          {STUDENT_COPY.startBtn}
        </Button>
      </div>
    </Card>
  )
}

function InProgressCard({ item }: { item: StudentAssignmentDTO }) {
  const Icon = getModeIcon(item.mode)
  const href = item.my_session_id != null
    ? sessionPath(item.my_session_id, item.mode)
    : '/session-selection'

  return (
    <Card className="border-l-4 border-l-[var(--primary)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Icon size={18} className="mt-0.5 flex-shrink-0 text-[var(--primary)]" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--text)] truncate block">{item.title}</span>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {STUDENT_COPY.modeLabel(item.mode)} · {STUDENT_COPY.questions(item.item_count)}
            </p>
            <div className="mt-2 h-1.5 w-full max-w-48 rounded-full bg-[var(--border)] overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-[var(--primary)]" />
            </div>
          </div>
        </div>
        <Link href={href}>
          <Button variant="secondary" size="sm" className="flex-shrink-0">
            {STUDENT_COPY.continueBtn}
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function CompletedCard({ item }: { item: StudentAssignmentDTO }) {
  const Icon = getModeIcon(item.mode)

  return (
    <Card className="border-l-4 border-l-green-500 opacity-90">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Icon size={18} className="mt-0.5 flex-shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--text)] truncate block">{item.title}</span>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {STUDENT_COPY.modeLabel(item.mode)} · {STUDENT_COPY.questions(item.item_count)}
            </p>
            {item.completed_at != null && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Completed {new Date(item.completed_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'short',
                })}
              </p>
            )}
          </div>
        </div>
        {item.my_session_id != null ? (
          <Link href={`/results/${item.my_session_id}`}>
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              {STUDENT_COPY.reviewBtn}
            </Button>
          </Link>
        ) : (
          <span className="text-xs text-[var(--muted)] flex-shrink-0">—</span>
        )}
      </div>
    </Card>
  )
}

function CardList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>
}

function SkeletonCard() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="h-20 rounded-card border border-[var(--border)] bg-[var(--surface)] animate-pulse"
    />
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const router = useRouter()
  const me = useMe()
  const studentId = me.data?.id ?? ''
  const assignments = useStudentAssignments(studentId)
  const notifications = useMyNotifications(true)
  const startMutation = useStartAssignment()

  const all = assignments.data ?? []
  const assigned = all.filter((a) => a.my_status === 'pending')
  const inProgress = all.filter((a) => a.my_status === 'in_progress')
  const completed = all.filter((a) => a.my_status === 'completed')
  const overdueCount = assigned.filter(isOverdue).length

  function handleStart(item: StudentAssignmentDTO) {
    startMutation.mutate(item.id, {
      onSuccess: (data) => {
        router.push(sessionPath(data.session_id, item.mode))
      },
    })
  }

  const tabItems: TabItem[] = [
    {
      value: 'assigned',
      label: STUDENT_COPY.tabs.assigned,
      count: assigned.length,
      content: assignments.isPending ? (
        <CardList>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </CardList>
      ) : assigned.length === 0 ? (
        <EmptyState title={STUDENT_COPY.emptyAssigned} description={STUDENT_COPY.emptyAssignedDesc} />
      ) : (
        <CardList>
          {assigned.map((item) => (
            <AssignedCard
              key={item.id}
              item={item}
              onStart={() => handleStart(item)}
              starting={startMutation.isPending && startMutation.variables === item.id}
            />
          ))}
        </CardList>
      ),
    },
    {
      value: 'in-progress',
      label: STUDENT_COPY.tabs.inProgress,
      count: inProgress.length,
      content: assignments.isPending ? (
        <CardList>
          {[0, 1].map((i) => <SkeletonCard key={i} />)}
        </CardList>
      ) : inProgress.length === 0 ? (
        <EmptyState title={STUDENT_COPY.emptyInProgress} description={STUDENT_COPY.emptyInProgressDesc} />
      ) : (
        <CardList>
          {inProgress.map((item) => (
            <InProgressCard key={item.id} item={item} />
          ))}
        </CardList>
      ),
    },
    {
      value: 'completed',
      label: STUDENT_COPY.tabs.completed,
      count: completed.length,
      content: assignments.isPending ? (
        <CardList>
          {[0, 1].map((i) => <SkeletonCard key={i} />)}
        </CardList>
      ) : completed.length === 0 ? (
        <EmptyState title={STUDENT_COPY.emptyCompleted} description={STUDENT_COPY.emptyCompletedDesc} />
      ) : (
        <CardList>
          {completed.map((item) => (
            <CompletedCard key={item.id} item={item} />
          ))}
        </CardList>
      ),
    },
  ]

  return (
    <AppShell variant="student-parent">
      <TopBar>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-base font-bold text-[var(--primary)]">MindMosaic</span>
        </Link>
        <div className="flex-1" />
        <StudentNav active="assignments" />
        <Bell
          unreadCount={notifications.data?.length ?? 0}
          onClick={() => {/* notification panel v1.1 */}}
        />
      </TopBar>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold text-[var(--text)] mb-6">
          {STUDENT_COPY.assignmentsHeading}
        </h1>

        {/* Overdue banner (Q-40.2) */}
        {overdueCount > 0 && (
          <div
            role="status"
            className="flex items-center gap-3 mb-6 p-3 rounded-card border-l-4 border-l-red-500 bg-red-50"
          >
            <AlertTriangle size={16} className="flex-shrink-0 text-red-600" aria-hidden="true" />
            <p className="text-sm text-red-700">{STUDENT_COPY.overdueBanner(overdueCount)}</p>
          </div>
        )}

        {assignments.isError ? (
          <ErrorState
            title="Couldn't load assignments"
            onRetry={() => void assignments.refetch()}
          />
        ) : (
          <Tabs items={tabItems} defaultValue="assigned" />
        )}
      </main>
    </AppShell>
  )
}
