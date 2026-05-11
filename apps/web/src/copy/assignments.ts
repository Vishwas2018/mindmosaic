// Microcopy for Screen 22 — Assignment Engine (Stage 39).
// Type-card copy: verbatim from 15-assignment-engine.html (T5 visual authority, lines 314-329).
// All other strings: product copy aligned to spec §14 + SCREEN_SPECS §22.
// PHASE-2 fields: "Available in a future release" per Q-39.UI-4/5 pattern.

export const ASSIGN_COPY = {
  // ── List page ───────────────────────────────────────────────────────────────
  heading: 'Assignments',
  newBtn: 'New Assignment',
  tabs: {
    published: 'Active',
    draft: 'Upcoming',
    archived: 'Completed',
  },
  emptyTitle: (tab: string) => `No ${tab.toLowerCase()} assignments`,
  emptyDesc: 'Create an assignment using the New Assignment button.',
  loadError: 'Failed to load assignments.',
  editBtn: 'Edit',
  trackBtn: 'Track',

  // ── Wizard navigation ────────────────────────────────────────────────────────
  steps: ['Type', 'Target', 'Configure', 'Schedule', 'Review'] as const,
  cancelBtn: 'Cancel',
  backBtn: 'Back',
  continueBtn: 'Continue',
  publishBtn: 'Publish Assignment',
  editHeading: 'Edit Assignment',

  // ── Step 1: Type ─────────────────────────────────────────────────────────────
  typeHeading: 'Select Assignment Type',
  typeSubhead: 'Choose the format that best suits your learning objective.',
  typeCards: [
    {
      key: 'practice' as const,
      name: 'Practice',
      desc: 'Targeted skill drills for reinforcement and mastery building.',
      use: 'Daily or weekly skill practice',
    },
    {
      key: 'diagnostic' as const,
      name: 'Diagnostic',
      desc: 'Broad assessment to identify strengths and gaps across topics.',
      use: 'Start of term or after a teaching unit',
    },
    {
      key: 'exam' as const,
      name: 'Exam',
      desc: 'Timed, formal assessment simulating real test conditions.',
      use: 'NAPLAN preparation or end-of-unit tests',
    },
    {
      key: 'skill' as const,
      name: 'Skill-based',
      desc: 'Focused drill on a specific weak area identified by analytics.',
      use: 'Targeted intervention for struggling students',
    },
  ],
  bestFor: 'Best for:',

  // ── Step 2: Target ───────────────────────────────────────────────────────────
  targetHeading: 'Select Target',
  targetSubhead: 'Choose what to assess and who should complete it.',
  topicsLabel: 'Topics',
  topicsCaption: 'Suggestions only — auto-generated based on class analytics.',
  autoSuggestTitle: 'Suggested Focus',
  assignToLabel: 'Assign To',
  targetModes: {
    class: 'Entire Class',
    student: 'Selected Student',
    atrisk: 'At-Risk Students',
    custom: 'Custom Selection',
  },
  atRiskFallback: 'Defaulting to entire class — no at-risk data available.',
  customTargetTooltip: 'Custom student selection available in a future release.',

  // ── Step 3: Configure ────────────────────────────────────────────────────────
  configHeading: 'Configuration',
  configSubhead: 'Set the parameters for this assignment.',
  titleLabel: 'Assignment Title',
  titlePlaceholder: 'e.g. Fractions Practice',
  titleHint: '3–100 characters',
  titleError: 'Title must be between 3 and 100 characters.',
  descLabel: 'Instructions',
  descPlaceholder: 'Optional instructions for students…',
  descHint: (len: number) => `${len}/500`,
  descError: 'Instructions must be 500 characters or less.',
  qCountLabel: 'Number of Questions',
  difficultyLabel: 'Difficulty',
  timeLimitLabel: 'Time Limit (minutes)',
  attemptsLabel: 'Attempts Allowed',
  attemptsTooltip: 'Available in a future release',
  difficulties: [
    { value: 'easy', label: 'Easy' },
    { value: 'mixed', label: 'Mixed (Recommended)' },
    { value: 'hard', label: 'Hard' },
  ],
  qCounts: [10, 15, 20, 25],
  timeLimits: [
    { value: 0, label: 'No limit' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 20, label: '20 min' },
    { value: 30, label: '30 min' },
    { value: 40, label: '40 min' },
  ],

  // ── Step 4: Schedule ─────────────────────────────────────────────────────────
  scheduleHeading: 'Schedule',
  scheduleSubhead: 'Set when this assignment becomes available and when it is due.',
  startDateLabel: 'Start Date',
  startDateTooltip: 'Available in a future release',
  dueDateLabel: 'Due Date',
  reminderLabel: 'Send reminders to students who have not started 2 days before the due date',
  reminderTooltip: 'Available in a future release',

  // ── Step 5: Review ───────────────────────────────────────────────────────────
  reviewHeading: 'Review Assignment',
  reviewSubhead: 'Confirm the details before publishing.',
  reviewRows: {
    title: 'Title',
    type: 'Type',
    topics: 'Topics',
    assignTo: 'Assign To',
    questions: 'Questions',
    difficulty: 'Difficulty',
    timeLimit: 'Time Limit',
    dueDate: 'Due Date',
  },

  // ── Tracking page ────────────────────────────────────────────────────────────
  trackHeading: 'Student Progress',
  trackCols: { student: 'Student', status: 'Status', score: 'Score' },
  trackStats: {
    completed: 'Completed',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
  },
  trackBack: '← Back to Assignments',
  loadTrackError: 'Failed to load tracking data.',

  // ── Success view ─────────────────────────────────────────────────────────────
  successTitle: 'Assignment Published',
  successDesc:
    'Your assignment has been created and assigned to the selected students. They will see it in their Learning Hub.',
  viewAssignmentsBtn: 'View Assignments',
  createAnotherBtn: 'Create Another',

  // ── Archive dialog (tracking page) ───────────────────────────────────────────
  archiveDialogTitle: 'Archive Assignment',
  archiveDialogDesc:
    'This assignment will be archived. Students can no longer complete it, and it will move to the Completed tab.',
  archiveConfirmBtn: 'Archive',
  archiveCancelBtn: 'Cancel',
  archiveBtn: 'Archive Assignment',

  // ── Validation errors ─────────────────────────────────────────────────────────
  selectTypeError: 'Please select an assignment type.',
  dueDateError: 'Please select a due date at least 1 hour from now.',
  submitError: 'Something went wrong. Please try again.',

  // ── Shared ───────────────────────────────────────────────────────────────────
  phase2Tooltip: 'Available in a future release',
  noTopics: 'None selected',
  noLimit: 'No limit',
  unlimited: 'Unlimited',
  questions: (n: number) => `${n} questions`,
  minutes: (n: number) => `${n} min`,
  due: (iso: string | null): string =>
    iso
      ? new Date(iso).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—',
  modeLabel: (mode: string): string =>
    mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
} as const
