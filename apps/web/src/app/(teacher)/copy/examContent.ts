// Copy strings for /teacher/content and /teacher/content/new (v1.1-S4, ADR-0038).
// All user-visible text centralised here per teacher-shell copy convention.

export const EXAM_CONTENT_COPY = {
  // ── Bank browser (/teacher/content) ─────────────────────────────────────────
  pageTitle: 'Exam Content',
  heading: 'Question Bank',
  newExamBtn: 'New Exam Assignment',
  loadingLabel: 'Loading pathways',
  loadErrorTitle: 'Failed to load pathways',
  loadError: 'Failed to load pathways. Please try again.',
  emptyTitle: 'No pathways available',
  emptyDesc: 'Contact your administrator to have content added to your account.',
  upgradeTitle: 'Upgrade required',
  upgradeDesc: 'This pathway requires a Standard or Premium subscription.',

  // ── Bank browser row ─────────────────────────────────────────────────────────
  itemCountLabel: (n: number) => (n === 1 ? '1 item' : `${n} items`),
  selectPathwayAriaLabel: (name: string) => `Select pathway ${name}`,

  // ── Composer form (/teacher/content/new) ─────────────────────────────────────
  formPageTitle: 'New Exam Assignment',
  breadcrumbBack: 'Back',

  // Section labels
  sectionBankPick: 'Bank Pick',
  sectionConfigure: 'Configure',
  sectionAssign: 'Assign',

  // Bank Pick fields
  pathwayLabel: 'Pathway',
  pathwayPlaceholder: 'Select a pathway',
  pathwayAriaLabel: 'Select question bank pathway',

  // Configure fields
  itemCountFieldLabel: 'Number of items',
  itemCountHint: 'Between 5 and 80',
  diffDistLabel: 'Difficulty distribution',
  diffEasyLabel: 'Easy',
  diffMidLabel: 'Medium',
  diffHardLabel: 'Hard',
  diffSumHint: (sum: number, target: number) =>
    `${sum} of ${target} items allocated`,
  diffSumError: (target: number) =>
    `Easy + Medium + Hard must sum to ${target}`,
  timeLimitLabel: 'Time limit (minutes)',
  timeLimitHint: 'Between 5 and 180 minutes',
  simulationLabel: 'Simulation mode',
  simulationDesc:
    'Students cannot go back or see feedback until submission (exam conditions)',
  simulationAriaLabel: 'Enable simulation exam mode',

  // Assign fields
  classLabel: 'Class',
  classPlaceholder: 'Select a class',
  classAriaLabel: 'Select target class',
  dueDateLabel: 'Due date (optional)',
  dueDateAriaLabel: 'Assignment due date',

  // Submit states
  submitBtn: 'Create Assignment',
  submittingLabel: 'Creating…',
  successTitle: 'Assignment created',
  successDesc: 'The exam assignment has been saved as a draft.',
  viewAssignmentsBtn: 'View Assignments',
  submitError: 'Failed to create assignment. Please try again.',

  // Validation
  pathwayRequired: 'Please select a pathway',
  classRequired: 'Please select a class',
  itemCountMin: 'Minimum 5 items',
  itemCountMax: 'Maximum 80 items',
  timeLimitMin: 'Minimum 5 minutes',
  timeLimitMax: 'Maximum 180 minutes',
} as const;
