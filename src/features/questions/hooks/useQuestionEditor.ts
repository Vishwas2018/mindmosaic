/**
 * useQuestionEditor — Create and edit questions
 *
 * Handles CRUD operations for questions in the bank.
 */

import { useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type {
  QuestionWithAnswer,
  QuestionOption,
  CorrectAnswer,
} from "../types/question-bank.types";

export interface SaveQuestionInput {
  id?: string; // If editing existing
  exam_package_id: string;
  sequence_number: number;
  difficulty: "easy" | "medium" | "hard";
  response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
  marks: number;
  prompt_blocks: unknown[];
  tags: string[];
  hint: string | null;
  options?: QuestionOption[];
  correctAnswer: CorrectAnswer;
}

export interface UseQuestionEditorReturn {
  isSaving: boolean;
  saveError: string | null;
  saveQuestion: (input: SaveQuestionInput) => Promise<{
    success: boolean;
    questionId?: string;
    error?: string;
  }>;
  deleteQuestion: (questionId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

export function useQuestionEditor(): UseQuestionEditorReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveQuestion = useCallback(async (input: SaveQuestionInput) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const isUpdate = !!input.id;
      const questionId = input.id || crypto.randomUUID();

      // 1. Upsert question
      const questionData = {
        id: questionId,
        exam_package_id: input.exam_package_id,
        sequence_number: input.sequence_number,
        difficulty: input.difficulty,
        response_type: input.response_type,
        marks: input.marks,
        prompt_blocks: input.prompt_blocks,
        media_references: null,
        tags: input.tags,
        hint: input.hint,
      };

      const { error: qErr } = await supabase
        .from("exam_questions")
        .upsert(questionData);

      if (qErr) throw qErr;

      // 2. Handle options (for MCQ/multi)
      if (input.response_type === "mcq" || input.response_type === "multi") {
        // Delete existing options
        const { error: delOptErr } = await supabase
          .from("exam_question_options")
          .delete()
          .eq("question_id", questionId);

        if (delOptErr) throw delOptErr;

        // Insert new options
        if (input.options && input.options.length > 0) {
          const optionsData = input.options.map((opt) => ({
            question_id: questionId,
            option_id: opt.option_id,
            content: opt.content,
            media_reference: opt.media_reference,
          }));

          const { error: insOptErr } = await supabase
            .from("exam_question_options")
            .insert(optionsData);

          if (insOptErr) throw insOptErr;
        }
      }

      // 3. Upsert correct answer
      const answerData = {
        ...input.correctAnswer,
        question_id: questionId,
      };

      const { error: ansErr } = await supabase
        .from("exam_correct_answers")
        .upsert(answerData);

      if (ansErr) throw ansErr;

      setIsSaving(false);
      return { success: true, questionId };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save question.";
      setSaveError(message);
      setIsSaving(false);
      return { success: false, error: message };
    }
  }, []);

  const deleteQuestion = useCallback(async (questionId: string) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Delete correct answer first (FK constraint)
      const { error: ansErr } = await supabase
        .from("exam_correct_answers")
        .delete()
        .eq("question_id", questionId);

      if (ansErr) throw ansErr;

      // Delete options (if any)
      const { error: optErr } = await supabase
        .from("exam_question_options")
        .delete()
        .eq("question_id", questionId);

      if (optErr) throw optErr;

      // Delete question
      const { error: qErr } = await supabase
        .from("exam_questions")
        .delete()
        .eq("id", questionId);

      if (qErr) throw qErr;

      setIsSaving(false);
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete question.";
      setSaveError(message);
      setIsSaving(false);
      return { success: false, error: message };
    }
  }, []);

  return {
    isSaving,
    saveError,
    saveQuestion,
    deleteQuestion,
  };
}
