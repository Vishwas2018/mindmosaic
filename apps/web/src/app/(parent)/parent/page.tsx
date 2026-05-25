'use client'

// SCREEN_SPECS §15 — Parent Dashboard (/parent). Seven content blocks:
// child switcher · greeting + readiness hero · at-a-glance tiles ·
// subject areas · recent sessions · noticed cards · what would help.
// Shell: student-parent. Route guard: parent role (enforced in layout.tsx).

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AppShell,
  TopBar,
  Brand,
  Card,
  ErrorState,
  LoadingState,
  StatTile,
  SkillBar,
  ReadinessRing,
  EmptyState,
  Button,
} from '@mm/ui'
import {
  useMyChildren,
  useLearnerProfile,
  useChildRecentSessions,
  useCausalMap,
} from '@mm/sdk'
import { buildExplanationCards } from '@mm/core'
import type { ChildProfile } from '@mm/sdk'
import type { CausalMapDTO, LearningDNADTO, SessionSummaryDTO } from '@mm/types'
import { sessionsThisWeek, formatMode } from '@/lib/dashboard-utils'

// ── pure helpers ─────────────────────────────────────────────────────────────

function childFirstName(profile: ChildProfile): string {
  const name = profile.student.display_name
  if (!name) return 'your child'
  return name.split(' ')[0] ?? name
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m ${s % 60}s`
}

function avgScore(sessions: SessionSummaryDTO[]): string {
  const scored = sessions.filter((s) => s.raw_score !== null)
  if (scored.length === 0) return '—'
  const sum = scored.reduce((acc, s) => acc + (s.raw_score ?? 0), 0)
  return `${Math.round(sum / scored.length)}%`
}

function topicsMastered(profile: LearningDNADTO | undefined): number {
  if (!profile) return 0
  return Object.values(profile.domain_profiles).filter((d) => d.mastery >= 0.8).length
}

function compositeReadinessLabel(label: string): string {
  const map: Record<string, string> = {
    not_ready: 'Not ready',
    developing: 'Developing',
    on_track: 'On track',
    ready: 'Ready',
    strong: 'Strong',
  }
  return map[label] ?? label
}

// ── shared layout atoms ──────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-[var(--text)] mb-3">{children}</h2>
}

// ── Block 1: Child Switcher ───────────────────────────────────────────────────

function ChildSwitcher({
  profiles,
  activeId,
  onChange,
}: {
  profiles: ChildProfile[]
  activeId: string
  onChange: (id: string) => void
}) {
  if (profiles.length <= 1) return null
  return (
    <select
      value={activeId}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Switch child"
      className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
    >
      {profiles.map((c) => (
        <option key={c.student_id} value={c.student_id}>
          {c.student.display_name ?? 'Unnamed child'}
        </option>
      ))}
    </select>
  )
}

// ── Block 2: Greeting + Readiness Hero ───────────────────────────────────────

function HeroSection({
  firstName,
  readiness,
  readinessText,
  loading,
  error,
  onRetry,
}: {
  firstName: string
  readiness: number
  readinessText: string
  loading: boolean
  error?: boolean
  onRetry?: () => void
}) {
  if (loading) return <LoadingState variant="card" />
  if (error) return <Card><ErrorState title="Failed to load profile" onRetry={onRetry} /></Card>
  return (
    <Card>
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">
            How is {firstName} going?
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Overall readiness: {readinessText}</p>
        </div>
        <ReadinessRing value={readiness} label={`${firstName}'s readiness`} size="lg" />
      </div>
    </Card>
  )
}

// ── Block 3: At a glance ──────────────────────────────────────────────────────

function AtAGlanceSection({
  sessions,
  profile,
  loading,
  error,
  onRetry,
}: {
  sessions: SessionSummaryDTO[]
  profile: LearningDNADTO | undefined
  loading: boolean
  error?: boolean
  onRetry?: () => void
}) {
  return (
    <section aria-label="At a glance">
      <SectionHeading>At a glance</SectionHeading>
      {error ? (
        <ErrorState title="Failed to load stats" onRetry={onRetry} />
      ) : loading ? (
        <div className="grid grid-cols-3 gap-4">
          <LoadingState variant="card" />
          <LoadingState variant="card" />
          <LoadingState variant="card" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Sessions this week" value={sessionsThisWeek(sessions)} />
          <StatTile label="Avg score" value={avgScore(sessions)} />
          <StatTile label="Topics mastered" value={topicsMastered(profile)} />
        </div>
      )}
    </section>
  )
}

// ── Block 4: Subject areas ────────────────────────────────────────────────────

function SubjectAreasSection({
  profile,
  loading,
  error,
  onRetry,
}: {
  profile: LearningDNADTO | undefined
  loading: boolean
  error?: boolean
  onRetry?: () => void
}) {
  if (loading) {
    return (
      <section aria-label="Subject areas">
        <SectionHeading>Subject areas</SectionHeading>
        <LoadingState variant="row" rows={3} />
      </section>
    )
  }
  if (error) {
    return (
      <section aria-label="Subject areas">
        <SectionHeading>Subject areas</SectionHeading>
        <ErrorState title="Failed to load subject areas" onRetry={onRetry} />
      </section>
    )
  }
  if (!profile || Object.keys(profile.domain_profiles).length === 0) return null
  return (
    <section aria-label="Subject areas">
      <SectionHeading>Subject areas</SectionHeading>
      <Card padding="none">
        <ul className="divide-y divide-[var(--border)]">
          {Object.entries(profile.domain_profiles).map(([domain, data]) => (
            <li key={domain} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[var(--text)]">{domain}</p>
                <p className="text-xs text-[var(--muted)]">{Math.round(data.mastery * 100)}%</p>
              </div>
              <SkillBar value={data.mastery * 100} label={domain} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}

// ── Block 5: Recent sessions ──────────────────────────────────────────────────

function RecentSessionsSection({
  sessions,
  loading,
  error,
  onRetry,
  onSessionClick,
}: {
  sessions: SessionSummaryDTO[]
  loading: boolean
  error?: boolean
  onRetry?: () => void
  onSessionClick: (id: string) => void
}) {
  if (loading) {
    return (
      <section aria-label="Recent sessions">
        <SectionHeading>Recent sessions</SectionHeading>
        <LoadingState variant="row" rows={3} />
      </section>
    )
  }
  if (error) {
    return (
      <section aria-label="Recent sessions">
        <SectionHeading>Recent sessions</SectionHeading>
        <ErrorState title="Failed to load recent sessions" onRetry={onRetry} />
      </section>
    )
  }
  if (sessions.length === 0) return null
  return (
    <section aria-label="Recent sessions">
      <SectionHeading>Recent sessions</SectionHeading>
      <Card padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">
                Mode
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">
                Date
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">
                Duration
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.session_id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--slate-75)] transition-colors cursor-pointer"
                onClick={() => onSessionClick(s.session_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSessionClick(s.session_id)
                  }
                }}
                aria-label={`${formatMode(s.mode)} session${s.submitted_at !== null ? `, ${formatDate(s.submitted_at)}` : ''}`}
              >
                <td className="px-4 py-3">
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--primary-50)] text-[var(--primary)]">
                    {formatMode(s.mode)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {s.submitted_at !== null ? formatDate(s.submitted_at) : '—'}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-2)]">
                  {formatDuration(s.duration_ms)}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {s.score_band ?? (s.raw_score !== null ? `${s.raw_score}%` : '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  )
}

// ── Block 6: What we have noticed ────────────────────────────────────────────

function NoticedSection({
  causalMap,
  loading,
  error,
  onRetry,
}: {
  causalMap: CausalMapDTO | undefined
  loading: boolean
  error?: boolean
  onRetry?: () => void
}) {
  if (loading) {
    return (
      <section aria-label="What we have noticed">
        <SectionHeading>What we have noticed</SectionHeading>
        <LoadingState variant="row" rows={3} />
      </section>
    )
  }
  if (error) {
    return (
      <section aria-label="What we have noticed">
        <SectionHeading>What we have noticed</SectionHeading>
        <ErrorState title="Failed to load insights" onRetry={onRetry} />
      </section>
    )
  }
  if (!causalMap || causalMap.active_misconceptions.length === 0) return null
  const cards = buildExplanationCards(causalMap.active_misconceptions.slice(0, 3))
  return (
    <section aria-label="What we have noticed">
      <SectionHeading>What we have noticed</SectionHeading>
      <div className="space-y-4">
        {cards.map((card) => (
          <Card key={card.id}>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-2">{card.observation}</h3>
            <p className="text-sm text-[var(--muted)] mb-2">{card.interpretation}</p>
            <p className="text-xs text-[var(--muted)]">{card.suggestion}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── Block 7: What would help next ────────────────────────────────────────────

function WhatHelpsSection({
  causalMap,
  loading,
  error,
  onRetry,
  onStartSession,
}: {
  causalMap: CausalMapDTO | undefined
  loading: boolean
  error?: boolean
  onRetry?: () => void
  onStartSession: (presetId: string) => void
}) {
  if (loading) {
    return (
      <section aria-label="What would help next">
        <SectionHeading>What would help next</SectionHeading>
        <LoadingState variant="row" rows={2} />
      </section>
    )
  }
  if (error) {
    return (
      <section aria-label="What would help next">
        <SectionHeading>What would help next</SectionHeading>
        <ErrorState title="Failed to load recommendations" onRetry={onRetry} />
      </section>
    )
  }
  if (!causalMap || causalMap.repair_queue.length === 0) return null
  const items = causalMap.repair_queue.slice(0, 3)
  return (
    <section aria-label="What would help next">
      <SectionHeading>What would help next</SectionHeading>
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.repair_record_id}>
            <p className="text-sm font-semibold text-[var(--text)] mb-1">
              {item.repair_sequence_name}
            </p>
            <p className="text-sm text-[var(--muted)] mb-2">{item.rationale}</p>
            <p className="text-xs text-[var(--muted)] mb-3">~{item.estimated_duration_min} min</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStartSession(item.repair_record_id)}
            >
              Start session
            </Button>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const childrenQuery = useMyChildren()
  const children = childrenQuery.data?.children ?? []

  // Active child: URL param > localStorage > first child
  const urlChildId = searchParams.get('child') ?? ''
  const [storedChildId, setStoredChildId] = useState('')

  useEffect(() => {
    setStoredChildId(localStorage.getItem('lastViewedChildId') ?? '')
  }, [])

  const activeChildId = (() => {
    if (urlChildId && children.some((c) => c.student_id === urlChildId)) return urlChildId
    if (storedChildId && children.some((c) => c.student_id === storedChildId)) return storedChildId
    return children[0]?.student_id ?? ''
  })()

  useEffect(() => {
    if (activeChildId) localStorage.setItem('lastViewedChildId', activeChildId)
  }, [activeChildId])

  function handleChildChange(id: string) {
    router.push(`/parent?child=${id}`)
  }

  const activeChild = children.find((c) => c.student_id === activeChildId)

  const profileQuery = useLearnerProfile(activeChildId)
  const sessionsQuery = useChildRecentSessions(activeChildId, 5)
  const causalMapQuery = useCausalMap(activeChildId)

  const sessions = sessionsQuery.data ?? []

  const firstName = activeChild ? childFirstName(activeChild) : 'your child'

  // Derive composite readiness from first entry in learner profile pathway_readiness map
  const pathwayReadiness = profileQuery.data
    ? Object.values(profileQuery.data.pathway_readiness)[0]
    : undefined

  // Empty: no children linked
  if (!childrenQuery.isPending && children.length === 0) {
    return (
      <AppShell variant="student-parent">
        <TopBar>
          <Brand logoSrc="/logo.svg" size="sm" />
        </TopBar>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <EmptyState
            title="Link your first child"
            description="Add a child profile to start tracking their learning journey."
            action={
              <Button variant="primary" onClick={() => router.push('/parent/children')}>
                Add your first child
              </Button>
            }
          />
        </main>
      </AppShell>
    )
  }

  const contentLoading = profileQuery.isPending || sessionsQuery.isPending || childrenQuery.isPending
  const hasNoSessions = !sessionsQuery.isPending && !sessionsQuery.isError && sessions.length === 0 && activeChildId.length > 0

  return (
    <AppShell variant="student-parent">
      <TopBar>
        <Brand logoSrc="/logo.svg" size="sm" />
        <ChildSwitcher profiles={children} activeId={activeChildId} onChange={handleChildChange} />
      </TopBar>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Block 2: Greeting + readiness hero */}
        <HeroSection
          firstName={firstName}
          readiness={pathwayReadiness?.composite_readiness ?? 0}
          readinessText={compositeReadinessLabel(pathwayReadiness?.composite_label ?? 'developing')}
          loading={profileQuery.isPending || childrenQuery.isPending}
          error={profileQuery.isError}
          onRetry={() => void profileQuery.refetch()}
        />

        {/* Empty: child has no sessions yet */}
        {hasNoSessions ? (
          <Card>
            <p className="text-base text-[var(--text)]">
              We&apos;ll show insights here once {firstName} starts a session.
            </p>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => router.push(`/session-selection?child=${activeChildId}`)}
              >
                Start first session
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Block 3: At a glance — profileQuery (Topics Mastered) + sessionsQuery (sessions tiles) */}
            <AtAGlanceSection
              sessions={sessions}
              profile={profileQuery.data}
              loading={contentLoading}
              error={profileQuery.isError || sessionsQuery.isError}
              onRetry={() => {
                if (profileQuery.isError) void profileQuery.refetch()
                if (sessionsQuery.isError) void sessionsQuery.refetch()
              }}
            />

            {/* Block 4: Subject areas — profileQuery 1:many (group guard: useless without profile) */}
            <SubjectAreasSection
              profile={profileQuery.data}
              loading={profileQuery.isPending}
              error={profileQuery.isError}
              onRetry={() => void profileQuery.refetch()}
            />

            {/* Block 5: Recent sessions — sessionsQuery 1:many (group guard: useless without sessions) */}
            <RecentSessionsSection
              sessions={sessions}
              loading={sessionsQuery.isPending}
              error={sessionsQuery.isError}
              onRetry={() => void sessionsQuery.refetch()}
              onSessionClick={(id) => router.push(`/results/${id}`)}
            />

            {/* Block 6: What we have noticed — causalMapQuery 1:many (group guard: useless without map) */}
            <NoticedSection
              causalMap={causalMapQuery.data}
              loading={causalMapQuery.isPending}
              error={causalMapQuery.isError}
              onRetry={() => void causalMapQuery.refetch()}
            />

            {/* Block 7: What would help next — causalMapQuery 1:many (group guard: useless without map) */}
            <WhatHelpsSection
              causalMap={causalMapQuery.data}
              loading={causalMapQuery.isPending}
              error={causalMapQuery.isError}
              onRetry={() => void causalMapQuery.refetch()}
              onStartSession={(presetId) =>
                router.push(`/session-selection?child=${activeChildId}&preset=${presetId}`)
              }
            />
          </>
        )}
      </main>
    </AppShell>
  )
}
