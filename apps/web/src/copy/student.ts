// Microcopy for student-facing screens (Stage 40).
// Screen 13 (Assignments) + Screen 7 Dashboard v2.
// MODE_ICON_MAP: mode → Lucide icon component (Q-40.UI-5).

import {
  Pencil,
  ClipboardList,
  Clock,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

// Single consumer in v1 — extract to shared location when a second consumer appears.
export const MODE_ICON_MAP: Record<string, LucideIcon> = {
  practice: Pencil,
  diagnostic: ClipboardList,
  exam: Clock,
  skill_drill: ClipboardList,
}

export function getModeIcon(mode: string): LucideIcon {
  return MODE_ICON_MAP[mode] ?? HelpCircle
}

export const STUDENT_COPY = {
  // ── Assignments page (Screen 13) ────────────────────────────────────────────
  assignmentsHeading: 'My Assignments',
  tabs: {
    assigned: 'Assigned',
    inProgress: 'In Progress',
    completed: 'Completed',
  },
  overdueBanner: (n: number) =>
    `You have ${n} overdue assignment${n === 1 ? '' : 's'} — please complete ${n === 1 ? 'it' : 'them'} as soon as possible.`,
  overdueLabel: 'Overdue',
  dueSoonLabel: 'Due Soon',
  dueSoonDays: (n: number) => `${n} day${n === 1 ? '' : 's'} left`,
  wasDue: (iso: string) =>
    `Was due ${new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`,
  dueDate: (iso: string) =>
    `Due ${new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  startBtn: 'Start',
  continueBtn: 'Continue',
  reviewBtn: 'Review',
  emptyAssigned: 'No assignments yet',
  emptyAssignedDesc: "You're all caught up — check back later.",
  emptyInProgress: 'Nothing in progress',
  emptyInProgressDesc: 'Start an assignment from the Assigned tab.',
  emptyCompleted: 'No completed assignments',
  emptyCompletedDesc: 'Completed assignments will appear here.',
  loadError: 'Failed to load assignments.',
  scoreLabel: (pct: number) => `${Math.round(pct * 100)}%`,
  questions: (n: number) => `${n} questions`,
  duration: (min: number) => `~${min} min`,

  // ── Dashboard v2 (Screen 7) ────────────────────────────────────────────────
  dashboardSubheading: "Here's what's next in your learning journey.",
  kpi: {
    sessionsLabel: 'Sessions this week',
    masteryLabel: 'Overall mastery',
    weeklyProgressLabel: 'Weekly progress',
    lastScoreLabel: 'Last score',
  },
  planHeading: 'This Week\'s Learning Plan',
  planStalePill: 'Plan may be outdated',
  planStartBtn: 'Start',
  planNoItems: 'No plan items this week — complete a session to generate your plan.',
  insightsHeading: 'Quick Insights',
  insightsEmpty: 'No insights yet — keep practising!',
  masteryHeading: 'Mastery Snapshot',
  masteryEmpty: 'No mastery data yet.',
  assessmentShortcutsHeading: 'Assessment shortcuts',
  assessmentShortcuts: [
    { label: 'Diagnostic', mode: 'diagnostic' as const },
    { label: 'Practice', mode: 'practice' as const },
    { label: 'Mock Exam', mode: 'exam' as const },
  ],

  // ── Shared ───────────────────────────────────────────────────────────────────
  nav: {
    dashboard: 'Dashboard',
    assignments: 'Assignments',
    results: 'Results',
  },
  modeLabel: (mode: string): string =>
    mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
} as const
