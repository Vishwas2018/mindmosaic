# Day 20: Exam Publishing & Scheduling

## Overview

Day 20 introduces controlled exam lifecycle management and scheduling, transforming MindMosaic from an authorable platform into an operationally usable system.

### What Day 20 Adds

**Exam Lifecycle States:**

- `draft` — Editable by admins, hidden from students
- `published` — Read-only, visible to students
- `archived` — Hidden from all, preserved for reporting

**Scheduling:**

- `available_from` — When exam becomes accessible
- `available_until` — When exam closes for new attempts

**Admin Controls:**

- Publish/unpublish exams
- Set availability windows
- Archive exams
- Clear confirmation prompts

**Student Enforcement:**

- Only see published exams
- Only see exams within availability window
- Cannot start attempts outside window
- Can still review submitted attempts after window closes

## File Structure

```
features/
├── exams/
│   ├── types/
│   │   └── exam-publishing.types.ts      # Lifecycle & scheduling types
│   ├── hooks/
│   │   └── useExamPublishing.ts          # Publishing operations
│   ├── components/
│   │   └── ExamPublishControls.tsx       # Admin UI controls
│   └── utils/
│       └── examVisibility.ts             # Student visibility filtering

app/
├── pages/admin/exams/
│   └── ExamPublish.tsx                   # Publishing management page
├── routes/
│   └── day20-routes.tsx                  # Route configuration
└── examples/
    └── StudentExamListExample.tsx        # Example integration
```

## Core Concepts

### Lifecycle Rules

**Draft → Published:**

- Admin clicks "Publish" or "Schedule Publish"
- Optionally sets availability window
- Exam becomes read-only
- Becomes visible to students (within window)

**Published → Draft (Unpublish):**

- Only allowed if NO student attempts exist
- Clears availability window
- Returns to editable state
- Hidden from students

**Published → Archived:**

- Allowed even with student attempts
- Permanently hidden from students
- Cannot be edited
- Data preserved for reporting

**Archived → Never Changes:**

- Final state
- Cannot be unarchived
- Create new exam version if needed

### Availability Windows

**No Window Set:**

- Exam available immediately after publish
- Remains available indefinitely
- Students can start attempts anytime

**With `available_from` Only:**

- Exam not visible until date/time
- Then available indefinitely

**With `available_until` Only:**

- Exam available immediately
- Closes at date/time

**With Both:**

- Exam available only within window
- Before window: "Opens on [date]"
- After window: "Closed on [date]"

**Important:**

- Students can still review submitted attempts after window closes
- New attempts are blocked, not review access

## API Reference

### useExamPublishing()

```typescript
const {
  isUpdating,
  updateError,
  publishExam,
  unpublishExam,
  archiveExam,
  checkVisibility,
} = useExamPublishing();

// Publish exam
await publishExam(
  packageId,
  "2026-03-01T09:00:00", // available_from (optional)
  "2026-03-31T23:59:59", // available_until (optional)
);

// Unpublish (only if no attempts)
await unpublishExam(packageId);

// Archive
await archiveExam(packageId);

// Check visibility rules
const rules = checkVisibility(exam, isAdmin);
// Returns: { isEditable, isVisibleToStudents, canStartAttempt, reason? }
```

### Visibility Utilities

```typescript
import {
  filterVisibleExams,
  canStartAttempt,
  getAvailabilityStatus,
} from "@/features/exams";

// Filter exams for student list
const visibleExams = filterVisibleExams(allExams);

// Check if student can start attempt
const { allowed, reason } = canStartAttempt(exam);
if (!allowed) {
  console.log("Blocked:", reason);
}

// Get status for display
const { status, message } = getAvailabilityStatus(exam);
// status: "upcoming" | "open" | "closed" | "draft" | "archived"
```

## Integration Guide

### Step 1: Add Route

In your router configuration:

```tsx
import { ExamPublishPage } from "@/app/pages/admin/exams/ExamPublish";

<Route element={<AdminLayout />}>
  <Route element={<RoleGuard allowed={["admin"]} />}>
    <Route path="/admin/exams/:id/publish" element={<ExamPublishPage />} />
  </Route>
</Route>;
```

### Step 2: Add Link to Exam List

In your admin exam list, add "Publish" link:

```tsx
<Link
  to={`/admin/exams/${exam.id}/publish`}
  className="text-sm text-primary-blue hover:underline"
>
  Manage Publishing
</Link>
```

### Step 3: Update Student Exam List

Apply visibility filtering:

```tsx
import { filterVisibleExams } from "@/features/exams";

const loadExams = async () => {
  const { data } = await supabase.from("exam_packages").select("*");

  // Apply Day 20 filtering
  const visibleExams = filterVisibleExams(data || []);
  setExams(visibleExams);
};
```

### Step 4: Block Attempt Creation

In your exam start handler:

```tsx
import { canStartAttempt } from "@/features/exams";

const handleStartExam = () => {
  const { allowed, reason } = canStartAttempt(exam);

  if (!allowed) {
    alert(reason);
    return;
  }

  // Proceed to create attempt
};
```

### Step 5: Display Status

Show availability status to students:

```tsx
import { getAvailabilityStatus } from "@/features/exams";

const { status, message } = getAvailabilityStatus(exam);

<span className={statusStyles[status]}>{message}</span>;
```

## Common Workflows

### Publishing Immediately

1. Admin navigates to `/admin/exams/{id}/publish`
2. Clicks "Publish Now"
3. Confirms
4. Exam visible to students immediately

### Scheduling Future Availability

1. Admin clicks "Schedule Publish"
2. Sets `available_from` date/time
3. Optionally sets `available_until`
4. Confirms
5. Exam visible to students from scheduled time

### Unpublishing for Edits

1. Admin clicks "Unpublish" on published exam
2. System checks for student attempts
3. If attempts exist → blocked with message
4. If no attempts → returns to draft
5. Admin can now edit questions

### Archiving Completed Exam

1. Admin clicks "Archive"
2. Confirms action
3. Exam hidden from students
4. Attempts/data preserved
5. Cannot be reversed

## Validation & Error Handling

### Publishing Validation

- ✅ `available_from` < `available_until` (if both set)
- ✅ Package exists and is draft status
- ❌ Error message if validation fails

### Unpublishing Validation

- ✅ No student attempts exist
- ❌ "Cannot unpublish: exam has student attempts" if attempts exist
- → Suggests archiving instead

### Archiving

- ✅ Always allowed (even with attempts)
- ✅ Preserves all data
- ⚠️ Irreversible action

## Database Fields Used

No schema changes required. Uses existing fields:

```sql
exam_packages:
  - status: text                -- "draft" | "published" | "archived"
  - available_from: timestamptz -- null = no start restriction
  - available_until: timestamptz -- null = no end restriction
```

## Testing Checklist

### Admin Publishing

- [ ] Publish draft exam immediately
- [ ] Schedule exam with future `available_from`
- [ ] Set `available_until` for time-limited exam
- [ ] Unpublish exam with no attempts
- [ ] Attempt to unpublish exam with attempts (should fail)
- [ ] Archive published exam
- [ ] Verify archived exam hidden from students

### Student Visibility

- [ ] Draft exams not visible
- [ ] Published exams visible
- [ ] Archived exams not visible
- [ ] Upcoming exams show "Opens on [date]"
- [ ] Closed exams show "Closed on [date]"
- [ ] Open exams show "Available now"

### Attempt Creation

- [ ] Can start attempt on open exam
- [ ] Cannot start attempt before `available_from`
- [ ] Cannot start attempt after `available_until`
- [ ] Can review submitted attempts after window closes
- [ ] Error messages display correctly

### Edge Cases

- [ ] No `available_from` → available immediately
- [ ] No `available_until` → available indefinitely
- [ ] Both null → always available
- [ ] `available_from` in past → available now
- [ ] `available_until` in future → still open

## Constraints Followed

- ✅ No schema changes
- ✅ No RLS changes
- ✅ No Edge Functions
- ✅ No student UI redesign
- ✅ TailwindCSS only
- ✅ Typed Supabase queries
- ✅ Minimal diffs
- ✅ No refactoring of Days 15-19

## Next Steps

After Day 20 integration:

1. Test full lifecycle: draft → publish → archive
2. Test scheduling with various date combinations
3. Verify student visibility filtering works correctly
4. Test attempt blocking outside windows
5. Confirm reports still work for archived exams

## Troubleshooting

### Exam not visible to students

- Check `status` is "published"
- Check current time is within availability window
- Check RLS policies allow student SELECT
- Clear browser cache

### Cannot unpublish exam

- Check for existing student attempts
- Use archive instead if attempts exist
- Cannot unpublish after students start

### Scheduling not working

- Verify dates are in correct ISO format
- Check timezone handling (stored as UTC)
- Ensure `available_from` < `available_until`

### Published exam still editable

- Verify publish operation completed
- Check database shows `status = "published"`
- Clear browser cache and reload

## Support

See the example integration in `app/examples/StudentExamListExample.tsx` for complete student-side implementation.

For admin UI, see `app/pages/admin/exams/ExamPublish.tsx` for reference implementation.
