/**
 * useAttemptMarking — Loads everything an admin needs to mark a single attempt.
 *
 * Design decisions:
 * - Admin RLS grants SELECT on exam_correct_answers (unlike students).
 *   This lets us show the correct answer alongside student responses.
 * - We load exam_results if they exist (auto-scored via score-attempt).
 *   The breakdown JSONB contains per-question scoring that the teacher
 *   can review and override for extended responses.
 * - Local marking state is managed here so the marking page is stateless.
 * - Saving marks goes through the score-attempt Edge Function (admin-only)
 *   OR directly updates exam_results via Supabase (admin has full CRUD).
 *
 * Assumption: The score-attempt breakdown shape uses these fields:
 *   { question_id, score, max_score, is_correct, requires_manual_review,
 *     sequence_number, response_type }
 *   This matches the ScoreAttemptResponse type from exam.types.ts.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { callEdgeFunction } from "../../../lib/supabase";
import type { Json } from "../../../lib/database.types";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type PromptBlock =
  | { type: "text"; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; content: string; attribution?: string }
  | { type: "instruction"; content: string }
  | { type: "image"; src: string; alt: string };

interface MarkingQuestion {
  id: string;
  sequence_number: number;
  difficulty: "easy" | "medium" | "hard";
  response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
  marks: number;
  prompt_blocks: PromptBlock[];
  hint: string | null;
  tags: string[];
}

interface MarkingOption {
  question_id: string;
  option_id: string;
  content: string;
}

interface MarkingResponse {
  question_id: string;
  response_type: string;
  response_data: Record<string, unknown>;
  responded_at: string;
}

interface CorrectAnswer {
  question_id: string;
  answer_type: string;
  correct_option_id: string | null;
  correct_option_ids: string[] | null;
  accepted_answers: unknown;
  case_sensitive: boolean;
  exact_value: number | null;
  range_min: number | null;
  range_max: number | null;
  tolerance: number | null;
  unit: string | null;
  rubric: unknown;
  sample_response: string | null;
}

/** Per-question breakdown from score-attempt */
export interface QuestionScoreBreakdown {
  question_id: string;
  sequence_number: number;
  response_type: string;
  score: number;
  max_score: number;
  is_correct: boolean;
  requires_manual_review?: boolean;
}

interface ExistingResult {
  id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  breakdown: QuestionScoreBreakdown[];
}

interface AttemptMeta {
  id: string;
  exam_package_id: string;
  student_id: string;
  status: "submitted" | "evaluated";
  started_at: string;
  submitted_at: string | null;
  evaluated_at: string | null;
}

interface ExamPackageMeta {
  id: string;
  title: string;
  year_level: number;
  subject: string;
  assessment_type: "naplan" | "icas";
  duration_minutes: number;
  total_marks: number;
  pass_mark_percentage: number | null;
}

// ── Per-question assembled data for marking ──

export interface MarkingQuestionData {
  question: MarkingQuestion;
  options: MarkingOption[];
  response: MarkingResponse | null;
  correctAnswer: CorrectAnswer | null;
  existingScore: QuestionScoreBreakdown | null;
}

// ── Teacher's local edits for a question ──

export interface ManualMark {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
}

// ── Full marking data ──

export interface AttemptMarkingData {
  attempt: AttemptMeta;
  examPackage: ExamPackageMeta;
  questions: MarkingQuestionData[];
  existingResult: ExistingResult | null;
}

type MarkingStatus = "loading" | "ready" | "error" | "not-found";

export interface UseAttemptMarkingReturn {
  status: MarkingStatus;
  data: AttemptMarkingData | null;
  error: string | null;
  reload: () => void;
  /** Local marking state */
  manualMarks: Map<string, ManualMark>;
  setManualMark: (questionId: string, mark: ManualMark) => void;
  /** Trigger auto-score first, then apply manual overrides */
  finalizeMarking: () => Promise<{ success: boolean; error?: string }>;
  isFinalizing: boolean;
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useAttemptMarking(
  attemptId: string | undefined,
): UseAttemptMarkingReturn {
  const [status, setStatus] = useState<MarkingStatus>("loading");
  const [data, setData] = useState<AttemptMarkingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMarks, setManualMarks] = useState<Map<string, ManualMark>>(
    new Map(),
  );
  const [isFinalizing, setIsFinalizing] = useState(false);

  // ── Load all data ──

  const load = useCallback(async () => {
    if (!attemptId) {
      setStatus("not-found");
      setError("No attempt ID provided.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Fetch the attempt (admin can read all)
      const { data: attempt, error: attErr } = await supabase
        .from("exam_attempts")
        .select(
          "id, exam_package_id, student_id, status, started_at, submitted_at, evaluated_at",
        )
        .eq("id", attemptId)
        .maybeSingle();

      if (attErr) throw attErr;
      if (!attempt) {
        setStatus("not-found");
        setError("Attempt not found.");
        return;
      }

      // Only submitted or evaluated attempts can be marked
      if (attempt.status === "started") {
        setStatus("not-found");
        setError("This attempt is still in progress and cannot be marked.");
        return;
      }

      // 2. Exam package
      const { data: pkg, error: pkgErr } = await supabase
        .from("exam_packages")
        .select(
          "id, title, year_level, subject, assessment_type, duration_minutes, total_marks, pass_mark_percentage",
        )
        .eq("id", attempt.exam_package_id)
        .single();

      if (pkgErr) throw pkgErr;

      // 3. Questions
      const { data: questions, error: qErr } = await supabase
        .from("exam_questions")
        .select(
          "id, sequence_number, difficulty, response_type, marks, prompt_blocks, hint, tags",
        )
        .eq("exam_package_id", attempt.exam_package_id)
        .order("sequence_number", { ascending: true });

      if (qErr) throw qErr;

      const questionIds = (questions ?? []).map((q) => q.id);
      const safeIds = questionIds.length > 0 ? questionIds : ["__none__"];

      // 4. Options
      const { data: options, error: optErr } = await supabase
        .from("exam_question_options")
        .select("question_id, option_id, content")
        .in("question_id", safeIds);

      if (optErr) throw optErr;

      // 5. Student responses
      const { data: responses, error: respErr } = await supabase
        .from("exam_responses")
        .select("question_id, response_type, response_data, responded_at")
        .eq("attempt_id", attemptId);

      if (respErr) throw respErr;

      // 6. Correct answers (admin RLS allows this)
      const { data: correctAnswers, error: caErr } = await supabase
        .from("exam_correct_answers")
        .select("*")
        .in("question_id", safeIds);

      if (caErr) throw caErr;

      // 7. Existing result (may not exist if not yet scored)
      const { data: resultRow, error: resErr } = await supabase
        .from("exam_results")
        .select("id, total_score, max_score, percentage, passed, breakdown")
        .eq("attempt_id", attemptId)
        .maybeSingle();

      if (resErr) throw resErr;

      // ── Build lookup maps ──

      const responseMap = new Map(
        (responses ?? []).map((r) => [r.question_id, r as MarkingResponse]),
      );
      const correctRows = ((correctAnswers as CorrectAnswer[] | null) ?? []);
      const correctMap = new Map(
        correctRows.map((ca) => [
          ca.question_id,
          ca as CorrectAnswer,
        ]),
      );

      const breakdownMap = new Map<string, QuestionScoreBreakdown>();
      if (resultRow?.breakdown && Array.isArray(resultRow.breakdown)) {
        for (const entry of resultRow.breakdown as unknown as QuestionScoreBreakdown[]) {
          breakdownMap.set(entry.question_id, entry);
        }
      }

      // ── Assemble per-question data ──

      const assembled: MarkingQuestionData[] = (questions ?? []).map((q) => ({
        question: {
          ...q,
          prompt_blocks: q.prompt_blocks as PromptBlock[],
          tags: q.tags ?? [],
        } as MarkingQuestion,
        options: ((options as MarkingOption[] | null) ?? []).filter(
          (o) => o.question_id === q.id,
        ),
        response: responseMap.get(q.id) ?? null,
        correctAnswer: correctMap.get(q.id) ?? null,
        existingScore: breakdownMap.get(q.id) ?? null,
      }));

      // Pre-populate manual marks from existing breakdown for manual-review questions
      const initialMarks = new Map<string, ManualMark>();
      for (const q of assembled) {
        if (q.existingScore?.requires_manual_review && q.existingScore) {
          initialMarks.set(q.question.id, {
            questionId: q.question.id,
            score: q.existingScore.score,
            maxScore: q.existingScore.max_score,
            feedback: "",
          });
        }
      }
      setManualMarks(initialMarks);

      setData({
        attempt: attempt as AttemptMeta,
        examPackage: pkg as ExamPackageMeta,
        questions: assembled,
        existingResult: resultRow
          ? ({
              ...resultRow,
              breakdown:
                (resultRow.breakdown as unknown as QuestionScoreBreakdown[]) ??
                [],
            } as ExistingResult)
          : null,
      });
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load attempt data.";
      setError(message);
      setStatus("error");
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Set a manual mark ──

  const setManualMark = useCallback((questionId: string, mark: ManualMark) => {
    setManualMarks((prev) => {
      const next = new Map(prev);
      next.set(questionId, mark);
      return next;
    });
  }, []);

  // ── Finalize: auto-score then apply manual overrides ──

  const finalizeMarking = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!attemptId || !data) {
      return { success: false, error: "No attempt loaded." };
    }

    setIsFinalizing(true);

    try {
      // Step 1: Call score-attempt to auto-score objective questions.
      // This creates/updates the exam_results row and sets attempt status
      // to "evaluated". It's idempotent — safe to call again.
      const scoreResult = await callEdgeFunction<{
        total_score: number;
        max_score: number;
        percentage: number;
        passed: boolean;
        breakdown: QuestionScoreBreakdown[];
      }>("score-attempt", { attempt_id: attemptId });

      if (scoreResult.error) {
        return { success: false, error: scoreResult.error };
      }

      const breakdown = scoreResult.data?.breakdown ?? [];

      // Step 2: Apply manual marks as overrides to the breakdown.
      // For questions where the teacher entered marks, replace the
      // auto-scored entry.
      const updatedBreakdown = breakdown.map((entry) => {
        const manual = manualMarks.get(entry.question_id);
        if (manual) {
          return {
            ...entry,
            score: manual.score,
            is_correct: manual.score >= entry.max_score,
            requires_manual_review: false,
            teacher_feedback: manual.feedback || undefined,
          };
        }
        return entry;
      });

      // Step 3: Recalculate totals
      const totalScore = updatedBreakdown.reduce((sum, e) => sum + e.score, 0);
      const maxScore = updatedBreakdown.reduce(
        (sum, e) => sum + e.max_score,
        0,
      );
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passMarkPct = data.examPackage.pass_mark_percentage ?? 50;
      const passed = percentage >= passMarkPct;

      // Step 4: Update exam_results with the teacher-adjusted breakdown.
      // Admin RLS allows full CRUD on exam_results.
      const { error: updateErr } = await supabase
        .from("exam_results")
        .update({
          total_score: totalScore,
          max_score: maxScore,
          percentage: Math.round(percentage * 100) / 100,
          passed,
          breakdown: updatedBreakdown as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("attempt_id", attemptId);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      // Step 5: Ensure attempt status is "evaluated"
      const { error: statusErr } = await supabase
        .from("exam_attempts")
        .update({
          evaluated_at: new Date().toISOString(),
          status: "evaluated" as const,
        })
        .eq("id", attemptId);

      if (statusErr) {
        return { success: false, error: statusErr.message };
      }

      // Reload to reflect the finalized state
      await load();
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Finalization failed.";
      return { success: false, error: message };
    } finally {
      setIsFinalizing(false);
    }
  }, [attemptId, data, manualMarks, load]);

  return {
    status,
    data,
    error,
    reload: load,
    manualMarks,
    setManualMark,
    finalizeMarking,
    isFinalizing,
  };
}
