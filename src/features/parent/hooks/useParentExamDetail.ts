/**
 * useParentExamDetail — Load detailed exam result (read-only)
 *
 * Returns question-level marks but NOT:
 * - Question prompts/content
 * - Student responses
 * - Correct answers
 * - Marking comments
 *
 * BUG-3 FIX: Rewrote to fetch scores from `exam_results` table
 * instead of non-existent fields on `exam_attempts` and `exam_responses`.
 *
 * BUG-4 FIX: Replaced `SELECT *` with explicit minimal column lists.
 */

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import type { ParentExamResult } from "../types/parent-dashboard.types";

/** Raw breakdown entry shape from score-attempt Edge Function */
interface RawBreakdownEntry {
  question_id: string;
  sequence_number?: number;
  response_type?: string;
  score?: number;
  max_score?: number;
  is_correct?: boolean;
  requires_manual_review?: boolean;
}

export interface UseParentExamDetailReturn {
  status: "idle" | "loading" | "error" | "success";
  result: ParentExamResult | null;
  error: string | null;
}

export function useParentExamDetail(
  childId: string | null,
  attemptId: string | null,
): UseParentExamDetailReturn {
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [result, setResult] = useState<ParentExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId || !attemptId) {
      setStatus("idle");
      setResult(null);
      return;
    }

    const load = async () => {
      setStatus("loading");
      setError(null);

      try {
        // 1. Load attempt — explicit columns only (BUG-4 FIX)
        const { data: attempt, error: attErr } = await supabase
          .from("exam_attempts")
          .select(
            "id, exam_package_id, student_id, status, started_at, submitted_at",
          )
          .eq("id", attemptId)
          .eq("student_id", childId) // Security: verify ownership
          .single();

        if (attErr) throw attErr;

        if (!attempt) {
          throw new Error("Exam attempt not found");
        }

        if (!attempt.submitted_at) {
          throw new Error("Exam not yet submitted");
        }

        // 2. Load exam package — explicit columns only (BUG-4 FIX)
        const { data: pkg, error: pkgErr } = await supabase
          .from("exam_packages")
          .select(
            "id, title, subject, year_level, total_marks, duration_minutes",
          )
          .eq("id", attempt.exam_package_id)
          .single();

        if (pkgErr) throw pkgErr;

        // 3. Load result from exam_results table (BUG-3 FIX)
        // Previously this tried to read marking_status and total_score
        // from exam_attempts, and marks_awarded from exam_responses —
        // none of which exist. The actual scored data lives in exam_results.
        const { data: examResult, error: resErr } = await supabase
          .from("exam_results")
          .select("total_score, max_score, percentage, passed, breakdown")
          .eq("attempt_id", attemptId)
          .maybeSingle();

        if (resErr) throw resErr;

        if (!examResult) {
          throw new Error("Exam not yet marked");
        }

        // 4. Extract per-question scores from breakdown JSONB (BUG-3 FIX)
        // The breakdown contains per-question scoring from the score-attempt
        // Edge Function. We only expose numeric marks to parents — no
        // question content, correct answers, or student responses.
        const rawBreakdown = Array.isArray(examResult.breakdown)
          ? (examResult.breakdown as RawBreakdownEntry[])
          : [];

        const questionResults = rawBreakdown.map((entry) => ({
          question_number: entry.sequence_number ?? 0,
          marks_available: entry.max_score ?? 0,
          marks_awarded: entry.score ?? 0,
          response_type: entry.response_type ?? "unknown",
        }));

        // Sort by question number
        questionResults.sort((a, b) => a.question_number - b.question_number);

        setResult({
          exam_title: pkg.title,
          subject: pkg.subject,
          year_level: pkg.year_level,
          total_marks: pkg.total_marks,
          submitted_at: attempt.submitted_at,
          total_score: examResult.total_score,
          percentage: Math.round(examResult.percentage),
          questions: questionResults,
        });

        setStatus("success");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load exam details";
        setError(message);
        setStatus("error");
      }
    };

    load();
  }, [childId, attemptId]);

  return {
    status,
    result,
    error,
  };
}
