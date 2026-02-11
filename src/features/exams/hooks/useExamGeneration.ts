/**
 * useExamGeneration — Generate exams from blueprints
 *
 * Selects questions from the bank based on blueprint rules.
 * Prevents duplicates and excludes recently used questions.
 */

import { useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type {
  ExamBlueprint,
  QuestionFilters,
  QuestionWithAnswer,
  GenerationResult,
} from "../../questions/types/question-bank.types";

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

          excludedIds = new Set((prevQuestions ?? []).map((q) => q.id));
        }

        // 3. Filter available questions (exclude previous)
        const available = (allQuestions ?? []).filter(
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

        const { data: options } = await supabase
          .from("exam_question_options")
          .select("*")
          .in("question_id", questionIds);

        const { data: answers } = await supabase
          .from("exam_correct_answers")
          .select("*")
          .in("question_id", questionIds);

        // Build maps
        const optionsMap = new Map<string, typeof options>();
        (options ?? []).forEach((opt) => {
          const existing = optionsMap.get(opt.question_id) || [];
          optionsMap.set(opt.question_id, [...existing, opt]);
        });

        const answersMap = new Map(
          (answers ?? []).map((a) => [a.question_id, a]),
        );

        // 6. Assemble final questions
        const finalQuestions: QuestionWithAnswer[] = selectedQuestions.map(
          (q, idx) => ({
            ...q,
            sequence_number: idx + 1, // Re-sequence
            prompt_blocks: Array.isArray(q.prompt_blocks)
              ? q.prompt_blocks
              : [],
            tags: Array.isArray(q.tags) ? q.tags : [],
            options: optionsMap.get(q.id),
            correctAnswer: answersMap.get(q.id),
          }),
        );

        // 7. Calculate total marks
        const total_marks = finalQuestions.reduce((sum, q) => sum + q.marks, 0);

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
        (insertedQuestions ?? []).forEach((newQ, idx) => {
          newQuestionIdMap.set(finalQuestions[idx].id, newQ.id);
        });

        // Options
        const optionsToInsert: any[] = [];
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

        // Answers
        const answersToInsert: any[] = [];
        finalQuestions.forEach((origQ) => {
          const newQId = newQuestionIdMap.get(origQ.id);
          if (newQId && origQ.correctAnswer) {
            answersToInsert.push({
              ...origQ.correctAnswer,
              question_id: newQId,
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
// Selection Logic
// ────────────────────────────────────────────

function selectQuestionsForSection(
  available: any[],
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

  // Select count
  return candidates.slice(0, count);
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
