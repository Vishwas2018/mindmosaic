'use client'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AppShell,
  Brand,
  Button,
  Card,
  EmptyState,
  PageHeader,
  TopBar,
  useToast,
} from '@mm/ui'
import { usePathways, useCreateSession } from '@mm/sdk'
import type { PathwayDTO } from '@mm/types'
import { useAuth } from '../../../providers/AuthProvider'
import { getExamFamilyLabel } from '../../../lib/content-labels'

// SCREEN_SPECS §8 — Session Selection.
// Q-22.4 (2026-05-12) = A: no recent-sessions row on this screen.
// First consumer of useListRecentSessions is Screen 12 (Learning Hub) /
// Screen 14 (Student Dashboard).

type SubjectKey = 'all' | 'numeracy' | 'reading' | 'writing' | 'language'
type Mode = 'practice' | 'exam' | 'diagnostic'

const SUBJECT_CHIPS: ReadonlyArray<{ key: SubjectKey; label: string; match: (p: PathwayDTO) => boolean }> = [
  { key: 'all', label: 'All subjects', match: () => true },
  { key: 'numeracy', label: 'Numeracy', match: (p) => /numeracy|math/i.test(p.program) },
  { key: 'reading', label: 'Reading', match: (p) => /reading/i.test(p.program) },
  { key: 'writing', label: 'Writing', match: (p) => /writing/i.test(p.program) },
  { key: 'language', label: 'Language Conventions', match: (p) => /language/i.test(p.program) },
]

const QUERY_TO_CHIP: Record<string, SubjectKey> = {
  numeracy: 'numeracy',
  reading: 'reading',
  writing: 'writing',
  language: 'language',
  all: 'all',
}

function PathwaySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading pathways"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-40 rounded-card border border-[var(--border)] bg-[var(--surface)] animate-pulse"
        />
      ))}
    </div>
  )
}

interface PathwayCardProps {
  pathway: PathwayDTO
  isPending: boolean
  onStart: (mode: Mode) => void
}

function PathwayCard({ pathway, isPending, onStart }: PathwayCardProps) {
  const locked = !pathway.entitled
  if (locked) {
    return (
      <Card
        aria-disabled="true"
        className="opacity-60"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">{pathway.display_name}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {getExamFamilyLabel(pathway.exam_family)} · Year {pathway.year_levels.join(', ')}
            </p>
          </div>
          <span
            aria-label="Locked — upgrade to access"
            className="text-[var(--muted-2)]"
            role="img"
          >
            🔒
          </span>
        </div>
        <div className="mt-4">
          <a
            href={`/billing?intent=upgrade&pathway=${pathway.slug}`}
            className="inline-flex h-11 items-center px-4 rounded-btn border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-medium text-[var(--text)] hover:bg-[var(--slate-75)] focus-visible:outline-none focus-visible:shadow-focus"
          >
            Upgrade to unlock
          </a>
        </div>
      </Card>
    )
  }
  return (
    <Card>
      <div>
        <h2 className="text-base font-semibold text-[var(--text)]">{pathway.display_name}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {getExamFamilyLabel(pathway.exam_family)} · Year {pathway.year_levels.join(', ')} · 20–30 min
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onStart('practice')}
          disabled={isPending}
        >
          Practice
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onStart('exam')}
          disabled={isPending}
        >
          Exam
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onStart('diagnostic')}
          disabled={isPending}
        >
          Diagnostic
        </Button>
      </div>
    </Card>
  )
}

export default function SessionSelectionPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()

  const initialSubject: SubjectKey =
    QUERY_TO_CHIP[params.get('subject')?.toLowerCase() ?? ''] ?? 'all'

  const [subject, setSubject] = useState<SubjectKey>(initialSubject)
  const [activeSessionConflict, setActiveSessionConflict] = useState(false)

  const pathwaysQuery = usePathways()
  const createSession = useCreateSession()

  const filteredPathways = useMemo(() => {
    const all = pathwaysQuery.data ?? []
    const chip = SUBJECT_CHIPS.find((c) => c.key === subject) ?? SUBJECT_CHIPS[0]!
    return all.filter((p) => chip.match(p))
  }, [pathwaysQuery.data, subject])

  function handleStart(pathway: PathwayDTO, mode: Mode) {
    setActiveSessionConflict(false)
    createSession.mutate(
      {
        assessment_profile_id: null,
        repair_sequence_id: null,
        assignment_id: null,
        mode,
        target_skills: null,
        pathway_id: pathway.slug,
      },
      {
        onSuccess: (response) => {
          const target = mode === 'exam' ? 'exam' : 'practice'
          router.push(`/session/${response.session_id}/${target}`)
        },
        onError: (err) => {
          // SDK surfaces APIError with .status / .code (ADR-0019).
          // assessment-svc currently emits `code: 'CONFLICT'` for 409 on
          // /sessions/create; that string is not in @mm/types ErrorCodeSchema,
          // so the SDK schema-parse fails and we receive code='INTERNAL_ERROR'
          // with status=409. This route's only 409 source is one_active_session
          // (assessment-svc/handlers.ts), so status alone is a reliable signal.
          const apiErr = err as { status?: number; code?: string }
          if (apiErr.status === 409) {
            setActiveSessionConflict(true)
            return
          }
          if (apiErr.status === 402 || apiErr.code === 'FEATURE_GATED') {
            toast.addToast({
              title: 'This is a Premium feature',
              description: 'Upgrade your plan to unlock more pathways.',
              variant: 'warn',
            })
            return
          }
          toast.addToast({
            title: 'Could not start session',
            description: 'Please try again. If the problem persists, refresh the page.',
            variant: 'error',
          })
        },
      },
    )
  }

  return (
    <AppShell variant="student-parent">
      <TopBar>
        <Brand logoSrc="/logo.svg" size="sm" />
        <div className="ml-auto text-sm text-[var(--muted)]">
          {user?.email ?? ''}
        </div>
      </TopBar>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <PageHeader
          title="How do you want to study today?"
          subtitle="Pick a pathway and choose Practice, Exam, or Diagnostic."
        />

        {activeSessionConflict && (
          <div
            role="status"
            className="rounded-card border border-[var(--warn-200)] bg-[var(--warn-bg)] p-4 text-sm text-[var(--text)] flex items-center justify-between gap-4"
          >
            <p>
              You already have an active session. Finish or end it before starting a new one.
            </p>
            <a
              href="/dashboard"
              className="inline-flex h-9 items-center px-3 rounded-btn bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-d)] focus-visible:outline-none focus-visible:shadow-focus"
            >
              Resume
            </a>
          </div>
        )}

        <div role="tablist" aria-label="Filter by subject" className="flex flex-wrap gap-2">
          {SUBJECT_CHIPS.map((chip) => {
            const selected = chip.key === subject
            return (
              <button
                key={chip.key}
                role="tab"
                aria-selected={selected}
                aria-controls="pathway-list"
                onClick={() => setSubject(chip.key)}
                className={
                  'h-9 px-3 rounded-btn text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus ' +
                  (selected
                    ? 'bg-[var(--primary)] text-white'
                    : 'border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--slate-75)]')
                }
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <section id="pathway-list" role="tabpanel" aria-label="Pathways">
          {pathwaysQuery.isPending && <PathwaySkeleton />}

          {pathwaysQuery.isError && (
            <Card>
              <EmptyState
                title="Could not load pathways"
                description="Something went wrong fetching your study options."
                action={
                  <Button variant="secondary" onClick={() => void pathwaysQuery.refetch()}>
                    Try again
                  </Button>
                }
              />
            </Card>
          )}

          {pathwaysQuery.isSuccess && filteredPathways.length === 0 && (
            <Card>
              <EmptyState
                title="No pathways available yet"
                description="Upgrade to unlock full mock exams and all subjects."
                action={
                  <a
                    href="/billing?intent=upgrade"
                    className="inline-flex h-11 items-center px-4 rounded-btn bg-gradient-to-r from-[var(--brand-500)] to-[var(--brand-600)] text-white text-sm font-medium hover:from-[var(--brand-600)] hover:to-[var(--brand-700)] focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    See upgrade options
                  </a>
                }
              />
            </Card>
          )}

          {pathwaysQuery.isSuccess && filteredPathways.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPathways.map((pathway) => (
                <PathwayCard
                  key={pathway.slug}
                  pathway={pathway}
                  isPending={createSession.isPending}
                  onStart={(mode) => handleStart(pathway, mode)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  )
}
