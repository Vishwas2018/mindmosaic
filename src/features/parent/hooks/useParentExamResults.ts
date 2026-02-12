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
 */

import { useState, useEffect } from "react";
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

  const load = async () => {
    if (!childId) {
      setStatus("idle");
      setExams([]);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Load all published exams (not draft/archived)
      const { data: packages, error: pkgErr } = await supabase
        .from("exam_packages")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (pkgErr) throw pkgErr;

      // 2. Load child's attempts
      const { data: attempts, error: attErr } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("student_id", childId);

      if (attErr) throw attErr;

      // 3. Build attempt map
      const attemptMap = new Map(
        (attempts || []).map((att) => [att.exam_package_id, att]),
      );

      // 4. Build exam summaries
      const summaries: ParentExamSummary[] = (packages || []).map((pkg) => {
        const attempt = attemptMap.get(pkg.id);

        let attemptStatus: "not_started" | "in_progress" | "submitted" =
          "not_started";
        if (attempt) {
          attemptStatus = attempt.submitted_at ? "submitted" : "in_progress";
        }

        // Calculate score if marked
        let totalScore: number | null = null;
        let percentage: number | null = null;
        let isMarked = false;

        if (attempt?.submitted_at && attempt.marking_status === "complete") {
          // Load responses to calculate score
          // Note: We don't expose response content, just marks
          totalScore = attempt.total_score || 0;
          percentage =
            pkg.total_marks > 0
              ? Math.round((totalScore / pkg.total_marks) * 100)
              : 0;
          isMarked = true;
        }

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
  };

  useEffect(() => {
    load();
  }, [childId]);

  return {
    status,
    exams,
    error,
    reload: load,
  };
}
