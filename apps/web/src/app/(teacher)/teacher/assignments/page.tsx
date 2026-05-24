'use client'

// Screen 22 — Teacher: Assignments list (/teacher/assignments).
// T5 layout: sidebar → header (New Assignment btn) → tab strip (Active/Upcoming/Completed)
// → assignment cards (title · type · due · completion %).
// Authority: SCREEN_SPECS Screen 22; mockup 15-assignment-engine.html.
// Q-39.UI-1: 5-step wizard on /teacher/assignments/new (separate route).
// Q-39.UI-2: path is (teacher)/teacher/assignments/page.tsx.
// Q-39.UI-6: 4-item nav (no Insights — consistency with Stage 37/38).
// Q-39.9: draft cards show [Edit] → /teacher/assignments/new?edit=<id>.
// Tab → DB status: Active = published; Upcoming = draft; Completed = archived.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppShell,
  Brand,
  Button,
  Card,
  EmptyState,
  LoadingState,
  NavLink,
  Sidebar,
  TopBar,
} from '@mm/ui'
import { useAssignmentsForClass, useMyClasses } from '@mm/sdk'
import type { AssignmentSummary } from '@mm/sdk'
import { ASSIGN_COPY as C } from '../../../../copy/assignments'

// ── Sidebar ───────────────────────────────────────────────────────────────────

function TeacherSidebarNav({ pathname }: { pathname: string }) {
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
          <NavLink key={href} href={href} active={pathname === href}>
            {label}
          </NavLink>
        ))}
      </nav>
    </Sidebar>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

type DbStatus = 'published' | 'draft' | 'archived'

const STATUS_CLASSES: Record<DbStatus, string> = {
  published:
    'bg-[var(--brand-50)] text-[var(--primary)] border border-[var(--brand-200)]',
  draft:
    'bg-[var(--warn-50)] text-[var(--warn-700)] border border-[var(--warn-100)]',
  archived:
    'bg-[var(--correct-50)] text-[var(--correct-700)] border border-[var(--correct-100)]',
}

function StatusBadge({ status }: { status: DbStatus }) {
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CLASSES[status]}`}
    >
      {C.tabs[status]}
    </span>
  )
}

// ── Assignment card ───────────────────────────────────────────────────────────

function AssignmentCard({ a }: { a: AssignmentSummary }) {
  const router = useRouter()
  const isDraft = a.status === 'draft'

  return (
    <Card className="p-4 flex items-center gap-5 hover:shadow-elevated transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-[var(--text)] truncate">{a.title}</p>
          <StatusBadge status={a.status as DbStatus} />
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span>{C.modeLabel(a.mode)}</span>
          <span aria-hidden>·</span>
          <span>{C.questions(a.item_count)}</span>
          {a.due_at && (
            <>
              <span aria-hidden>·</span>
              <span>Due {C.due(a.due_at)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isDraft && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/teacher/assignments/new?edit=${encodeURIComponent(a.id)}`)}
            aria-label={`Edit ${a.title}`}
          >
            {C.editBtn}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/teacher/assignments/${encodeURIComponent(a.id)}`)}
          aria-label={`Track ${a.title}`}
        >
          {C.trackBtn}
        </Button>
      </div>
    </Card>
  )
}

// ── Tab strip ─────────────────────────────────────────────────────────────────

const TABS: { key: DbStatus; label: string }[] = [
  { key: 'published', label: C.tabs.published },
  { key: 'draft', label: C.tabs.draft },
  { key: 'archived', label: C.tabs.archived },
]

function TabStrip({
  active,
  counts,
  onChange,
}: {
  active: DbStatus
  counts: Record<DbStatus, number>
  onChange: (k: DbStatus) => void
}) {
  return (
    <div
      className="flex border-b border-[var(--border)] -mx-6 lg:-mx-8 px-6 lg:px-8 mb-6"
      role="tablist"
      aria-label="Assignment status tabs"
    >
      {TABS.map(({ key, label }) => {
        const isOn = active === key
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isOn}
            className={[
              'text-[13px] font-medium px-4 py-2 border-b-2 transition-colors focus-visible:outline-none focus-visible:shadow-focus',
              isOn
                ? 'text-[var(--primary)] border-[var(--primary)]'
                : 'text-[var(--muted)] border-transparent hover:text-[var(--text)]',
            ].join(' ')}
            onClick={() => onChange(key)}
          >
            {label}
            <span
              className={[
                'ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full',
                isOn
                  ? 'bg-[var(--brand-100)] text-[var(--primary)]'
                  : 'bg-[var(--slate-100)] text-[var(--muted)]',
              ].join(' ')}
            >
              {counts[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<DbStatus>('published')

  const { data: classesData } = useMyClasses()
  const classId = classesData?.classes[0]?.id ?? ''

  const { data: assignments, isLoading, isError } = useAssignmentsForClass(classId)

  const list = assignments ?? []
  const counts: Record<DbStatus, number> = {
    published: list.filter((a) => a.status === 'published').length,
    draft: list.filter((a) => a.status === 'draft').length,
    archived: list.filter((a) => a.status === 'archived').length,
  }
  const filtered = list.filter((a) => a.status === activeTab)

  return (
    <AppShell variant="teacher">
      <div className="flex h-screen">
        <TeacherSidebarNav pathname="/teacher/assignments" />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold text-[var(--text)]">{C.heading}</h1>
                {classesData?.classes[0] && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--slate-100)] text-[var(--muted)]">
                    {classesData.classes[0].name}
                  </span>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/teacher/assignments/new')}
              >
                {C.newBtn}
              </Button>
            </div>
          </TopBar>

          <main className="flex-1 overflow-auto px-6 lg:px-8 py-6">
            {isLoading ? (
              <LoadingState variant="row" rows={3} />
            ) : isError ? (
              <EmptyState title="Failed to load" description={C.loadError} />
            ) : (
              <>
                <TabStrip
                  active={activeTab}
                  counts={counts}
                  onChange={setActiveTab}
                />
                {filtered.length === 0 ? (
                  <EmptyState
                    title={C.emptyTitle(C.tabs[activeTab])}
                    description={C.emptyDesc}
                  />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((a) => (
                      <AssignmentCard key={a.id} a={a} />
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  )
}
