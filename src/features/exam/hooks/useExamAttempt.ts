/**
 * MindMosaic — useExamAttempt Hook
 *
 * Manages complete exam attempt state:
 * - Load attempt, questions, and existing responses
 * - Track current question navigation
 * - Handle response changes with autosave
 * - Submit attempt
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase, callEdgeFunction } from "../../../lib/supabase";
import { useAutosave } from "./useAutosave";
import type {
  ExamPackage,
  ExamAttempt,
  QuestionWithOptions,
  ResponseData,
  SubmitAttemptResponse,
} from "../types/exam.types";

// =============================================================================
// Types
// =============================================================================

interface UseExamAttemptOptions {
  attemptId: string;
}

interface UseExamAttemptResult {
  // State
  isLoading: boolean;
  error: string | null;
  attempt: ExamAttempt | null;
  examPackage: ExamPackage | null;
  questions: QuestionWithOptions[];
  responses: Map<string, ResponseData>;

  // Navigation
  currentQuestionIndex: number;
  currentQuestion: QuestionWithOptions | null;
  totalQuestions: number;
  answeredCount: number;
  goToQuestion: (index: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;

  // Response handling
  setResponse: (questionId: string, data: ResponseData) => void;
  getResponse: (questionId: string) => ResponseData | undefined;

  // Save state
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Submission
  isSubmitting: boolean;
  submitAttempt: () => Promise<{ success: boolean; error?: string }>;
  isSubmitted: boolean;

  // Timer
  startedAt: Date | null;
  durationMinutes: number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useExamAttempt({
  attemptId,
}: UseExamAttemptOptions): UseExamAttemptResult {
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [examPackage, setExamPackage] = useState<ExamPackage | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [responses, setResponses] = useState<Map<string, ResponseData>>(
    new Map(),
  );

  // Navigation state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autosave hook
  const { queueSave, flushPending } = useAutosave({
    debounceMs: 500,
    onSaveStart: () => setIsSaving(true),
    onSaveComplete: (savedAt) => {
      setIsSaving(false);
      setLastSavedAt(savedAt);
    },
    onSaveError: (err) => {
      setIsSaving(false);
      console.error("Autosave failed:", err);
    },
  });

  // ==========================================================================
  // Load attempt data
  // ==========================================================================

  useEffect(() => {
    async function loadAttempt() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Load attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("id", attemptId)
          .single();

        if (attemptError) {
          throw new Error(`Failed to load attempt: ${attemptError.message}`);
        }

        if (!attemptData) {
          throw new Error("Attempt not found");
        }

        setAttempt(attemptData);

        // 2. Load exam package
        const { data: packageData, error: packageError } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", attemptData.exam_package_id)
          .single();

        if (packageError) {
          throw new Error(`Failed to load exam: ${packageError.message}`);
        }

        setExamPackage(packageData);

        // 3. Load questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("exam_questions")
          .select("*")
          .eq("exam_package_id", attemptData.exam_package_id)
          .order("sequence_number");

        if (questionsError) {
          throw new Error(
            `Failed to load questions: ${questionsError.message}`,
          );
        }

        // 4. Load options for MCQ/multi questions
        const mcqQuestionIds = questionsData
          .filter(
            (q) => q.response_type === "mcq" || q.response_type === "multi",
          )
          .map((q) => q.id);

        const optionsMap = new Map<string, typeof optionsData>();
        let optionsData: Array<{
          question_id: string;
          option_id: string;
          content: string;
          media_reference: unknown;
        }> = [];

        if (mcqQuestionIds.length > 0) {
          const { data: opts, error: optsError } = await supabase
            .from("exam_question_options")
            .select("*")
            .in("question_id", mcqQuestionIds)
            .order("option_id");

          if (optsError) {
            console.warn("Failed to load options:", optsError.message);
          } else {
            optionsData = opts || [];
          }
        }

        // Build options map
        optionsData.forEach((opt) => {
          const existing = optionsMap.get(opt.question_id) || [];
          optionsMap.set(opt.question_id, [...existing, opt]);
        });

        // Build questions with options
        const questionsWithOptions: QuestionWithOptions[] = questionsData.map(
          (q) => ({
            ...q,
            options: optionsMap.get(q.id),
            prompt_blocks: Array.isArray(q.prompt_blocks)
              ? q.prompt_blocks
              : [],
            media_references: Array.isArray(q.media_references)
              ? q.media_references
              : null,
            validation: (q as Record<string, unknown>).validation as
              | QuestionWithOptions["validation"]
              | undefined,
          }),
        );

        setQuestions(questionsWithOptions);

        // 5. Load existing responses (for resume)
        const { data: responsesData, error: responsesError } = await supabase
          .from("exam_responses")
          .select("question_id, response_data")
          .eq("attempt_id", attemptId);

        if (responsesError) {
          console.warn("Failed to load responses:", responsesError.message);
        } else if (responsesData) {
          const responseMap = new Map<string, ResponseData>();
          responsesData.forEach((r) => {
            responseMap.set(r.question_id, r.response_data as ResponseData);
          });
          setResponses(responseMap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    loadAttempt();
  }, [attemptId]);

  // ==========================================================================
  // Derived state
  // ==========================================================================

  const currentQuestion = useMemo(
    () => questions[currentQuestionIndex] ?? null,
    [questions, currentQuestionIndex],
  );

  const totalQuestions = questions.length;

  const answeredCount = useMemo(() => {
    let count = 0;
    questions.forEach((q) => {
      const response = responses.get(q.id);
      if (response) {
        // Check if response has actual content
        if ("selectedOptionId" in response && response.selectedOptionId) {
          count++;
        } else if (
          "selectedOptionIds" in response &&
          response.selectedOptionIds.length > 0
        ) {
          count++;
        } else if ("answer" in response && String(response.answer).trim()) {
          count++;
        }
      }
    });
    return count;
  }, [questions, responses]);

  const canGoNext = currentQuestionIndex < totalQuestions - 1;
  const canGoPrevious = currentQuestionIndex > 0;

  const isSubmitted =
    attempt?.status === "submitted" || attempt?.status === "evaluated";

  const startedAt = attempt ? new Date(attempt.started_at) : null;
  const durationMinutes = examPackage?.duration_minutes ?? 0;

  // ==========================================================================
  // Navigation
  // ==========================================================================

  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalQuestions) {
        setCurrentQuestionIndex(index);
      }
    },
    [totalQuestions],
  );

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  }, [canGoNext]);

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  }, [canGoPrevious]);

  // ==========================================================================
  // Response handling
  // ==========================================================================

  const setResponse = useCallback(
    (questionId: string, data: ResponseData) => {
      // Don't allow changes after submission
      if (isSubmitted) return;

      // Update local state
      setResponses((prev) => {
        const next = new Map(prev);
        next.set(questionId, data);
        return next;
      });

      // Find question to get response type
      const question = questions.find((q) => q.id === questionId);
      if (!question || !attempt) return;

      // Queue autosave
      queueSave(attempt.id, questionId, question.response_type, data);
    },
    [isSubmitted, questions, attempt, queueSave],
  );

  const getResponse = useCallback(
    (questionId: string) => responses.get(questionId),
    [responses],
  );

  // ==========================================================================
  // Submission
  // ==========================================================================

  const submitAttempt = useCallback(async () => {
    if (!attempt || isSubmitted || isSubmitting) {
      return { success: false, error: "Cannot submit" };
    }

    setIsSubmitting(true);

    try {
      // Flush any pending saves first
      await flushPending();

      // Call submit-attempt Edge Function
      const { data, error } = await callEdgeFunction<SubmitAttemptResponse>(
        "submit-attempt",
        {
          attempt_id: attempt.id,
        },
      );

      if (error) {
        setIsSubmitting(false);
        return { success: false, error };
      }

      // Update local attempt status
      setAttempt((prev) =>
        prev
          ? {
              ...prev,
              status: "submitted",
              submitted_at: data?.submitted_at ?? null,
            }
          : null,
      );

      setIsSubmitting(false);
      return { success: true };
    } catch (err) {
      setIsSubmitting(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Submit failed",
      };
    }
  }, [attempt, isSubmitted, isSubmitting, flushPending]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isLoading,
    error,
    attempt,
    examPackage,
    questions,
    responses,

    // Navigation
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    answeredCount,
    goToQuestion,
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,

    // Response handling
    setResponse,
    getResponse,

    // Save state
    isSaving,
    lastSavedAt,

    // Submission
    isSubmitting,
    submitAttempt,
    isSubmitted,

    // Timer
    startedAt,
    durationMinutes,
  };
}
