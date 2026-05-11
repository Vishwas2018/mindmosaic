'use client'

// Screen 22 — Teacher: New/Edit Assignment wizard (/teacher/assignments/new).
// 5-step wizard: Type → Target → Configure → Schedule → Review.
// T5 authority: 15-assignment-engine.html. Spec: SCREEN_SPECS §22.
// Q-39.7: title field in step 3. Q-39.8: toServerMode at SDK boundary.
// Q-39.9: ?edit=<id> path. Q-39.UI-3: topic chips display-only.
// Q-39.UI-4/5: v1-no-op fields disabled with tooltip.

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AppShell,
  Brand,
  Button,
  Card,
  Input,
  NavLink,
  Select,
  Sidebar,
  TextArea,
  Tooltip,
  TopBar,
} from '@mm/ui'
import {
  useMyClasses,
  usePathways,
  useInterventionAlerts,
  useGenerateAssignment,
  useAssignment,
  useCreateAssignment,
  useUpdateAssignment,
  usePublishAssignment,
} from '@mm/sdk'
import { ASSIGN_COPY as C } from '../../../../../copy/assignments'

// ── Types & constants ─────────────────────────────────────────────────────────

type AssignmentMode = 'practice' | 'diagnostic' | 'exam' | 'skill'
type TargetMode = 'class' | 'student' | 'atrisk' | 'custom'
type Difficulty = 'easy' | 'mixed' | 'hard'
type Step = 1 | 2 | 3 | 4 | 5

interface WizardState {
  step: Step
  mode: AssignmentMode | null
  targetMode: TargetMode
  targetStudentId: string | null
  draftSkillIds: string[]
  draftSkillNames: string[]
  title: string
  description: string
  itemCount: number
  difficulty: Difficulty
  timeLimitMs: number | null
  dueAt: string | null
}

// Q-39.8: maps wizard vocabulary to CreateAssignmentRequest.mode enum.
const toServerMode: Record<AssignmentMode, string> = {
  practice: 'practice',
  diagnostic: 'diagnostic',
  exam: 'exam',
  skill: 'skill_drill',
}

const difficultyRange: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 0, max: 0.35 },
  mixed: { min: 0, max: 1.0 },
  hard: { min: 0.7, max: 1.0 },
}

const INITIAL_STATE: WizardState = {
  step: 1,
  mode: null,
  targetMode: 'class',
  targetStudentId: null,
  draftSkillIds: [],
  draftSkillNames: [],
  title: '',
  description: '',
  itemCount: 10,
  difficulty: 'mixed',
  timeLimitMs: null,
  dueAt: null,
}

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

// ── Stepper ───────────────────────────────────────────────────────────────────

function StepperHeader({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1 mb-8 flex-wrap" aria-label="Wizard steps">
      {([...C.steps] as string[]).map((label, idx) => {
        const n = (idx + 1) as Step
        const isActive = n === current
        const isDone = n < current
        return (
          <div key={label} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : isDone
                      ? 'bg-[var(--correct-700)] text-white'
                      : 'bg-[var(--slate-200)] text-[var(--muted)]',
                ].join(' ')}
              >
                {isDone ? '✓' : n}
              </span>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {idx < C.steps.length - 1 && (
              <div className="h-px w-5 bg-[var(--border)] mx-1 flex-shrink-0" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Type ──────────────────────────────────────────────────────────────

function StepType({
  mode,
  onSelect,
}: {
  mode: AssignmentMode | null
  onSelect: (m: AssignmentMode) => void
}) {
  return (
    <section aria-labelledby="step-type-heading">
      <h2 id="step-type-heading" className="text-lg font-semibold text-[var(--text)] mb-1">
        {C.typeHeading}
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">{C.typeSubhead}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([...C.typeCards] as typeof C.typeCards[number][]).map((card) => {
          const isSelected = mode === card.key
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelect(card.key as AssignmentMode)}
              aria-pressed={isSelected}
              className={[
                'text-left rounded-card border p-4 transition-all focus-visible:outline-none focus-visible:shadow-focus',
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--brand-50)] shadow-elevated'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary-300)] hover:shadow-base',
              ].join(' ')}
            >
              <p className="text-sm font-semibold text-[var(--text)] mb-1">{card.name}</p>
              <p className="text-xs text-[var(--muted)] mb-3">{card.desc}</p>
              <p className="text-[11px] text-[var(--muted)]">
                <span className="font-medium">{C.bestFor}</span> {card.use}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ── Step 2: Target ────────────────────────────────────────────────────────────

const TARGET_OPTIONS: { value: TargetMode; label: string; phase2?: true }[] = [
  { value: 'class', label: C.targetModes.class },
  { value: 'student', label: C.targetModes.student },
  { value: 'atrisk', label: C.targetModes.atrisk },
  { value: 'custom', label: C.targetModes.custom, phase2: true },
]

function StepTarget({
  state,
  atRiskIds,
  onChange,
}: {
  state: WizardState
  atRiskIds: string[]
  onChange: (patch: Partial<WizardState>) => void
}) {
  return (
    <section aria-labelledby="step-target-heading">
      <h2 id="step-target-heading" className="text-lg font-semibold text-[var(--text)] mb-1">
        {C.targetHeading}
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">{C.targetSubhead}</p>

      {state.draftSkillNames.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-[var(--text)] mb-1">{C.autoSuggestTitle}</p>
          <p className="text-xs text-[var(--muted)] mb-2">{C.topicsCaption}</p>
          <div className="flex flex-wrap gap-1.5">
            {state.draftSkillNames.map((name) => (
              <span
                key={name}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--brand-50)] text-[var(--primary)] border border-[var(--brand-200)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div role="radiogroup" aria-label={C.assignToLabel} className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--muted)] mb-1">{C.assignToLabel}</p>
        {TARGET_OPTIONS.map((opt) => {
          const isDisabledAtrisk = opt.value === 'atrisk' && atRiskIds.length === 0
          const isDisabled = opt.phase2 === true || isDisabledAtrisk
          const isSelected = state.targetMode === opt.value

          const button = (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) onChange({ targetMode: opt.value })
              }}
              className={[
                'flex items-center gap-2.5 text-left w-full px-3 py-2.5 rounded-lg border transition-colors',
                'focus-visible:outline-none focus-visible:shadow-focus',
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--brand-50)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary-300)]',
                isDisabled ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors',
                  isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)] bg-[var(--field-bg)]',
                ].join(' ')}
              />
              <span className="text-sm text-[var(--text)]">{opt.label}</span>
            </button>
          )

          if (opt.phase2) {
            return (
              <Tooltip key={opt.value} content={C.customTargetTooltip}>
                <span className="block">{button}</span>
              </Tooltip>
            )
          }
          return <span key={opt.value} className="block">{button}</span>
        })}
      </div>

      {state.targetMode === 'atrisk' && atRiskIds.length === 0 && (
        <p className="mt-3 text-xs text-[var(--warn-700)] bg-[var(--warn-50)] px-3 py-2 rounded-lg border border-[var(--warn-100)]">
          {C.atRiskFallback}
        </p>
      )}
    </section>
  )
}

// ── Step 3: Configure ─────────────────────────────────────────────────────────

function StepConfigure({
  state,
  titleError,
  descError,
  onChange,
}: {
  state: WizardState
  titleError: string
  descError: string
  onChange: (patch: Partial<WizardState>) => void
}) {
  return (
    <section aria-labelledby="step-configure-heading">
      <h2 id="step-configure-heading" className="text-lg font-semibold text-[var(--text)] mb-1">
        {C.configHeading}
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">{C.configSubhead}</p>
      <div className="space-y-5">
        <div>
          <Input
            label={C.titleLabel}
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
            error={titleError || undefined}
            maxLength={100}
          />
          {!titleError && (
            <p className="mt-1 text-xs text-[var(--muted)]">{C.titleHint}</p>
          )}
        </div>

        <TextArea
          label={C.descLabel}
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={C.descPlaceholder}
          hint={C.descHint(state.description.length)}
          error={descError || undefined}
          maxLength={500}
          rows={3}
        />

        <Select
          label={C.qCountLabel}
          value={String(state.itemCount)}
          onValueChange={(v) => onChange({ itemCount: Number(v) })}
          options={([...C.qCounts] as number[]).map((n) => ({ value: String(n), label: String(n) }))}
        />

        <Select
          label={C.difficultyLabel}
          value={state.difficulty}
          onValueChange={(v) => onChange({ difficulty: v as Difficulty })}
          options={([...C.difficulties] as { value: string; label: string }[]).map((d) => ({ value: d.value, label: d.label }))}
        />

        <Select
          label={C.timeLimitLabel}
          value={state.timeLimitMs === null ? '0' : String(state.timeLimitMs / 60_000)}
          onValueChange={(v) =>
            onChange({ timeLimitMs: Number(v) === 0 ? null : Number(v) * 60_000 })
          }
          options={([...C.timeLimits] as { value: number; label: string }[]).map((t) => ({ value: String(t.value), label: t.label }))}
        />

        <Tooltip content={C.attemptsTooltip}>
          <span className="block">
            <Select
              label={C.attemptsLabel}
              value="unlimited"
              onValueChange={() => {}}
              options={[{ value: 'unlimited', label: C.unlimited }]}
              disabled
            />
          </span>
        </Tooltip>
      </div>
    </section>
  )
}

// ── Step 4: Schedule ──────────────────────────────────────────────────────────

function StepSchedule({
  state,
  dueDateError,
  onChange,
}: {
  state: WizardState
  dueDateError: string
  onChange: (patch: Partial<WizardState>) => void
}) {
  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <section aria-labelledby="step-schedule-heading">
      <h2 id="step-schedule-heading" className="text-lg font-semibold text-[var(--text)] mb-1">
        {C.scheduleHeading}
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">{C.scheduleSubhead}</p>
      <div className="space-y-5">
        <Tooltip content={C.startDateTooltip}>
          <span className="block">
            <Input
              label={C.startDateLabel}
              value=""
              onChange={() => {}}
              type="datetime-local"
              disabled
            />
          </span>
        </Tooltip>

        <Input
          label={C.dueDateLabel}
          value={state.dueAt ? state.dueAt.slice(0, 16) : ''}
          onChange={(e) =>
            onChange({
              dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
            })
          }
          type="datetime-local"
          min={minDate}
          error={dueDateError || undefined}
        />

        <Tooltip content={C.reminderTooltip}>
          <label className="flex items-center gap-2 opacity-50 cursor-not-allowed select-none">
            <input type="checkbox" disabled className="h-4 w-4 rounded" aria-disabled="true" />
            <span className="text-sm text-[var(--text)]">{C.reminderLabel}</span>
          </label>
        </Tooltip>
      </div>
    </section>
  )
}

// ── Step 5: Review ────────────────────────────────────────────────────────────

function StepReview({ state }: { state: WizardState }) {
  const rows: { label: string; value: string }[] = [
    { label: C.reviewRows.title, value: state.title },
    {
      label: C.reviewRows.type,
      value: ([...C.typeCards] as typeof C.typeCards[number][]).find((c) => c.key === state.mode)?.name ?? '',
    },
    {
      label: C.reviewRows.topics,
      value: state.draftSkillNames.length > 0 ? state.draftSkillNames.join(', ') : C.noTopics,
    },
    {
      label: C.reviewRows.assignTo,
      value: C.targetModes[state.targetMode],
    },
    { label: C.reviewRows.questions, value: C.questions(state.itemCount) },
    {
      label: C.reviewRows.difficulty,
      value: ([...C.difficulties] as { value: string; label: string }[]).find((d) => d.value === state.difficulty)?.label ?? '',
    },
    {
      label: C.reviewRows.timeLimit,
      value:
        state.timeLimitMs === null
          ? C.noLimit
          : C.minutes(state.timeLimitMs / 60_000),
    },
    { label: C.reviewRows.dueDate, value: C.due(state.dueAt) },
  ]

  return (
    <section aria-labelledby="step-review-heading">
      <h2 id="step-review-heading" className="text-lg font-semibold text-[var(--text)] mb-1">
        {C.reviewHeading}
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">{C.reviewSubhead}</p>
      <Card className="divide-y divide-[var(--border)] overflow-hidden">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center px-4 py-3 gap-4">
            <span className="text-sm text-[var(--muted)] flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-[var(--text)] text-right truncate">{value}</span>
          </div>
        ))}
      </Card>
    </section>
  )
}

// ── Success view ──────────────────────────────────────────────────────────────

function SuccessView({
  onViewAll,
  onCreateAnother,
}: {
  onViewAll: () => void
  onCreateAnother: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-[var(--correct-50)] flex items-center justify-center mb-4 border border-[var(--correct-100)]">
        <span className="text-lg font-bold text-[var(--correct-700)]">✓</span>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text)] mb-2">{C.successTitle}</h2>
      <p className="text-sm text-[var(--muted)] max-w-sm mb-8">{C.successDesc}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCreateAnother}>
          {C.createAnotherBtn}
        </Button>
        <Button variant="primary" onClick={onViewAll}>
          {C.viewAssignmentsBtn}
        </Button>
      </div>
    </div>
  )
}

// ── Wizard (inner — uses useSearchParams) ─────────────────────────────────────

function NewAssignmentWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit') ?? ''
  const targetStudentParam = searchParams.get('target_student') ?? ''

  const [state, setState] = useState<WizardState>({
    ...INITIAL_STATE,
    targetMode: targetStudentParam ? 'student' : 'class',
    targetStudentId: targetStudentParam || null,
  })
  const [titleError, setTitleError] = useState('')
  const [descError, setDescError] = useState('')
  const [dueDateError, setDueDateError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [published, setPublished] = useState(false)
  const generateFired = useRef(false)

  const { data: classesData } = useMyClasses()
  const classId = classesData?.classes[0]?.id ?? ''

  const { data: pathways } = usePathways()
  const pathwayId = pathways?.[0]?.id ?? ''

  const { data: alerts } = useInterventionAlerts(classId)
  const atRiskIds = (alerts ?? [])
    .filter((a) => a.status !== 'dismissed')
    .slice(0, 3)
    .map((a) => a.student_id)

  // Edit mode: load draft and pre-populate state once.
  const { data: editDraft, isSuccess: editLoaded } = useAssignment(editId)
  const editPrimed = useRef(false)
  useEffect(() => {
    if (!editLoaded || editPrimed.current || !editDraft) return
    editPrimed.current = true
    const modeKey =
      (Object.entries(toServerMode).find(([, v]) => v === editDraft.mode)?.[0] ??
        'practice') as AssignmentMode
    const diffKey = (() => {
      const r = editDraft.difficulty_range
      if (!r) return 'mixed' as Difficulty
      if (r.max <= 0.35) return 'easy' as Difficulty
      if (r.min >= 0.7) return 'hard' as Difficulty
      return 'mixed' as Difficulty
    })()
    setState((s) => ({
      ...s,
      mode: modeKey,
      title: editDraft.title,
      description: editDraft.description ?? '',
      itemCount: editDraft.item_count,
      timeLimitMs: editDraft.time_limit_ms,
      dueAt: editDraft.due_at,
      draftSkillIds: editDraft.target_skill_ids,
      draftSkillNames: editDraft.target_skill_names,
      difficulty: diffKey,
    }))
  }, [editLoaded, editDraft])

  const generateAssignment = useGenerateAssignment()
  const createAssignment = useCreateAssignment()
  const updateAssignment = useUpdateAssignment()
  const publishAssignment = usePublishAssignment()

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }))

  function canContinue(): boolean {
    if (state.step === 1) return state.mode !== null
    return true
  }

  function validateStep(): boolean {
    if (state.step === 1 && !state.mode) return false
    if (state.step === 3) {
      let ok = true
      if (state.title.length < 3 || state.title.length > 100) {
        setTitleError(C.titleError)
        ok = false
      } else {
        setTitleError('')
      }
      if (state.description.length > 500) {
        setDescError(C.descError)
        ok = false
      } else {
        setDescError('')
      }
      return ok
    }
    if (state.step === 4) {
      if (!state.dueAt || new Date(state.dueAt).getTime() < Date.now() + 60 * 60 * 1000) {
        setDueDateError(C.dueDateError)
        return false
      }
      setDueDateError('')
    }
    return true
  }

  function handleContinue() {
    if (!validateStep()) return

    // Fire generate silently at step 1 → 2 transition (Q-39.UI-3).
    if (state.step === 1 && !generateFired.current && state.mode) {
      generateFired.current = true
      generateAssignment.mutate(
        { classId, mode: toServerMode[state.mode] },
        {
          onSuccess: (draft) => {
            patch({
              draftSkillIds: draft.target_skill_ids,
              draftSkillNames: draft.target_skill_names,
              title: draft.title || state.title,
            })
          },
        },
      )
    }

    patch({ step: (state.step + 1) as Step })
  }

  function handleBack() {
    if (state.step > 1) patch({ step: (state.step - 1) as Step })
  }

  async function handlePublish() {
    if (!state.mode) return
    setSubmitError('')

    // Derive targets from targetMode; fall back to class if at-risk data absent.
    const effectiveMode =
      (state.targetMode === 'atrisk' && atRiskIds.length === 0) ||
      state.targetMode === 'custom'
        ? 'class'
        : state.targetMode

    let targets: { type: 'student' | 'class'; id: string }[]
    if (effectiveMode === 'class') {
      targets = [{ type: 'class', id: classId }]
    } else if (effectiveMode === 'student' && state.targetStudentId) {
      targets = [{ type: 'student', id: state.targetStudentId }]
    } else if (effectiveMode === 'atrisk') {
      targets = atRiskIds.map((id) => ({ type: 'student' as const, id }))
    } else {
      targets = [{ type: 'class', id: classId }]
    }

    const body = {
      title: state.title,
      description: state.description || undefined,
      mode: toServerMode[state.mode] as 'practice' | 'exam' | 'diagnostic' | 'skill_drill',
      pathway_id: pathwayId,
      target_skill_ids: state.draftSkillIds,
      difficulty_range: difficultyRange[state.difficulty],
      item_count: state.itemCount,
      time_limit_ms: state.timeLimitMs ?? undefined,
      due_at: state.dueAt ?? undefined,
      targets,
      auto_generated: generateFired.current,
    }

    try {
      let assignmentId: string

      if (editId) {
        // Q-39.9: update existing draft then publish.
        const updated = await updateAssignment.mutateAsync({ id: editId, body })
        assignmentId = updated.id
      } else {
        const created = await createAssignment.mutateAsync(body)
        assignmentId = created.id
      }

      // Publish is a separate transition per Stage 33 contract.
      await publishAssignment.mutateAsync(assignmentId)
      setPublished(true)
    } catch {
      setSubmitError(C.submitError)
    }
  }

  const isSubmitting =
    createAssignment.isPending || updateAssignment.isPending || publishAssignment.isPending

  if (published) {
    return (
      <AppShell variant="teacher">
        <div className="flex h-screen">
          <TeacherSidebarNav />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar>
              <h1 className="text-[15px] font-semibold text-[var(--text)]">{C.heading}</h1>
            </TopBar>
            <main className="flex-1 overflow-auto px-6 lg:px-8 py-6">
              <SuccessView
                onViewAll={() => router.push('/teacher/assignments')}
                onCreateAnother={() => {
                  generateFired.current = false
                  setPublished(false)
                  setState({
                    ...INITIAL_STATE,
                    targetMode: targetStudentParam ? 'student' : 'class',
                    targetStudentId: targetStudentParam || null,
                  })
                }}
              />
            </main>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell variant="teacher">
      <div className="flex h-screen">
        <TeacherSidebarNav />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar>
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[15px] font-semibold text-[var(--text)]">
                {editId ? C.editHeading : C.newBtn}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/teacher/assignments')}
              >
                {C.cancelBtn}
              </Button>
            </div>
          </TopBar>

          <main className="flex-1 overflow-auto px-6 lg:px-8 py-6">
            <div className="max-w-2xl mx-auto">
              <StepperHeader current={state.step} />

              {state.step === 1 && (
                <StepType mode={state.mode} onSelect={(m) => patch({ mode: m })} />
              )}
              {state.step === 2 && (
                <StepTarget state={state} atRiskIds={atRiskIds} onChange={patch} />
              )}
              {state.step === 3 && (
                <StepConfigure
                  state={state}
                  titleError={titleError}
                  descError={descError}
                  onChange={patch}
                />
              )}
              {state.step === 4 && (
                <StepSchedule state={state} dueDateError={dueDateError} onChange={patch} />
              )}
              {state.step === 5 && <StepReview state={state} />}

              {submitError && (
                <p role="alert" className="mt-4 text-sm text-[var(--error)]">
                  {submitError}
                </p>
              )}

              <div className="flex justify-between mt-8 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="ghost"
                  onClick={
                    state.step === 1
                      ? () => router.push('/teacher/assignments')
                      : handleBack
                  }
                >
                  {state.step === 1 ? C.cancelBtn : C.backBtn}
                </Button>

                {state.step < 5 ? (
                  <Button
                    variant="primary"
                    onClick={handleContinue}
                    disabled={!canContinue()}
                  >
                    {C.continueBtn}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => void handlePublish()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Publishing…' : C.publishBtn}
                  </Button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AppShell>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <Suspense>
      <NewAssignmentWizard />
    </Suspense>
  )
}
