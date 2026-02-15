/**
 * useParentExamResults — Load child's exam results (read-only)
 *
 * Returns:
 * - List of exams
 * - Attempt status
 * - Scores (if marked)
 *
 * Does NOT return:
 * - Question prompts
 * - Correct answers
 * - Marking comments
 * - Draft or archived exams
 *
 * BUG-3 FIX: Rewrote to fetch scores from `exam_results` table
 * instead of non-existent `marking_status` and `total_score` fields
 * on `exam_attempts`.
 *
 * BUG-5 FIX: Replaced `SELECT *` with explicit minimal column lists.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type { ParentExamSummary } from "../types/parent-dashboard.types";

export interface UseParentExamResultsReturn {
  status: "idle" | "loading" | "error" | "success";
  exams: ParentExamSummary[];
  error: string | null;
  reload: () => void;
}

export function useParentExamResults(
  childId: string | null,
): UseParentExamResultsReturn {
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [exams, setExams] = useState<ParentExamSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId) {
      setStatus("idle");
      setExams([]);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Load all published exams — explicit columns only (BUG-5 FIX)
      // Excludes draft and archived exams as per design requirements.
      const { data: packages, error: pkgErr } = await supabase
        .from("exam_packages")
        .select(
          "id, title, subject, year_level, duration_minutes, total_marks, assessment_type",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (pkgErr) throw pkgErr;

      // 2. Load child's attempts — explicit columns only (BUG-5 FIX)
      const { data: attempts, error: attErr } = await supabase
        .from("exam_attempts")
        .select("id, exam_package_id, status, started_at, submitted_at")
        .eq("student_id", childId);

      if (attErr) throw attErr;

      // 3. Build attempt map (keyed by exam_package_id)
      const attemptMap = new Map(
        (attempts || []).map((att) => [att.exam_package_id, att]),
      );

      // 4. Batch-fetch exam_results for all attempts (BUG-3 FIX)
      // Previously this tried to read `marking_status` and `total_score`
      // directly from exam_attempts — these fields don't exist.
      // The actual scored data lives in the exam_results table.
      const attemptIds = (attempts || []).map((a) => a.id);
      const resultsMap = new Map<
        string,
        {
          total_score: number;
          max_score: number;
          percentage: number;
          passed: boolean;
        }
      >();

      if (attemptIds.length > 0) {
        const { data: results, error: resErr } = await supabase
          .from("exam_results")
          .select("attempt_id, total_score, max_score, percentage, passed")
          .in("attempt_id", attemptIds);

        if (resErr) throw resErr;

        for (const r of results ?? []) {
          resultsMap.set(r.attempt_id, {
            total_score: r.total_score,
            max_score: r.max_score,
            percentage: r.percentage,
            passed: r.passed,
          });
        }
      }

      // 5. Build exam summaries
      const summaries: ParentExamSummary[] = (packages || []).map((pkg) => {
        const attempt = attemptMap.get(pkg.id);

        let attemptStatus: "not_started" | "in_progress" | "submitted" =
          "not_started";
        if (attempt) {
          attemptStatus = attempt.submitted_at ? "submitted" : "in_progress";
        }

        // Look up score from exam_results (BUG-3 FIX)
        const examResult = attempt ? resultsMap.get(attempt.id) : null;
        const isMarked = !!examResult;
        const totalScore = examResult?.total_score ?? null;
        const percentage = examResult
          ? Math.round(examResult.percentage)
          : null;

        return {
          exam_id: pkg.id,
          exam_title: pkg.title,
          subject: pkg.subject,
          year_level: pkg.year_level,
          duration_minutes: pkg.duration_minutes,
          total_marks: pkg.total_marks,
          assessment_type: pkg.assessment_type,
          attempt_id: attempt?.id || null,
          status: attemptStatus,
          submitted_at: attempt?.submitted_at || null,
          total_score: totalScore,
          percentage,
          is_marked: isMarked,
        };
      });

      setExams(summaries);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load exam results";
      setError(message);
      setStatus("error");
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    status,
    exams,
    error,
    reload: load,
  };
}
