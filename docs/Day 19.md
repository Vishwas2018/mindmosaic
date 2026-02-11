# Day 19: Question Bank & Exam Authoring

## Overview

Day 19 introduces admin-only question authoring and exam generation capabilities. Admins can now:

1. Create and manage questions in a question bank
2. Define exam blueprints with selection rules
3. Generate exams automatically from the bank
4. Enforce non-repetition rules during generation

## Files Created

### Types

- `features/questions/types/question-bank.types.ts` — Core types for questions, blueprints, and generation

### Hooks

- `features/questions/hooks/useQuestions.ts` — Load and manage questions
- `features/questions/hooks/useQuestionEditor.ts` — Create/edit/delete questions
- `features/exams/hooks/useExamGeneration.ts` — Generate exams from blueprints

### Pages

- `app/pages/admin/questions/QuestionList.tsx` — Browse and filter question bank
- `app/pages/admin/questions/QuestionEditor.tsx` — Create/edit individual questions
- `app/pages/admin/exams/ExamGenerate.tsx` — Blueprint editor and exam generation

### Navigation

- `app/routes/day19-routes.tsx` — Route definitions
- `app/components/navigation/Day19AdminNav.tsx` — Navigation components

## Integration Steps

### 1. Add Routes

Add these routes to your router configuration (inside `<AdminLayout>` with `<RoleGuard allowed={["admin"]} />`):

```tsx
import { QuestionListPage } from "./pages/admin/questions/QuestionList";
import { QuestionEditorPage } from "./pages/admin/questions/QuestionEditor";
import { ExamGeneratePage } from "./pages/admin/exams/ExamGenerate";

// Inside admin route group:
<Route path="/admin/questions" element={<QuestionListPage />} />
<Route path="/admin/questions/create" element={<QuestionEditorPage />} />
<Route path="/admin/questions/edit/:id" element={<QuestionEditorPage />} />
<Route path="/admin/exams/generate" element={<ExamGeneratePage />} />
```

### 2. Add Navigation

Add navigation items to your `AdminLayout` sidebar:

```tsx
import { Day19AdminNavItems } from "./components/navigation/Day19AdminNav";

// Inside your admin navigation:
<nav className="space-y-1">
  {/* Existing nav items */}
  <Link to="/admin/dashboard">Dashboard</Link>
  <Link to="/admin/exams">Exams</Link>

  {/* Day 19 additions */}
  <Day19AdminNavItems />
</nav>;
```

### 3. Verify Database Access

Ensure your `exam_questions`, `exam_question_options`, and `exam_correct_answers` tables have appropriate RLS policies for admin SELECT, INSERT, UPDATE, DELETE.

The question bank uses a special package ID `"question-bank"` to store questions before they're assigned to exams.

## Features

### Question Bank Management

**Access:** `/admin/questions`

- Browse all questions across all packages
- Filter by difficulty, type, tags, and content
- Search functionality
- Create new questions
- Edit existing questions
- Delete questions (cascades to options and answers)

### Question Editor

**Access:** `/admin/questions/create` or `/admin/questions/edit/:id`

Supports:

- All response types (MCQ, multi-select, short answer, extended response, numeric)
- Prompt blocks (currently text; extensible to math/image)
- Difficulty levels
- Tags for organization
- Optional hints
- Correct answer configuration per type

### Exam Generation

**Access:** `/admin/exams/generate`

Blueprint-based generation:

- Define multiple sections with different criteria
- Set question counts per section
- Filter by difficulty, type, subject, tags
- Automatic question selection with randomization
- Duplicate prevention within same exam
- Exclusion of questions from previous exam version
- Creates draft exam package ready for activation

## Data Flow

```
Question Bank (exam_questions with package_id="question-bank")
                    ↓
          Blueprint Definition
                    ↓
        Exam Generation Hook
      (filters, selects, randomizes)
                    ↓
     New Exam Package (draft status)
                    ↓
    Admin Activation → Student Delivery
```

## Generation Logic

1. **Load Available Questions:** All questions from database (admin has full access)
2. **Exclude Previous:** If updating an exam, exclude questions from previous version
3. **Filter Per Section:** Apply blueprint filters (difficulty, type, tags, marks)
4. **Randomize Selection:** Shuffle candidates and select required count
5. **Prevent Duplicates:** Track used question IDs across sections
6. **Create Package:** Insert new exam package with draft status
7. **Copy Questions:** Insert selected questions with new IDs into package
8. **Copy Options/Answers:** Cascade options and correct answers

## Question Bank Approach

Questions are stored in `exam_questions` with a special `exam_package_id = "question-bank"` before being assigned to specific exams. During generation:

- Questions are **copied** (not moved) from bank to exam package
- New question IDs are generated for the exam copy
- Original bank questions remain unchanged
- This allows reuse across multiple exams

## Non-Repetition Rules

- **Within Exam:** Each question ID can only appear once (enforced by Set tracking)
- **Across Versions:** `excludeFromPackageId` parameter excludes questions from previous exam version
- **Future Enhancement:** Could track question usage history for more sophisticated exclusion

## Error Handling

All hooks return structured error states:

- `status: "loading" | "ready" | "error"`
- `error: string | null`
- User-friendly error messages
- Validation at form level before submission

## Testing Checklist

- [ ] Admin can access `/admin/questions`
- [ ] Admin can create MCQ question with options
- [ ] Admin can create short answer question
- [ ] Admin can edit existing question
- [ ] Admin can delete question
- [ ] Tags and filters work correctly
- [ ] Blueprint editor allows multiple sections
- [ ] Generation succeeds with valid blueprint
- [ ] Generation fails gracefully if not enough questions
- [ ] Generated exam appears in exams list as draft
- [ ] Questions in generated exam have correct answers
- [ ] No duplicate questions within generated exam
- [ ] Student cannot access question bank routes

## Schema Contract

**No schema changes required.** Uses existing tables:

- `exam_packages`
- `exam_questions`
- `exam_question_options`
- `exam_correct_answers`

## Known Limitations

1. **Prompt Blocks:** Currently only text blocks implemented; math/image blocks are type-supported but need UI components
2. **Bulk Operations:** No CSV import/export (out of scope)
3. **Question Reordering:** Questions maintain sequence_number but no drag-and-drop UI
4. **Advanced Filtering:** Tag matching is simple includes; could add AND/OR logic
5. **Generation Analytics:** No preview of available questions before generation

## Future Enhancements (Out of Scope for Day 19)

- Rich text editor for prompt blocks
- Image upload for questions and options
- Math equation editor (LaTeX/MathML)
- Question preview mode
- Bulk import from CSV
- Question usage statistics
- AI-assisted question generation
- Question versioning/changelog
- Collaborative editing
- Question difficulty calibration based on student performance

## Maintenance Notes

- Question bank cleanup should preserve questions referenced by active exams
- Consider archival strategy for old questions
- Monitor question bank growth and implement pagination if needed
- Add indexes on `tags` column if filtering becomes slow
- Consider adding `subject` column to `exam_questions` for better filtering

## Support

For issues or questions about Day 19 implementation, refer to the codebase audit document and ensure all previous days (15-18) are properly integrated first.
