# MindMosaic — Question Engine v1: Verification Checklist

**Date:** 15 February 2026
**Scope:** Implement Question Engine v1 per locked spec

---

## Files Changed / Created (17 files)

### Modified

| File                                                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/database.types.ts`                            | Extended ResponseType: added `boolean`, `ordering`, `matching`, `multi_select`. Added `validation` column to exam_questions. Removed unsupported `extended` and `cloze` from canonical set. Kept legacy `multi` alias.                                                                                                                                                                                                             |
| `src/features/exam/types/exam.types.ts`                | Added: `StimulusBlock`, `McqPromptBlock`, `MultiSelectPromptBlock`, `OrderingPromptBlock`, `MatchingPromptBlock` to PromptBlock union. Added: `BooleanResponseData`, `OrderingResponseData`, `MatchingResponseData` response types. Added: `ShortValidation`, `NumericValidation`, `BooleanValidation`, `OrderingValidation`, `MatchingValidation` types. Added `stimulus_group_id`, `multi_part_group_id` to QuestionWithOptions. |
| `src/features/exam/components/QuestionRenderer.tsx`    | Added routing for `boolean`, `ordering`, `matching`, `multi_select` response types. Added cloze detection (blank markers in `short` text). Kept legacy `extended` as graceful fallback.                                                                                                                                                                                                                                            |
| `src/features/exam/components/PromptBlockRenderer.tsx` | Added rendering for `stimulus`, `ordering`, `matching`, `mcq`, `multi_select` prompt blocks.                                                                                                                                                                                                                                                                                                                                       |
| `src/features/exam/components/ReviewQuestionCard.tsx`  | Added review display for `boolean`, `ordering`, `matching`. Added `multi_select` alias. Removed `cloze` case (handled by `short`).                                                                                                                                                                                                                                                                                                 |
| `src/features/exam/components/index.ts`                | Added exports for 4 new components.                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/features/exam/hooks/useExamAttempt.ts`            | Added `validation` field to QuestionWithOptions mapping.                                                                                                                                                                                                                                                                                                                                                                           |
| `src/features/exam/index.ts`                           | Populated with barrel exports for components, scoring, validation.                                                                                                                                                                                                                                                                                                                                                                 |

### New

| File                                                  | Purpose                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/features/exam/components/BooleanQuestion.tsx`    | True/False with optional explanation. Uses `BooleanResponseData`.                            |
| `src/features/exam/components/OrderingQuestion.tsx`   | Keyboard-accessible up/down reorder. No drag. Uses `OrderingResponseData`.                   |
| `src/features/exam/components/MatchingQuestion.tsx`   | Dropdown-based pair matching. No drag. Uses `MatchingResponseData`.                          |
| `src/features/exam/components/ClozeQuestion.tsx`      | Fill-in-the-blank variant of `short`. Renders inline inputs for `___` markers.               |
| `src/features/exam/scoring/scoreQuestion.ts`          | Deterministic client-side scorer for all supported types.                                    |
| `src/features/exam/scoring/index.ts`                  | Barrel export.                                                                               |
| `src/features/exam/validation/validateQuestion.ts`    | Validates prompt_blocks and validation JSON shapes per canonical spec.                       |
| `src/features/exam/validation/index.ts`               | Barrel export.                                                                               |
| `supabase/migrations/20260215_question_engine_v1.sql` | DB migration: enum extension, validation column, grouping columns, insert triggers, indexes. |

---

## Verification: Supported Question Types

| External Name | Internal response_type   | Render Component                                    | Scoring                                               | Status |
| ------------- | ------------------------ | --------------------------------------------------- | ----------------------------------------------------- | ------ |
| single_choice | `mcq`                    | McqQuestion / TrueFalseQuestion                     | Exact match via prompt_blocks mcq block               | ✅     |
| multi_choice  | `multi_select`           | MultiSelectQuestion                                 | Partial credit if `partialCredit: true`               | ✅     |
| short_text    | `short`                  | ShortAnswerQuestion                                 | Case-insensitive match via validation.acceptedAnswers | ✅     |
| cloze         | `short` (presentation)   | ClozeQuestion (auto-detected by `___`)              | Same as short                                         | ✅     |
| numeric       | `numeric`                | NumericQuestion                                     | Exact ± tolerance via validation                      | ✅     |
| true_false    | `boolean`                | BooleanQuestion                                     | Exact match via validation.correct                    | ✅     |
| ordering      | `ordering`               | OrderingQuestion                                    | All-or-nothing exact order                            | ✅     |
| matching      | `matching`               | MatchingQuestion                                    | All-or-nothing exact pairs                            | ✅     |
| passage_group | N/A (stimulus container) | StimulusBlock in PromptBlockRenderer                | N/A — linked via stimulus_group_id                    | ✅     |
| multi_part    | N/A (metadata grouping)  | Standard rendering — linked via multi_part_group_id | Each sub-question scored independently                | ✅     |

## Verification: Unsupported Types Rejected

| Type              | Status                                |
| ----------------- | ------------------------------------- |
| diagram_click     | ❌ Rejected by validator + DB trigger |
| graph_question    | ❌ Rejected by validator + DB trigger |
| audio             | ❌ Rejected by validator + DB trigger |
| extended_response | ❌ Rejected by validator + DB trigger |
| text_highlight    | ❌ Rejected by validator + DB trigger |

## Verification: Scoring Rules

| Type              | Rule                                            | Status |
| ----------------- | ----------------------------------------------- | ------ |
| mcq               | Exact match, full marks or 0                    | ✅     |
| multi_select      | Partial credit if enabled, else all-or-nothing  | ✅     |
| short/cloze       | Case-insensitive match against accepted answers | ✅     |
| numeric           | Exact ± tolerance                               | ✅     |
| boolean           | Exact match                                     | ✅     |
| ordering          | All-or-nothing (exact position match)           | ✅     |
| matching          | All-or-nothing (all pairs correct)              | ✅     |
| extended (legacy) | Always requires manual review                   | ✅     |

## Verification: Spec Compliance

- [x] No new tables introduced
- [x] No redesign of architecture
- [x] Existing data not broken (legacy `multi` and `extended` preserved as aliases)
- [x] passage_group via stimulus + grouping (NOT response_type)
- [x] multi_part via metadata grouping (NOT nested scoring)
- [x] No drag-precision interactions (keyboard-first ordering/matching)
- [x] All components keyboard-accessible
- [x] Autosave behavior preserved (same ResponseData → useAutosave pipeline)
- [x] No new design tokens introduced
- [x] No layout shifts
- [x] Deterministic scoring with client/server validation parity
- [x] Malformed prompt_blocks/validation JSON rejected by validator
- [x] No unsupported types can be inserted (DB trigger + client validator)

## What Was NOT Changed

- No routing changes
- No folder structure changes
- No Supabase queries modified (only column additions)
- No state management changes
- No student/admin/parent page changes
- No existing exam flow changes
- No design token additions
