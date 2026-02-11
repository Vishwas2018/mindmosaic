# Day 19: Quick Start Integration Guide

## Files to Copy

Copy all files from `/home/claude/` to your `src/` directory maintaining the structure:

```
src/
├── features/
│   ├── questions/
│   │   ├── types/question-bank.types.ts
│   │   ├── hooks/useQuestions.ts
│   │   ├── hooks/useQuestionEditor.ts
│   │   └── index.ts
│   └── exams/
│       ├── hooks/useExamGeneration.ts
│       └── index.ts
├── app/
│   ├── pages/admin/
│   │   ├── questions/
│   │   │   ├── QuestionList.tsx
│   │   │   └── QuestionEditor.tsx
│   │   └── exams/
│   │       └── ExamGenerate.tsx
│   ├── routes/day19-routes.tsx
│   └── components/navigation/Day19AdminNav.tsx
└── DAY_19_README.md
```

## Step-by-Step Integration

### Step 1: Copy Files

```bash
cp -r /home/claude/features/* src/features/
cp -r /home/claude/app/* src/app/
cp /home/claude/DAY_19_README.md .
```

### Step 2: Add Routes

In your router file (e.g., `src/App.tsx` or `src/router.tsx`), add:

```tsx
import { QuestionListPage } from "./pages/admin/questions/QuestionList";
import { QuestionEditorPage } from "./pages/admin/questions/QuestionEditor";
import { ExamGeneratePage } from "./pages/admin/exams/ExamGenerate";

// Inside your admin routes with RoleGuard:
<Route element={<AdminLayout />}>
  <Route element={<RoleGuard allowed={["admin"]} />}>
    {/* Existing routes */}

    {/* Day 19: Question Bank & Exam Generation */}
    <Route path="/admin/questions" element={<QuestionListPage />} />
    <Route path="/admin/questions/create" element={<QuestionEditorPage />} />
    <Route path="/admin/questions/edit/:id" element={<QuestionEditorPage />} />
    <Route path="/admin/exams/generate" element={<ExamGeneratePage />} />
  </Route>
</Route>;
```

### Step 3: Add Navigation

In your `AdminLayout` component, add navigation items:

```tsx
import { Day19AdminNavItems } from "./components/navigation/Day19AdminNav";

// In your sidebar/navigation:
<nav className="space-y-1">
  {/* Existing items */}
  <Link to="/admin/dashboard">Dashboard</Link>
  <Link to="/admin/exams">Exams</Link>

  {/* Day 19 */}
  <Day19AdminNavItems />
</nav>;
```

### Step 4: Verify Database Access

Check that admin users have permissions on:

- `exam_questions` (SELECT, INSERT, UPDATE, DELETE)
- `exam_question_options` (SELECT, INSERT, UPDATE, DELETE)
- `exam_correct_answers` (SELECT, INSERT, UPDATE, DELETE)
- `exam_packages` (SELECT, INSERT, UPDATE, DELETE)

### Step 5: Test

1. **Login as admin** at `/login`
2. **Navigate to Question Bank** at `/admin/questions`
3. **Create a question:**
   - Click "Create Question"
   - Fill in details
   - Add options (for MCQ)
   - Set correct answer
   - Save
4. **Generate an exam:**
   - Navigate to `/admin/exams/generate`
   - Fill in exam details
   - Configure sections
   - Click "Generate Exam"
5. **Verify generation:**
   - Check that exam appears in exams list
   - Verify questions are correctly copied
   - Confirm no duplicates

## Troubleshooting

### Questions not loading

- Check browser console for errors
- Verify Supabase connection
- Confirm RLS policies allow admin SELECT on `exam_questions`

### Cannot create questions

- Check INSERT permissions on all three tables
- Verify `exam_package_id = "question-bank"` is allowed
- Check for foreign key constraint errors

### Generation fails

- Ensure enough questions exist matching filters
- Check console for specific error messages
- Verify `exam_packages` INSERT permission
- Confirm cascading inserts work for questions/options/answers

### Routes not working

- Verify routes are inside `<AdminLayout>` and `<RoleGuard>`
- Check exact path names
- Clear browser cache
- Restart dev server

## API Reference

### useQuestions()

```ts
const { status, questions, error, reload } = useQuestions();
// Returns all questions with options and answers loaded
```

### useQuestionEditor()

```ts
const { isSaving, saveError, saveQuestion, deleteQuestion } = useQuestionEditor();

await saveQuestion({
  exam_package_id: "question-bank",
  difficulty: "medium",
  response_type: "mcq",
  marks: 1,
  prompt_blocks: [{ type: "text", content: "..." }],
  tags: ["geometry"],
  hint: null,
  options: [...],
  correctAnswer: {...},
});
```

### useExamGeneration()

```ts
const { isGenerating, generateError, generateExam } = useExamGeneration();

const result = await generateExam({
  title: "Year 3 Practice Test",
  subject: "numeracy",
  year_level: 3,
  assessment_type: "naplan",
  duration_minutes: 60,
  sections: [
    {
      name: "Section A",
      question_count: 10,
      filters: {
        difficulty: ["easy", "medium"],
        response_type: ["mcq"],
      },
    },
  ],
});

if (result.success) {
  console.log("Generated exam:", result.exam.package_id);
}
```

## Next Steps

After successful integration:

1. Create seed questions for testing
2. Test generation with various blueprint configurations
3. Verify generated exams work in student runtime (Days 15-16)
4. Test admin marking flow with generated exams (Day 17)
5. Verify reports show correctly for generated exams (Day 18)

## Support

See `DAY_19_README.md` for comprehensive documentation.
