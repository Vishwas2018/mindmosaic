# MindMosaic — Day 15 Summary

## Objective
Integrated existing frontend with exam runtime backend. Students can now discover exams, start/resume attempts, answer questions with autosave, submit, and review responses.

## What Was Implemented

### Phase 1: Infrastructure Wiring

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Shared Supabase client with Edge Function helper |
| `src/lib/database.types.ts` | TypeScript types mirroring Supabase schema |
| `src/context/AuthContext.tsx` | Real Supabase auth session management |
| `src/guards/AuthGuard.tsx` | Protects routes requiring authentication |
| `src/guards/RoleGuard.tsx` | Protects routes based on user role |

### Phase 2: Student Routing

Routes added to `src/app/router.tsx`:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/student/exams` | `ExamListPage` | Exam discovery (package-centric) |
| `/student/exams/:packageId` | `ExamDetailPage` | Exam detail and start |
| `/student/attempts/:attemptId` | `ExamAttemptPage` | Exam taking (attempt-centric) |
| `/student/attempts/:attemptId/review` | `ExamReviewPage` | Read-only review |

### Phase 3: Exam Discovery

| File | Purpose |
|------|---------|
| `src/app/pages/student/ExamList.tsx` | Lists published exams grouped by year level |
| `src/app/pages/student/ExamDetail.tsx` | Shows exam metadata, checks for existing attempt, start/resume buttons |

### Phase 4: Exam Runtime

| File | Purpose |
|------|---------|
| `src/app/pages/student/ExamAttempt.tsx` | Main exam-taking interface |
| `src/features/exam/hooks/useExamAttempt.ts` | State management for attempt |
| `src/features/exam/hooks/useAutosave.ts` | Debounced autosave with race condition prevention |

**Question Components:**

| Component | Response Type |
|-----------|---------------|
| `McqQuestion.tsx` | Single-choice MCQ |
| `MultiSelectQuestion.tsx` | Multiple-choice (select all that apply) |
| `TrueFalseQuestion.tsx` | True/False (simplified MCQ) |
| `ShortAnswerQuestion.tsx` | Short text input |
| `NumericQuestion.tsx` | Numeric input with optional unit |
| `ExtendedQuestion.tsx` | Long-form text area with word count |

**Supporting Components:**

| Component | Purpose |
|-----------|---------|
| `QuestionRenderer.tsx` | Routes to appropriate question component |
| `PromptBlockRenderer.tsx` | Renders structured prompt blocks |
| `ImageBlock.tsx` | Renders media assets |
| `ExamTimer.tsx` | Countdown timer (mandatory for Years 3-9) |
| `ExamProgress.tsx` | Progress bar and question grid |
| `ExamNavigation.tsx` | Previous/Next/Submit buttons |

### Phase 5: Submit & Review

| File | Purpose |
|------|---------|
| `src/app/pages/student/ExamReview.tsx` | Read-only view of submitted responses |
| `SubmitConfirmModal` | Confirmation before submission |

## Key Decisions

### Real Auth (No Placeholders)
- `AuthContext` uses actual Supabase session
- `AuthGuard` checks `supabase.auth.getSession()`
- `RoleGuard` reads role from `profiles` table
- No hardcoded roles or fake users

### Attempt-Centric Routing
- Discovery is package-centric (`/exams/:packageId`)
- Runtime is attempt-centric (`/attempts/:attemptId`)
- This matches the backend model where attempts are the unit of work

### Autosave Strategy
- 500ms debounce prevents excessive requests
- Request cancellation prevents race conditions
- Visual indicator shows save status
- `beforeunload` warning prevents accidental data loss

### Timer Implementation
- Derived from `attempt.started_at` + `exam.duration_minutes`
- No auto-submit in frontend (server handles)
- Visual warnings at 5 minutes and 1 minute remaining
- Timer visible for Years 3-9 only

### Security
- No correct answers exposed in frontend
- Review page only shows student's responses
- All access controlled by RLS policies
- Edge Functions enforce business logic

## Files Created

```
src/
├── lib/
│   ├── supabase.ts
│   └── database.types.ts
├── context/
│   └── AuthContext.tsx
├── guards/
│   ├── AuthGuard.tsx
│   └── RoleGuard.tsx
├── features/
│   └── exam/
│       ├── types/
│       │   └── exam.types.ts
│       ├── hooks/
│       │   ├── index.ts
│       │   ├── useExamAttempt.ts
│       │   └── useAutosave.ts
│       └── components/
│           ├── index.ts
│           ├── QuestionRenderer.tsx
│           ├── PromptBlockRenderer.tsx
│           ├── McqQuestion.tsx
│           ├── MultiSelectQuestion.tsx
│           ├── TrueFalseQuestion.tsx
│           ├── ShortAnswerQuestion.tsx
│           ├── NumericQuestion.tsx
│           ├── ExtendedQuestion.tsx
│           ├── ImageBlock.tsx
│           ├── ExamTimer.tsx
│           ├── ExamProgress.tsx
│           └── ExamNavigation.tsx
├── app/
│   ├── router.tsx
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   ├── StudentLayout.tsx
│   │   ├── ParentLayout.tsx
│   │   └── AdminLayout.tsx
│   └── pages/
│       ├── auth/
│       │   ├── Login.tsx
│       │   └── Signup.tsx
│       ├── student/
│       │   ├── index.ts
│       │   ├── Dashboard.tsx
│       │   ├── ExamList.tsx
│       │   ├── ExamDetail.tsx
│       │   ├── ExamAttempt.tsx
│       │   └── ExamReview.tsx
│       ├── parent/
│       │   └── Dashboard.tsx
│       └── admin/
│           └── Dashboard.tsx
└── main.tsx
```

## Edge Functions Used

| Function | Called From | Purpose |
|----------|-------------|---------|
| `start-attempt` | `ExamDetailPage` | Create new attempt |
| `save-response` | `useAutosave` | Persist student responses |
| `submit-attempt` | `ExamAttemptPage` | Mark attempt as submitted |

## Exit Criteria ✅

- [x] Student can discover exams
- [x] Student can start or resume an attempt
- [x] Student can answer questions (MCQ, multi, short, numeric, extended)
- [x] Responses autosave with debouncing
- [x] Student can submit attempt
- [x] Student can review submitted responses
- [x] Timer visible for Years 3-9
- [x] No backend changes required
- [x] No UI redesign
- [x] All flows respect RLS

## Explicit Non-Goals (Deferred)

- Parent dashboards
- Teacher workflows
- Writing module
- Integrity event logging
- Advanced analytics
- New question types beyond Phase 1

## Next Steps (Day 16+)

1. **Scoring display** — Show results when attempt is evaluated
2. **Progress tracking** — Student dashboard with attempt history
3. **Parent view** — Parents can view linked student progress
4. **Admin tools** — Exam management interface
5. **Timer auto-submit** — Server-side timeout handling
