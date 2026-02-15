/**
 * useExamGeneration — Generate exams from blueprints
 *
 * Selects questions from the bank based on blueprint rules.
 * Prevents duplicates and excludes recently used questions.
 *
 * BUG-8 FIX: Replaced `any` types with proper typed interfaces.
 * REC-1 FIX: Added `__none__` fallback for empty IN clauses.
 * REC-4 FIX: Added validation for minimum question count.
 */

import { useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type { Json } from "../../../lib/database.types";
import type {
  ExamBlueprint,
  QuestionFilters,
  QuestionWithAnswer,
  QuestionOption,
  CorrectAnswer,
  GenerationResult,
} from "../../questions/types/question-bank.types";

// ────────────────────────────────────────────
// Internal types (BUG-8 FIX: replaces `any`)
// ────────────────────────────────────────────

/** Shape of a row from exam_questions as returned by Supabase */
interface QuestionRow {
  id: string;
  exam_package_id: string;
  sequence_number: number;
  difficulty: "easy" | "medium" | "hard";
  response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
  marks: number;
  prompt_blocks: Json;
  media_references: Json | null;
  tags: string[] | null;
  hint: string | null;
  subject?: string;
}

/** Shape for inserting into exam_question_options */
interface OptionInsert {
  question_id: string;
  option_id: string;
  content: string;
  media_reference: Json | null;
}

/** Shape for inserting into exam_correct_answers */
interface AnswerInsert {
  question_id: string;
  answer_type: string;
  correct_option_id: string | null;
  correct_option_ids: string[] | null;
  accepted_answers: Json | null;
  case_sensitive: boolean;
  exact_value: number | null;
  range_min: number | null;
  range_max: number | null;
  tolerance: number | null;
  unit: string | null;
  rubric: Json | null;
  sample_response: string | null;
}

export interface UseExamGenerationReturn {
  isGenerating: boolean;
  generateError: string | null;
  generateExam: (
    blueprint: ExamBlueprint,
    excludeFromPackageId?: string,
  ) => Promise<GenerationResult>;
}

export function useExamGeneration(): UseExamGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const generateExam = useCallback(
    async (
      blueprint: ExamBlueprint,
      excludeFromPackageId?: string,
    ): Promise<GenerationResult> => {
      setIsGenerating(true);
      setGenerateError(null);

      try {
        // REC-4 FIX: Validate blueprint has sections with questions
        const totalRequestedQuestions = blueprint.sections.reduce(
          (sum, s) => sum + s.question_count,
          0,
        );
        if (totalRequestedQuestions === 0) {
          throw new Error(
            "Blueprint must request at least one question across all sections.",
          );
        }

        // 1. Load all available questions
        const { data: allQuestions, error: qErr } = await supabase
          .from("exam_questions")
          .select("*");

        if (qErr) throw qErr;

        // 2. Get excluded question IDs (from previous exam version)
        let excludedIds = new Set<string>();
        if (excludeFromPackageId) {
          const { data: prevQuestions } = await supabase
            .from("exam_questions")
            .select("id")
            .eq("exam_package_id", excludeFromPackageId);

          excludedIds = new Set(
            ((prevQuestions as Array<{ id: string }> | null) ?? []).map(
              (q) => q.id,
            ),
          );
        }

        // 3. Filter available questions (exclude previous)
        const available = ((allQuestions ?? []) as QuestionRow[]).filter(
          (q) => !excludedIds.has(q.id),
        );

        // 4. Select questions per section
        const selectedQuestions: QuestionWithAnswer[] = [];
        const usedIds = new Set<string>();

        for (const section of blueprint.sections) {
          const sectionQuestions = selectQuestionsForSection(
            available,
            section.filters,
            section.question_count,
            usedIds,
          );

          if (sectionQuestions.length < section.question_count) {
            throw new Error(
              `Not enough questions for section "${section.name}": ` +
                `needed ${section.question_count}, found ${sectionQuestions.length}`,
            );
          }

          selectedQuestions.push(...sectionQuestions);
          sectionQuestions.forEach((q) => usedIds.add(q.id));
        }

        // 5. Load options and correct answers for selected questions
        const questionIds = selectedQuestions.map((q) => q.id);
        // REC-1 FIX: Guard against empty IN clause
        const safeQuestionIds =
          questionIds.length > 0 ? questionIds : ["__none__"];

        const { data: options } = await supabase
          .from("exam_question_options")
          .select("*")
          .in("question_id", safeQuestionIds);

        const { data: answers } = await supabase
          .from("exam_correct_answers")
          .select("*")
          .in("question_id", safeQuestionIds);

        // Build maps
        const optionsMap = new Map<string, QuestionOption[]>();
        (((options as QuestionOption[] | null) ?? [])).forEach((opt) => {
          const existing = optionsMap.get(opt.question_id) || [];
          optionsMap.set(opt.question_id, [...existing, opt]);
        });

        const answersMap = new Map<string, CorrectAnswer>(
          (((answers as CorrectAnswer[] | null) ?? []).map((a) => [
            a.question_id,
            a,
          ])),
        );

        // 6. Assemble final questions
        const finalQuestions: QuestionWithAnswer[] = selectedQuestions.map(
          (q, idx) => ({
            ...q,
            sequence_number: idx + 1, // Re-sequence
            prompt_blocks: Array.isArray(q.prompt_blocks)
              ? (q.prompt_blocks as QuestionWithAnswer["prompt_blocks"])
              : [],
            tags: Array.isArray(q.tags) ? q.tags : [],
            options: optionsMap.get(q.id),
            correctAnswer: answersMap.get(q.id),
          }),
        );

        // 7. Calculate total marks
        const total_marks = finalQuestions.reduce((sum, q) => sum + q.marks, 0);

        // REC-4 FIX: Validate total marks
        if (total_marks === 0) {
          throw new Error(
            "Generated exam has 0 total marks. Check question marks values.",
          );
        }

        // 8. Create exam package
        const packageId = crypto.randomUUID();
        const now = new Date().toISOString();

        const packageData = {
          id: packageId,
          title: blueprint.title,
          year_level: blueprint.year_level,
          subject: blueprint.subject,
          assessment_type: blueprint.assessment_type,
          duration_minutes: blueprint.duration_minutes,
          total_marks,
          version: "1.0.0",
          schema_version: "1.0.0",
          status: "draft" as const,
          instructions: null,
          created_at: now,
          updated_at: now,
          pass_mark_percentage: 50,
        };

        const { error: pkgErr } = await supabase
          .from("exam_packages")
          .insert(packageData);

        if (pkgErr) throw pkgErr;

        // 9. Insert questions
        const questionsToInsert = finalQuestions.map((q) => ({
          id: crypto.randomUUID(), // New question IDs for the package
          exam_package_id: packageId,
          sequence_number: q.sequence_number,
          difficulty: q.difficulty,
          response_type: q.response_type,
          marks: q.marks,
          prompt_blocks: q.prompt_blocks,
          media_references: q.media_references,
          tags: q.tags,
          hint: q.hint,
        }));

        const { data: insertedQuestions, error: insQErr } = await supabase
          .from("exam_questions")
          .insert(questionsToInsert)
          .select();

        if (insQErr) throw insQErr;

        // 10. Insert options and answers
        const newQuestionIdMap = new Map<string, string>();
        ((insertedQuestions as Array<{ id: string }> | null) ?? []).forEach(
          (newQ, idx) => {
            newQuestionIdMap.set(finalQuestions[idx].id, newQ.id);
          },
        );

        // Options (BUG-8 FIX: properly typed)
        const optionsToInsert: OptionInsert[] = [];
        finalQuestions.forEach((origQ) => {
          const newQId = newQuestionIdMap.get(origQ.id);
          if (newQId && origQ.options) {
            origQ.options.forEach((opt) => {
              optionsToInsert.push({
                question_id: newQId,
                option_id: opt.option_id,
                content: opt.content,
                media_reference: opt.media_reference,
              });
            });
          }
        });

        if (optionsToInsert.length > 0) {
          const { error: optInsErr } = await supabase
            .from("exam_question_options")
            .insert(optionsToInsert);

          if (optInsErr) throw optInsErr;
        }

        // Answers (BUG-8 FIX: properly typed)
        const answersToInsert: AnswerInsert[] = [];
        finalQuestions.forEach((origQ) => {
          const newQId = newQuestionIdMap.get(origQ.id);
          if (newQId && origQ.correctAnswer) {
            answersToInsert.push({
              question_id: newQId,
              answer_type: origQ.correctAnswer.answer_type,
              correct_option_id: origQ.correctAnswer.correct_option_id,
              correct_option_ids: origQ.correctAnswer.correct_option_ids,
              accepted_answers: origQ.correctAnswer.accepted_answers,
              case_sensitive: origQ.correctAnswer.case_sensitive,
              exact_value: origQ.correctAnswer.exact_value,
              range_min: origQ.correctAnswer.range_min,
              range_max: origQ.correctAnswer.range_max,
              tolerance: origQ.correctAnswer.tolerance,
              unit: origQ.correctAnswer.unit,
              rubric: origQ.correctAnswer.rubric,
              sample_response: origQ.correctAnswer.sample_response,
            });
          }
        });

        if (answersToInsert.length > 0) {
          const { error: ansInsErr } = await supabase
            .from("exam_correct_answers")
            .insert(answersToInsert);

          if (ansInsErr) throw ansInsErr;
        }

        setIsGenerating(false);
        return {
          success: true,
          exam: {
            package_id: packageId,
            questions: finalQuestions,
            total_marks,
          },
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Exam generation failed.";
        setGenerateError(message);
        setIsGenerating(false);
        return { success: false, error: message };
      }
    },
    [],
  );

  return {
    isGenerating,
    generateError,
    generateExam,
  };
}

// ────────────────────────────────────────────
// Selection Logic (BUG-8 FIX: properly typed)
// ────────────────────────────────────────────

function selectQuestionsForSection(
  available: QuestionRow[],
  filters: QuestionFilters,
  count: number,
  usedIds: Set<string>,
): QuestionWithAnswer[] {
  // Filter by criteria
  let candidates = available.filter((q) => {
    if (usedIds.has(q.id)) return false;
    if (filters.subject && q.subject !== filters.subject) return false;
    if (filters.difficulty && !filters.difficulty.includes(q.difficulty))
      return false;
    if (
      filters.response_type &&
      !filters.response_type.includes(q.response_type)
    )
      return false;
    if (filters.marks !== undefined && q.marks !== filters.marks) return false;
    if (filters.tags && filters.tags.length > 0) {
      const qTags = q.tags ?? [];
      const hasTag = filters.tags.some((tag) => qTags.includes(tag));
      if (!hasTag) return false;
    }
    return true;
  });

  // Shuffle for randomness
  candidates = shuffle(candidates);

  // Select count and cast to QuestionWithAnswer
  return candidates.slice(0, count).map((q) => ({
    ...q,
    prompt_blocks: Array.isArray(q.prompt_blocks)
      ? (q.prompt_blocks as QuestionWithAnswer["prompt_blocks"])
      : [],
    media_references: q.media_references,
    tags: q.tags ?? [],
  }));
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
