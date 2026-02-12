/**
 * useParentExamDetail — Load detailed exam result (read-only)
 *
 * Returns question-level marks but NOT:
 * - Question prompts/content
 * - Student responses
 * - Correct answers
 * - Marking comments
 */

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import type { ParentExamResult } from "../types/parent-dashboard.types";

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
        // 1. Load attempt
        const { data: attempt, error: attErr } = await supabase
          .from("exam_attempts")
          .select("*")
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

        if (attempt.marking_status !== "complete") {
          throw new Error("Exam not yet marked");
        }

        // 2. Load exam package
        const { data: pkg, error: pkgErr } = await supabase
          .from("exam_packages")
          .select("*")
          .eq("id", attempt.exam_package_id)
          .single();

        if (pkgErr) throw pkgErr;

        // 3. Load responses (marks only, no content)
        const { data: responses, error: resErr } = await supabase
          .from("exam_responses")
          .select("question_id, marks_awarded")
          .eq("attempt_id", attemptId)
          .order("sequence_number", { ascending: true });

        if (resErr) throw resErr;

        // 4. Load questions (for marks_available only)
        const questionIds = (responses || []).map((r) => r.question_id);
        const { data: questions, error: qErr } = await supabase
          .from("exam_questions")
          .select("id, sequence_number, marks, response_type")
          .in("id", questionIds);

        if (qErr) throw qErr;

        // 5. Build question map
        const questionMap = new Map((questions || []).map((q) => [q.id, q]));

        // 6. Build question results (marks only)
        const questionResults = (responses || []).map((res) => {
          const question = questionMap.get(res.question_id);
          return {
            question_number: question?.sequence_number || 0,
            marks_available: question?.marks || 0,
            marks_awarded: res.marks_awarded,
            response_type: question?.response_type || "unknown",
          };
        });

        // 7. Sort by question number
        questionResults.sort((a, b) => a.question_number - b.question_number);

        setResult({
          exam_title: pkg.title,
          subject: pkg.subject,
          year_level: pkg.year_level,
          total_marks: pkg.total_marks,
          submitted_at: attempt.submitted_at,
          total_score: attempt.total_score || 0,
          percentage:
            pkg.total_marks > 0
              ? Math.round(((attempt.total_score || 0) / pkg.total_marks) * 100)
              : 0,
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
