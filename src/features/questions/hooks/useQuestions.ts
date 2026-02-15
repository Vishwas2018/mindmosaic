/**
 * useQuestions — Load and manage questions from the question bank
 *
 * Admin-only hook for accessing all questions across packages.
 * Questions are stored in exam_questions table.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type { QuestionWithAnswer } from "../types/question-bank.types";
import type {
  ExamQuestion,
  ExamQuestionOption,
  ExamCorrectAnswer,
} from "../../../lib/database.types";

type LoadStatus = "loading" | "ready" | "error";

export interface UseQuestionsReturn {
  status: LoadStatus;
  questions: QuestionWithAnswer[];
  error: string | null;
  reload: () => void;
}

export function useQuestions(): UseQuestionsReturn {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      // Load all questions (admin has full SELECT access)
      const { data: questionsData, error: qErr } = await supabase
        .from("exam_questions")
        .select("*")
        .order("exam_package_id")
        .order("sequence_number");

      if (qErr) throw qErr;

      const questionRows = ((questionsData as ExamQuestion[] | null) ?? []);
      const questionIds = questionRows.map((q) => q.id);
      const safeIds = questionIds.length > 0 ? questionIds : ["__none__"];

      // Load options for MCQ/multi questions
      const { data: options, error: optErr } = await supabase
        .from("exam_question_options")
        .select("*")
        .in("question_id", safeIds);

      if (optErr) throw optErr;

      // Load correct answers
      const { data: answers, error: ansErr } = await supabase
        .from("exam_correct_answers")
        .select("*")
        .in("question_id", safeIds);

      if (ansErr) throw ansErr;

      // Build maps
      const optionRows = ((options as ExamQuestionOption[] | null) ?? []);
      const optionsMap = new Map<string, ExamQuestionOption[]>();
      optionRows.forEach((opt) => {
        const existing = optionsMap.get(opt.question_id) || [];
        optionsMap.set(opt.question_id, [...existing, opt]);
      });

      const answersMap = new Map(
        (((answers as ExamCorrectAnswer[] | null) ?? []).map((a) => [
          a.question_id,
          a,
        ])),
      );

      // Assemble questions with answers
      const assembled: QuestionWithAnswer[] = questionRows.map(
        (q) => ({
          ...q,
          prompt_blocks: Array.isArray(q.prompt_blocks)
            ? (q.prompt_blocks as QuestionWithAnswer["prompt_blocks"])
            : [],
          tags: Array.isArray(q.tags) ? q.tags : [],
          options: optionsMap.get(q.id),
          correctAnswer: answersMap.get(q.id),
        }),
      );

      setQuestions(assembled);
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load questions.";
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, questions, error, reload: load };
}
