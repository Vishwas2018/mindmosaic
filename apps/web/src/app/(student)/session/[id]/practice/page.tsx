'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppShell,
  Button,
  Card,
  ErrorState,
  FocusHeader,
  LoadingState,
  PageHeader,
  useToast,
} from '@mm/ui'
import {
  useSessionState,
  useRecordResponse,
  useSubmitSession,
} from '@mm/sdk'
import type { ItemDTO, RecordResponseResponse, SessionStateDTO } from '@mm/types'

// SCREEN_SPECS §10 — Practice. Shell: focus (less restriction than exam).
// FocusHeader lifted to @mm/ui (Stage 24 side-task — clears UI-DIVERGENCE (e)).

type ModalKind = 'version-conflict' | 'lock-expired' | 'session-abandoned' | null

interface FeedbackState {
  is_correct: boolean | null
  explanation: Record<string, unknown> | null
  next_item: ItemDTO | null
  termination: { reason: string; auto_submitted: boolean } | null
  version: number
}

function readPlainText(rec: Record<string, unknown> | null | undefined): string {
  if (rec === null || rec === undefined) return ''
  const value = rec['value']
  if (typeof value === 'string') return value
  const text = rec['text']
  if (typeof text === 'string') return text
  return ''
}

interface OptionChoice {
  value: string
  label: string
}

// Canonical MCQ option identity is the option STRING: manifest-format.md §3.2
// defines `correct_option_id` as the exact option string, and scoring
// (`computeCorrectness`) compares the submitted `option_id` to it. This
// renderer is TOLERANT of two on-the-wire shapes — it does NOT introduce a
// competing id-based contract:
//   - string option              → { value: opt, label: opt }
//   - object option { id, content } → { value: id, label: readPlainText(content) }
// `value` is what we submit as response_data.option_id; for the canonical
// string shape the value IS the string. (ISSUE-0090 — the object shape is the
// E2E seed's form; Phase A's discriminated response_data union locks this.)
function readOptions(config: Record<string, unknown>): OptionChoice[] {
  const options = config['options']
  if (!Array.isArray(options)) return []
  const out: OptionChoice[] = []
  for (const o of options) {
    if (typeof o === 'string') {
      out.push({ value: o, label: o })
    } else if (o !== null && typeof o === 'object') {
      const rec = o as Record<string, unknown>
      const id = rec['id']
      if (typeof id === 'string') {
        const content = rec['content']
        const label =
          content !== null && typeof content === 'object'
            ? readPlainText(content as Record<string, unknown>)
            : ''
        out.push({ value: id, label: label !== '' ? label : id })
      }
    }
  }
  return out
}

function StemBlock({ item }: { item: ItemDTO }) {
  const stemText = readPlainText(item.stem)
  const stimulusText =
    item.stimulus !== null ? readPlainText(item.stimulus.content) : ''
  return (
    <div className="space-y-3">
      {stimulusText !== '' && (
        <div className="rounded-card bg-[var(--slate-75)] p-4 text-sm text-[var(--text-2)]">
          {stimulusText}
        </div>
      )}
      <h1
        id="practice-question-heading"
        tabIndex={-1}
        className="text-xl font-semibold text-[var(--text)]"
      >
        {stemText !== '' ? stemText : 'Question'}
      </h1>
    </div>
  )
}

interface OptionsBlockProps {
  item: ItemDTO
  selected: string | null
  disabled: boolean
  onSelect: (choice: string) => void
}

function OptionsBlock({ item, selected, disabled, onSelect }: OptionsBlockProps) {
  const options = readOptions(item.response_config)
  if (options.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        This question type is not yet supported in v1 practice.
      </p>
    )
  }
  return (
    <div role="radiogroup" aria-labelledby="practice-question-heading" className="space-y-2">
      {options.map((option, idx) => {
        const checked = selected === option.value
        return (
          <label
            key={`${item.item_id}-${idx}`}
            className={
              'flex items-center gap-3 rounded-card border p-3 text-sm cursor-pointer transition-colors duration-fast ' +
              (checked
                ? 'border-[var(--primary)] bg-[var(--primary-50)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--slate-75)]')
            }
          >
            <input
              type="radio"
              name={`q-${item.item_id}`}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onSelect(option.value)}
              className="h-4 w-4 accent-[var(--primary)] focus-visible:outline-none focus-visible:shadow-focus"
            />
            <span className="text-[var(--text)]">{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

interface FeedbackPanelProps {
  feedback: FeedbackState
  onNext: () => void
  onWhy: () => void
  whyOpen: boolean
  whyHeadingRef: React.RefObject<HTMLHeadingElement>
}

function FeedbackPanel({
  feedback,
  onNext,
  onWhy,
  whyOpen,
  whyHeadingRef,
}: FeedbackPanelProps) {
  const correct = feedback.is_correct === true
  const incorrect = feedback.is_correct === false
  const explanationText = readPlainText(feedback.explanation)
  return (
    <Card aria-live="polite" className="border-l-4 border-l-[var(--primary)]">
      <p className="text-sm font-semibold text-[var(--text)]">
        {correct && 'Correct!'}
        {incorrect && 'Not quite.'}
        {feedback.is_correct === null && 'Skipped.'}
      </p>
      {explanationText !== '' && !whyOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onWhy}>
            Why this answer?
          </Button>
        </div>
      )}
      {whyOpen && explanationText !== '' && (
        <div className="mt-3 rounded-card bg-[var(--slate-75)] p-3">
          <h2
            ref={whyHeadingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-[var(--text)]"
          >
            Explanation
          </h2>
          <p className="mt-2 text-sm text-[var(--text-2)]">{explanationText}</p>
        </div>
      )}
      <div className="mt-4">
        <Button variant="primary" size="md" onClick={onNext}>
          {feedback.next_item !== null ? 'Next question' : 'See results'}
        </Button>
      </div>
    </Card>
  )
}

interface ModalProps {
  title: string
  description: string
  primaryLabel: string
  onPrimary: () => void
}

function Modal({ title, description, primaryLabel, onPrimary }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <Card className="max-w-md w-full">
        <h2 id="practice-modal-title" className="text-base font-semibold text-[var(--text)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function PracticePage({
  params,
}: {
  params: { id: string }
}) {
  const { id: sessionId } = params
  const router = useRouter()
  const toast = useToast()

  const sessionState = useSessionState(sessionId)
  const { updateLockToken: seedRespondLockToken, ...recordResponse } =
    useRecordResponse(sessionId)
  const submitSession = useSubmitSession(sessionId)

  // Local working item — initialised from the session-state fetch, then
  // replaced on each respond by the server's `next_item`.
  const [currentItem, setCurrentItem] = useState<ItemDTO | null>(null)
  const [version, setVersion] = useState<number>(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const sessionStartRef = useRef<number>(Date.now())
  const itemStartRef = useRef<number>(Date.now())
  const itemsAnsweredRef = useRef<number>(0)
  const whyHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (sessionState.data && currentItem === null) {
      const state: SessionStateDTO = sessionState.data
      setCurrentItem(state.current_item)
      setVersion(state.version)
      itemStartRef.current = Date.now()
    }
  }, [sessionState.data, currentItem])

  // ADR-0026: seed / re-seed the respond lock_token whenever session state
  // arrives or refreshes. The exam page already does this (ISSUE-0090 sibling
  // miss): without it the first /respond sends an unseeded X-Session-Lock and
  // the server returns 409 LOCK_CONFLICT — surfacing as the version-conflict
  // modal and no score. Practice respond was never E2E-exercised before the
  // option-render fix, which is why this stayed hidden.
  useEffect(() => {
    if (sessionState.data) {
      seedRespondLockToken(sessionState.data.lock_token)
    }
  }, [sessionState.data, seedRespondLockToken])

  useEffect(() => {
    if (whyOpen && whyHeadingRef.current !== null) {
      whyHeadingRef.current.focus()
    }
  }, [whyOpen])

  function handleSubmitResponse(opts: { skip: boolean }) {
    if (currentItem === null) return
    const now = Date.now()
    recordResponse.mutate(
      {
        item_id: currentItem.item_id,
        response_data: opts.skip ? {} : { option_id: selected },
        telemetry: {
          time_to_answer_ms: Math.max(0, now - itemStartRef.current),
          time_to_first_action_ms: Math.max(0, now - itemStartRef.current),
          answer_changes: 0,
          items_since_session_start: itemsAnsweredRef.current,
          time_since_session_start_ms: Math.max(0, now - sessionStartRef.current),
          skipped_then_returned: false,
          scroll_to_bottom: null,
        },
        expected_version: version,
      },
      {
        onSuccess: (response: RecordResponseResponse) => {
          setFeedback({
            is_correct: opts.skip ? null : response.is_correct,
            explanation: response.explanation,
            next_item: response.next_item,
            termination: response.termination,
            version: response.version,
          })
          setVersion(response.version)
          itemsAnsweredRef.current += 1
        },
        onError: (err) => {
          // SDK currently surfaces APIError with status only when envelope
          // schema fails to parse (CONFLICT / LOCK_CONFLICT codes are not
          // in @mm/types ErrorCodeSchema, so we get status=409 +
          // code='INTERNAL_ERROR'). Branch on status until the error-code
          // surface is reconciled (tracked separately for follow-up).
          const apiErr = err as { status?: number; code?: string; message?: string }
          if (apiErr.status === 409) {
            // Best-effort discrimination: lock_token rotation isn't yet
            // plumbed through useRecordResponse, so any 409 in v1 is most
            // likely either VERSION_CONFLICT (refetch state) or
            // LOCK_CONFLICT (reclaim). Treat both as "refetch state" via
            // the version-conflict modal — the next call will succeed.
            setModal('version-conflict')
            return
          }
          if (apiErr.status === 410) {
            setModal('session-abandoned')
            return
          }
          toast.addToast({
            title: 'Could not save your answer',
            description: 'Please try again.',
            variant: 'error',
          })
        },
      },
    )
  }

  function handleNext() {
    if (feedback === null) return
    if (feedback.termination !== null || feedback.next_item === null) {
      // Auto-terminated by the engine (or no more items) — call /submit.
      handleEndSession()
      return
    }
    setCurrentItem(feedback.next_item)
    setVersion(feedback.version)
    setSelected(null)
    setFeedback(null)
    setWhyOpen(false)
    itemStartRef.current = Date.now()
  }

  function handleEndSession() {
    submitSession.mutate(undefined, {
      onSuccess: (response) => {
        router.push(`/results/${response.session_id}`)
      },
      onError: () => {
        toast.addToast({
          title: 'Could not end session',
          description: 'Please try again.',
          variant: 'error',
        })
      },
    })
  }

  if (sessionState.isPending) {
    return (
      <AppShell variant="focus">
        <FocusHeader onExit={() => router.push('/dashboard')} />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <LoadingState />
        </main>
      </AppShell>
    )
  }

  if (sessionState.isError) {
    return (
      <AppShell variant="focus">
        <FocusHeader onExit={() => router.push('/dashboard')} />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <ErrorState
            title="Could not load session"
            description="Something went wrong fetching this practice session."
            onRetry={() => void sessionState.refetch()}
          />
        </main>
      </AppShell>
    )
  }
  if (currentItem === null) {
    return (
      <AppShell variant="focus">
        <FocusHeader onExit={() => router.push('/dashboard')} />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <Card>
            <PageHeader
              title="Could not load session"
              subtitle="Something went wrong fetching this practice session."
              action={
                <Button variant="secondary" onClick={() => void sessionState.refetch()}>
                  Try again
                </Button>
              }
            />
          </Card>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell variant="focus">
      <FocusHeader onExit={() => router.push('/dashboard')} />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="text-xs text-[var(--muted)]">
          Question {(sessionState.data?.progress.answered ?? 0) + 1}
          {sessionState.data?.progress.total !== null
            ? ` of ${sessionState.data?.progress.total}`
            : ''}
        </div>

        <Card>
          <StemBlock item={currentItem} />
          <div className="mt-6">
            <OptionsBlock
              item={currentItem}
              selected={selected}
              disabled={feedback !== null || recordResponse.isPending}
              onSelect={setSelected}
            />
          </div>
          {feedback === null && (
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => handleSubmitResponse({ skip: true })}
                disabled={recordResponse.isPending}
              >
                Skip
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmitResponse({ skip: false })}
                disabled={selected === null || recordResponse.isPending}
                loading={recordResponse.isPending}
              >
                Submit answer
              </Button>
            </div>
          )}
        </Card>

        {feedback !== null && (
          <FeedbackPanel
            feedback={feedback}
            onNext={handleNext}
            onWhy={() => setWhyOpen(true)}
            whyOpen={whyOpen}
            whyHeadingRef={whyHeadingRef}
          />
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndSession}
            loading={submitSession.isPending}
          >
            End session
          </Button>
        </div>
      </main>

      {modal === 'version-conflict' && (
        <Modal
          title="Your session was updated"
          description="We need to refresh this question before you continue."
          primaryLabel="Refresh"
          onPrimary={() => {
            setModal(null)
            void sessionState.refetch()
            setCurrentItem(null) // re-init from refetched state
            setSelected(null)
            setFeedback(null)
          }}
        />
      )}
      {modal === 'lock-expired' && (
        <Modal
          title="Your session lock expired"
          description="Click below to reclaim and continue."
          primaryLabel="Reclaim"
          onPrimary={() => {
            setModal(null)
            void sessionState.refetch()
            setCurrentItem(null)
          }}
        />
      )}
      {modal === 'session-abandoned' && (
        <Modal
          title="This session has ended"
          description="It was ended on another device or has been abandoned."
          primaryLabel="Back to selection"
          onPrimary={() => router.push('/session-selection')}
        />
      )}
    </AppShell>
  )
}
