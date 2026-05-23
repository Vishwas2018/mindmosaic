'use client'

// SCREEN_SPECS §7 — Student Dashboard v2 (Stage 40 upgrade).
// Stage 25 baseline upgraded: Bell + KPI strip + Weekly Learning Plan +
// real Mastery Snapshot (SkillBars) + Quick Insights (buildExplanationCards).
// NBA hero card omitted v1 (ISSUE-0031). ContinueSection preserved unchanged.
// SkillBar layout: vertical (default) per mockup 02-dashboard.html lines 530-538.
// Greeting: greetingText() from dashboard-utils (established utility).

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, ClipboardList, Clock, Lock, Pencil } from 'lucide-react'
import {
  AppShell,
  Bell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SkillBar,
  StatTile,
  TopBar,
} from '@mm/ui'
import {
  useCausalMap,
  useLearnerProfile,
  useLearningPlan,
  useListRecentSessions,
  useMe,
  useMyNotifications,
  usePathways,
} from '@mm/sdk'
import type { PathwayDTO, SessionSummaryDTO } from '@mm/types'
import { buildExplanationCards } from '@mm/core'
import { STUDENT_COPY } from '@/copy/student'
import {
  findActiveSession,
  formatMode,
  greetingText,
  sessionPagePath,
  sessionsThisWeek,
} from '@/lib/dashboard-utils'

// ── pure page-local formatters ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m ${s % 60}s`
}

function planItemSessionPath(mode: string): string {
  // Q-40.3: no plan_item_id on LearningPlanItemDTO; mode is only discriminator in v1.
  return `/session-selection?mode=${encodeURIComponent(mode)}`
}

// ── shared layout atoms ───────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-[var(--text)] mb-3">{children}</h2>
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`rounded-card border border-[var(--border)] bg-[var(--surface)] animate-pulse ${className}`}
    />
  )
}

// ── TopBar nav ────────────────────────────────────────────────────────────────

function StudentNav({ active }: { active: 'dashboard' | 'assignments' | 'results' }) {
  const items = [
    { key: 'dashboard', label: STUDENT_COPY.nav.dashboard, href: '/dashboard' },
    { key: 'assignments', label: STUDENT_COPY.nav.assignments, href: '/assignments' },
    { key: 'results', label: STUDENT_COPY.nav.results, href: '/results' },
  ] as const
  return (
    <nav className="flex items-center gap-1" aria-label="Student navigation">
      {items.map((item) => (
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

// ── Section: Greeting ─────────────────────────────────────────────────────────

function GreetingSection({
  displayName,
  yearLevel,
  loading,
}: {
  displayName: string | null
  yearLevel: number | null
  loading: boolean
}) {
  if (loading) return <SkeletonCard className="h-20" />
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--text)]">
        {greetingText(displayName ?? 'there')}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{STUDENT_COPY.dashboardSubheading}</p>
      {yearLevel !== null && (
        <p className="mt-0.5 text-xs text-[var(--muted)]">Year {yearLevel}</p>
      )}
    </div>
  )
}

// ── Section: Continue / Start CTA ─────────────────────────────────────────────
// Preserved unchanged from Stage 25 (NBA hero card omitted v1 — ISSUE-0031).

function ContinueSection({
  activeSession,
  sessionsExist,
  loading,
  onContinue,
  onStart,
}: {
  activeSession: SessionSummaryDTO | null
  sessionsExist: boolean
  loading: boolean
  onContinue: (path: string) => void
  onStart: () => void
}) {
  if (loading) return <SkeletonCard className="h-28" />

  if (activeSession !== null) {
    return (
      <Card className="border-l-4 border-l-[var(--primary)]">
        <p className="text-sm text-[var(--muted)]">Pick up where you left off</p>
        <p className="mt-1 text-base font-semibold text-[var(--text)]">
          {formatMode(activeSession.mode)} session in progress
        </p>
        <div className="mt-4">
          <Button variant="primary" onClick={() => onContinue(sessionPagePath(activeSession))}>
            Continue session
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <p className="text-base font-semibold text-[var(--text)]">
        {sessionsExist ? 'Ready for another session?' : 'Start your learning journey'}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {sessionsExist
          ? 'Choose a pathway below to begin.'
          : 'Pick a pathway below to get started.'}
      </p>
      <div className="mt-4">
        <Button variant="primary" onClick={onStart}>
          {sessionsExist ? 'Start new session' : 'Start first session'}
        </Button>
      </div>
    </Card>
  )
}

// ── Section: KPI strip ────────────────────────────────────────────────────────

// Tile 3: custom inline Weekly Progress block per Q-40.UI-2 + mockup lines 400-412.
function WeeklyProgressTile({
  done,
  total,
}: {
  done: number
  total: number
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="rounded-card border border-[var(--border)] bg-white shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
          {STUDENT_COPY.kpi.weeklyProgressLabel}
        </p>
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <Clock size={16} className="text-violet-500" aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-[var(--text)] tabular-nums">{pct}%</p>
      <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden mt-2">
        <div
          className="h-full rounded-full bg-violet-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[var(--muted)] mt-1.5">
        {done} of {total} tasks done
      </p>
    </div>
  )
}

function KpiStrip({
  sessionsCount,
  overallMastery,
  planDone,
  planTotal,
  lastScore,
}: {
  sessionsCount: number
  overallMastery: number | null
  planDone: number
  planTotal: number
  lastScore: string
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile label={STUDENT_COPY.kpi.sessionsLabel} value={sessionsCount} />
      <StatTile
        label={STUDENT_COPY.kpi.masteryLabel}
        value={overallMastery !== null ? `${overallMastery}%` : '—'}
      />
      <WeeklyProgressTile done={planDone} total={planTotal} />
      <StatTile label={STUDENT_COPY.kpi.lastScoreLabel} value={lastScore} />
    </div>
  )
}

// ── Section: Weekly Learning Plan ─────────────────────────────────────────────

type PlanItem = {
  order: number
  week: number
  mode: string
  target_skill_names: string[]
  target_skill_ids: string[]
  difficulty_label: string
  estimated_duration_min: number
  rationale: string
  priority: string
  status: string
}

function PlanItemRow({ item }: { item: PlanItem }) {
  const ModeIcon =
    item.mode === 'practice' ? Pencil
    : item.mode === 'exam' ? Clock
    : ClipboardList

  const isDone = item.status === 'completed'
  const isActive = item.status === 'in_progress'

  return (
    <div
      className={[
        'px-6 py-4 flex items-center gap-4',
        isActive ? 'bg-[var(--primary-50)]/40' : '',
      ].join(' ')}
    >
      <div
        className={[
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isDone
            ? 'bg-[var(--correct-50)] text-[var(--correct)]'
            : isActive
              ? 'bg-[var(--primary-50)] text-[var(--primary)]'
              : 'bg-[var(--border)] text-[var(--muted)]',
        ].join(' ')}
      >
        {isDone ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <ModeIcon size={14} aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text)] truncate">
          {item.target_skill_names.length > 0
            ? item.target_skill_names.slice(0, 2).join(', ')
            : STUDENT_COPY.modeLabel(item.mode)}
        </p>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {STUDENT_COPY.modeLabel(item.mode)} · {item.estimated_duration_min} min
        </p>
      </div>
      {isDone ? (
        <span className="rounded-pill bg-[var(--correct-50)] text-[var(--correct)] px-2 py-0.5 text-xs font-medium">
          Done
        </span>
      ) : (
        <Link href={planItemSessionPath(item.mode)}>
          <Button variant={isActive ? 'primary' : 'secondary'} size="sm">
            {isActive ? 'Resume' : STUDENT_COPY.planStartBtn}
          </Button>
        </Link>
      )}
    </div>
  )
}

function WeeklyPlanCard({
  items,
  loading,
  stale,
}: {
  items: PlanItem[]
  loading: boolean
  stale: boolean
}) {
  const done = items.filter((i) => i.status === 'completed').length

  return (
    <Card padding="none">
      <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text)]">
            {STUDENT_COPY.planHeading}
          </h3>
          {items.length > 0 && (
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {done} of {items.length} tasks done
            </p>
          )}
        </div>
        {stale && (
          <span className="rounded-pill bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-medium">
            {STUDENT_COPY.planStalePill}
          </span>
        )}
      </div>
      {loading ? (
        <div className="px-6 py-4 space-y-3">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-4">
          <p className="text-sm text-[var(--muted)]">{STUDENT_COPY.planNoItems}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <PlanItemRow key={item.order} item={item} />
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Section: Mastery Snapshot ─────────────────────────────────────────────────
// SkillBar vertical (default) per mockup lines 530-538. Trend arrows omitted v1.

function MasterySnapshotCard({
  skills,
  loading,
}: {
  skills: Array<{ label: string; value: number }>
  loading: boolean
}) {
  return (
    <Card padding="none">
      <div className="px-6 pt-5 pb-4 border-b border-[var(--border)]">
        <h3 className="text-[15px] font-semibold text-[var(--text)]">
          {STUDENT_COPY.masteryHeading}
        </h3>
        <p className="text-xs text-[var(--muted)] mt-0.5">Skill progression across strands</p>
      </div>
      <div className="px-6 py-4 space-y-4">
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-10" />)
        ) : skills.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{STUDENT_COPY.masteryEmpty}</p>
        ) : (
          skills.map((skill) => (
            <SkillBar
              key={skill.label}
              label={skill.label}
              value={skill.value}
              max={100}
            />
          ))
        )}
      </div>
    </Card>
  )
}

// ── Section: Quick Insights ───────────────────────────────────────────────────

function QuickInsightsCard({
  cards,
  loading,
}: {
  cards: Array<{ id: string; observation: string; interpretation: string; suggestion: string }>
  loading: boolean
}) {
  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-[var(--text)] mb-4">
        {STUDENT_COPY.insightsHeading}
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <SkeletonCard key={i} className="h-12" />)}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{STUDENT_COPY.insightsEmpty}</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.id} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-[var(--primary-50)] text-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen size={12} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[var(--text-2)] leading-relaxed">{card.observation}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{card.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Section: Pathway tiles (preserved from Stage 25) ─────────────────────────

function PathwayTile({
  pathway,
  onStart,
}: {
  pathway: PathwayDTO
  onStart: () => void
}) {
  const yearLabel =
    pathway.year_levels.length > 0 ? `Year ${pathway.year_levels.join(', ')}` : null

  if (!pathway.entitled) {
    return (
      <div
        className="rounded-card border border-[var(--border)] bg-[var(--surface)] shadow-card p-6 opacity-50"
        aria-label={`${pathway.display_name} — locked`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{pathway.display_name}</p>
            {yearLabel !== null && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{yearLabel}</p>
            )}
          </div>
          <Lock size={16} aria-hidden="true" className="flex-shrink-0 mt-0.5 text-[var(--muted)]" />
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {pathway.locked_reason ?? 'Upgrade to access'}
        </p>
      </div>
    )
  }

  return (
    <Card>
      <p className="text-sm font-semibold text-[var(--text)]">{pathway.display_name}</p>
      {yearLabel !== null && (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{yearLabel}</p>
      )}
      <p className="mt-1 text-xs text-[var(--muted-2)]">{pathway.program}</p>
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onStart}>
          Start session
        </Button>
      </div>
    </Card>
  )
}

// ── Section: Recent sessions (preserved from Stage 25) ───────────────────────

function RecentSessionsSection({
  sessions,
  loading,
  onSessionClick,
}: {
  sessions: SessionSummaryDTO[]
  loading: boolean
  onSessionClick: (id: string) => void
}) {
  if (loading) {
    return (
      <section aria-label="Recent sessions">
        <SectionHeading>Recent sessions</SectionHeading>
        <SkeletonCard className="h-32" />
      </section>
    )
  }

  if (sessions.length === 0) {
    return (
      <section aria-label="Recent sessions">
        <SectionHeading>Recent sessions</SectionHeading>
        <EmptyState
          title="No sessions yet"
          description="Complete a session to see your history here."
        />
      </section>
    )
  }

  return (
    <section aria-label="Recent sessions">
      <SectionHeading>Recent sessions</SectionHeading>
      <Card padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">Mode</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">Date</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">Duration</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[var(--muted)]">Result</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.session_id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--slate-75)] transition-colors cursor-pointer"
                onClick={() => onSessionClick(session.session_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSessionClick(session.session_id)
                  }
                }}
                aria-label={`${formatMode(session.mode)} session${session.submitted_at !== null ? `, ${formatDate(session.submitted_at)}` : ''}`}
              >
                <td className="px-4 py-3">
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--primary-50)] text-[var(--primary)]">
                    {formatMode(session.mode)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {session.submitted_at !== null ? formatDate(session.submitted_at) : '—'}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-2)]">
                  {formatDuration(session.duration_ms)}
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {session.score_band ??
                    (session.raw_score !== null ? `${session.raw_score}%` : '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  )
}

// ── Section: Assessment shortcuts ─────────────────────────────────────────────

function AssessmentShortcuts({ onStart }: { onStart: (mode: string) => void }) {
  return (
    <section aria-label="Assessment shortcuts">
      <SectionHeading>{STUDENT_COPY.assessmentShortcutsHeading}</SectionHeading>
      <div className="grid sm:grid-cols-3 gap-4">
        {STUDENT_COPY.assessmentShortcuts.map((shortcut) => (
          <button
            key={shortcut.mode}
            onClick={() => onStart(shortcut.mode)}
            className="card text-left p-5 hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <p className="text-sm font-semibold text-[var(--text)]">{shortcut.label}</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {shortcut.mode === 'diagnostic' && 'Assess your level across all strands.'}
              {shortcut.mode === 'practice' && 'Targeted skill practice based on your plan.'}
              {shortcut.mode === 'exam' && 'Timed assessment simulating test conditions.'}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const router = useRouter()
  const me = useMe()
  const studentId = me.data?.id ?? ''

  const recentSessions = useListRecentSessions()
  const pathways = usePathways()
  const learnerProfile = useLearnerProfile(studentId)
  const causalMap = useCausalMap(studentId)
  const learningPlan = useLearningPlan(studentId)
  const notifications = useMyNotifications(true)

  // ── derived data ─────────────────────────────────────────────────────────────

  const sessions = recentSessions.data ?? []
  const activeSession = findActiveSession(sessions)
  const submittedSessions = sessions
    .filter((s): s is SessionSummaryDTO & { submitted_at: string } => s.submitted_at !== null)
    .slice(0, 5)

  const thisWeekCount = sessionsThisWeek(sessions)

  // KPI: overall mastery from domain_profiles average
  const domainEntries = Object.entries(learnerProfile.data?.domain_profiles ?? {})
  const overallMastery =
    domainEntries.length > 0
      ? Math.round(
          (domainEntries.reduce((sum, [, d]) => sum + d.mastery, 0) / domainEntries.length) * 100,
        )
      : null

  // KPI: last score
  const lastSession = submittedSessions[0]
  const lastScore =
    lastSession?.score_band ??
    (lastSession?.raw_score != null ? `${lastSession.raw_score}%` : '—')

  // KPI: weekly progress from plan items
  const planItems = (learningPlan.data?.sessions ?? []) as PlanItem[]
  const planDone = planItems.filter((i) => i.status === 'completed').length
  const planTotal = planItems.length

  // Mastery snapshot: top 5 strands by mastery desc
  const masterySkills = domainEntries
    .map(([strand, data]) => ({ label: strand, value: Math.round(data.mastery * 100) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // Quick Insights: buildExplanationCards from causalMap (confirmed Q-40.4)
  const insightCards = buildExplanationCards(
    causalMap.data?.active_misconceptions ?? [],
  ).slice(0, 3)

  // ── handlers ─────────────────────────────────────────────────────────────────

  function handleStart() {
    router.push('/session-selection')
  }

  function handleStartMode(mode: string) {
    router.push(`/session-selection?mode=${encodeURIComponent(mode)}`)
  }

  function handleContinue(path: string) {
    router.push(path)
  }

  function handleSessionClick(sessionId: string) {
    router.push(`/results/${sessionId}`)
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <AppShell variant="student-parent">
      <TopBar>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-base font-bold text-[var(--primary)]">MindMosaic</span>
        </Link>
        <div className="flex-1" />
        <StudentNav active="dashboard" />
        <Bell
          unreadCount={notifications.data?.length ?? 0}
          onClick={() => {/* notification panel — PHASE-2: v1.1 */}}
        />
      </TopBar>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Greeting */}
        <GreetingSection
          displayName={me.data?.display_name ?? null}
          yearLevel={me.data?.year_level ?? null}
          loading={me.isPending}
        />

        {/* ContinueSection — preserved unchanged from Stage 25 (NBA omitted ISSUE-0031) */}
        {recentSessions.isError ? (
          <ErrorState
            title="Couldn't load session data"
            onRetry={() => void recentSessions.refetch()}
          />
        ) : (
          <ContinueSection
            activeSession={activeSession}
            sessionsExist={sessions.length > 0}
            loading={recentSessions.isPending}
            onContinue={handleContinue}
            onStart={handleStart}
          />
        )}

        {/* KPI strip */}
        <KpiStrip
          sessionsCount={thisWeekCount}
          overallMastery={overallMastery}
          planDone={planDone}
          planTotal={planTotal > 0 ? planTotal : 5}
          lastScore={lastScore}
        />

        {/* Main grid: left 3/5 (plan + pathway) | right 2/5 (mastery + insights) */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-3 space-y-6">
            {learningPlan.isError ? (
              <ErrorState
                title="Couldn't load this week's plan"
                onRetry={() => void learningPlan.refetch()}
              />
            ) : (
              <WeeklyPlanCard
                items={planItems}
                loading={learningPlan.isPending}
                stale={learningPlan.data?.stale_since != null}
              />
            )}
            <section aria-label="Quick start pathways">
              <SectionHeading>Quick start</SectionHeading>
              {pathways.isPending ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SkeletonCard className="h-36" />
                  <SkeletonCard className="h-36" />
                </div>
              ) : pathways.isError ? (
                <ErrorState title="Couldn't load pathways" onRetry={() => void pathways.refetch()} />
              ) : (pathways.data ?? []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(pathways.data ?? []).map((pathway) => (
                    <PathwayTile key={pathway.slug} pathway={pathway} onStart={handleStart} />
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-6">
            {learnerProfile.isError ? (
              <ErrorState
                title="Couldn't load mastery data"
                onRetry={() => void learnerProfile.refetch()}
              />
            ) : (
              <MasterySnapshotCard
                skills={masterySkills}
                loading={learnerProfile.isPending}
              />
            )}
            {causalMap.isError ? (
              <ErrorState
                title="Couldn't load insights"
                onRetry={() => void causalMap.refetch()}
              />
            ) : (
              <QuickInsightsCard
                cards={insightCards}
                loading={causalMap.isPending}
              />
            )}
          </div>
        </div>

        {/* Recent sessions */}
        {recentSessions.isError ? (
          <ErrorState
            title="Couldn't load recent activity"
            onRetry={() => void recentSessions.refetch()}
          />
        ) : (
          <RecentSessionsSection
            sessions={submittedSessions}
            loading={recentSessions.isPending}
            onSessionClick={handleSessionClick}
          />
        )}

        {/* Assessment shortcuts */}
        <AssessmentShortcuts onStart={handleStartMode} />

      </main>
    </AppShell>
  )
}
