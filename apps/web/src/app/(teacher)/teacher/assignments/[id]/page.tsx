'use client'

// Screen 22 — Teacher: Assignment tracking view (/teacher/assignments/[id]).
// T5 authority: SCREEN_SPECS §22 tracking section.
// Shows per-student completion status, 3-stat grid, Archive dialog.
// Stage 39: score column shows "—" (v1 — session scores not exposed in tracking DTO).

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  AppShell,
  Brand,
  Button,
  Card,
  Dialog,
  EmptyState,
  NavLink,
  Sidebar,
  StatTile,
  TopBar,
} from '@mm/ui'
import { useAssignmentTracking, useAssignment, useArchiveAssignment } from '@mm/sdk'
import { ASSIGN_COPY as C } from '../../../../../copy/assignments'

// ── Sidebar ───────────────────────────────────────────────────────────────────

function TeacherSidebarNav() {
  const nav = [
    { href: '/teacher', label: 'Overview' },
    { href: '/teacher/students', label: 'Students' },
    { href: '/teacher/assignments', label: 'Assignments' },
    { href: '/teacher/analytics', label: 'Analytics' },
  ]
  return (
    <Sidebar variant="teacher">
      <div className="p-4 border-b border-[var(--border)]">
        <Brand logoSrc="/logo.svg" size="sm" />
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Teacher navigation">
        {nav.map(({ href, label }) => (
          <NavLink key={href} href={href} active={href === '/teacher/assignments'}>
            {label}
          </NavLink>
        ))}
      </nav>
    </Sidebar>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="h-12 rounded-lg border border-[var(--border)] bg-[var(--surface)] animate-pulse"
    />
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

type SessionStatus = 'completed' | 'in_progress' | 'not_started'

const STATUS_CLASSES: Record<SessionStatus, string> = {
  completed:
    'bg-[var(--correct-50)] text-[var(--correct-700)] border border-[var(--correct-100)]',
  in_progress:
    'bg-[var(--brand-50)] text-[var(--primary)] border border-[var(--brand-200)]',
  not_started:
    'bg-[var(--slate-100)] text-[var(--muted)] border border-[var(--border)]',
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  completed: C.trackStats.completed,
  in_progress: C.trackStats.inProgress,
  not_started: C.trackStats.notStarted,
}

function normaliseStatus(raw: string | null | undefined): SessionStatus {
  if (raw === 'completed') return 'completed'
  if (raw === 'in_progress') return 'in_progress'
  return 'not_started'
}

function StatusBadge({ raw }: { raw: string | null | undefined }) {
  const status = normaliseStatus(raw)
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── Archive dialog ─────────────────────────────────────────────────────────────

function ArchiveDialog({
  open,
  onOpenChange,
  onConfirm,
  isArchiving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isArchiving: boolean
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={C.archiveDialogTitle}
      description={C.archiveDialogDesc}
    >
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isArchiving}>
          {C.archiveCancelBtn}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isArchiving}>
          {isArchiving ? 'Archiving…' : C.archiveConfirmBtn}
        </Button>
      </div>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssignmentTrackingPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [archiveOpen, setArchiveOpen] = useState(false)

  const { data: assignment } = useAssignment(id)
  const { data: tracking, isLoading, isError } = useAssignmentTracking(id)
  const archiveMutation = useArchiveAssignment()

  const isPublished = assignment?.status === 'published'

  const targets = tracking?.targets ?? []
  const completedCount = targets.filter((t) => normaliseStatus(t.status) === 'completed').length
  const inProgressCount = targets.filter(
    (t) => normaliseStatus(t.status) === 'in_progress',
  ).length
  const notStartedCount = targets.filter(
    (t) => normaliseStatus(t.status) === 'not_started',
  ).length

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync(id)
      setArchiveOpen(false)
      router.push('/teacher/assignments')
    } catch {
      setArchiveOpen(false)
    }
  }

  return (
    <AppShell variant="teacher">
      <div className="flex h-screen">
        <TeacherSidebarNav />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar>
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[15px] font-semibold text-[var(--text)] truncate">
                {assignment?.title ?? C.trackHeading}
              </h1>
              {isPublished && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setArchiveOpen(true)}
                >
                  {C.archiveBtn}
                </Button>
              )}
            </div>
          </TopBar>

          <main className="flex-1 overflow-auto px-6 lg:px-8 py-6">
            <button
              type="button"
              onClick={() => router.push('/teacher/assignments')}
              className="text-xs text-[var(--primary)] hover:underline mb-6 inline-block focus-visible:outline-none focus-visible:shadow-focus rounded"
            >
              {C.trackBack}
            </button>

            {isLoading ? (
              <div className="space-y-3">
                {/* stat tiles skeleton */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-card border border-[var(--border)] animate-pulse bg-[var(--surface)]"
                    />
                  ))}
                </div>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : isError ? (
              <EmptyState title="Failed to load" description={C.loadTrackError} />
            ) : (
              <>
                {/* 3-stat grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <StatTile
                    label={C.trackStats.completed}
                    value={String(completedCount)}
                  />
                  <StatTile
                    label={C.trackStats.inProgress}
                    value={String(inProgressCount)}
                  />
                  <StatTile
                    label={C.trackStats.notStarted}
                    value={String(notStartedCount)}
                  />
                </div>

                {/* Student table */}
                {targets.length === 0 ? (
                  <EmptyState
                    title={C.trackHeading}
                    description={C.loadTrackError}
                  />
                ) : (
                  <Card className="overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--slate-50)]">
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                        {C.trackCols.student}
                      </span>
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide w-28 text-center">
                        {C.trackCols.status}
                      </span>
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide w-16 text-right">
                        {C.trackCols.score}
                      </span>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-[var(--border)]">
                      {targets.map((t) => (
                        <div
                          key={t.student_id}
                          className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center"
                        >
                          <span className="text-sm text-[var(--text)] truncate">
                            {t.display_name}
                          </span>
                          <span className="w-28 flex justify-center">
                            <StatusBadge raw={t.status} />
                          </span>
                          {/* score: v1 not exposed in tracking DTO */}
                          <span className="text-sm text-[var(--muted)] w-16 text-right">
                            {t.score !== null && t.score !== undefined
                              ? `${Math.round(t.score * 100)}%`
                              : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <ArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={() => void handleArchive()}
        isArchiving={archiveMutation.isPending}
      />
    </AppShell>
  )
}
