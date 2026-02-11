/**
 * useExamAttempts — Loads attempts + results for a single exam package.
 *
 * Design decisions:
 * - Admin RLS grants full SELECT on exam_attempts, exam_results, and
 *   exam_packages, so no Edge Function is needed.
 * - We fetch exam_results in a separate query and join client-side
 *   rather than using a Supabase join, because exam_results has a
 *   UNIQUE constraint on attempt_id (not a FK from attempts→results),
 *   and the join direction is cleaner this way.
 * - Summary stats (average, median) are computed client-side from the
 *   fetched results. This is appropriate for operational reporting on
 *   reasonable dataset sizes. No backend aggregation needed.
 * - The profiles table only has id + role (no display name), so we
 *   surface the truncated student_id consistent with Day 17.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface ExamPackageSummary {
  id: string;
  title: string;
  year_level: number;
  subject: string;
  assessment_type: "naplan" | "icas";
  duration_minutes: number;
  total_marks: number;
  pass_mark_percentage: number | null;
}

export interface AttemptRow {
  id: string;
  student_id: string;
  status: "started" | "submitted" | "evaluated";
  started_at: string;
  submitted_at: string | null;
  evaluated_at: string | null;
  /** Joined from exam_results (null if not yet scored) */
  result: {
    total_score: number;
    max_score: number;
    percentage: number;
    passed: boolean;
  } | null;
  /** Computed: submitted_at − started_at in seconds */
  time_taken_seconds: number | null;
}

export interface ExamAttemptsSummary {
  total_attempts: number;
  submitted_count: number;
  evaluated_count: number;
  /** Only from evaluated attempts with results */
  average_score: number | null;
  median_score: number | null;
  average_percentage: number | null;
  median_percentage: number | null;
  pass_count: number;
  fail_count: number;
}

type LoadStatus = "loading" | "ready" | "error" | "not-found";

export interface UseExamAttemptsReturn {
  status: LoadStatus;
  examPackage: ExamPackageSummary | null;
  attempts: AttemptRow[];
  summary: ExamAttemptsSummary | null;
  error: string | null;
  reload: () => void;
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useExamAttempts(
  packageId: string | undefined,
): UseExamAttemptsReturn {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [examPackage, setExamPackage] = useState<ExamPackageSummary | null>(
    null,
  );
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [summary, setSummary] = useState<ExamAttemptsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!packageId) {
      setStatus("not-found");
      setError("No exam package ID provided.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Fetch the exam package metadata
      const { data: pkg, error: pkgErr } = await supabase
        .from("exam_packages")
        .select(
          "id, title, year_level, subject, assessment_type, duration_minutes, total_marks, pass_mark_percentage",
        )
        .eq("id", packageId)
        .maybeSingle();

      if (pkgErr) throw pkgErr;
      if (!pkg) {
        setStatus("not-found");
        setError("Exam package not found.");
        return;
      }

      // 2. Fetch all attempts for this package (not just submitted/evaluated —
      //    admin may want to see started attempts too for operational awareness)
      const { data: rawAttempts, error: attErr } = await supabase
        .from("exam_attempts")
        .select(
          "id, student_id, status, started_at, submitted_at, evaluated_at",
        )
        .eq("exam_package_id", packageId)
        .order("started_at", { ascending: false });

      if (attErr) throw attErr;

      const attemptIds = (rawAttempts ?? []).map((a) => a.id);

      // 3. Fetch results for these attempts
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

      // 4. Assemble attempt rows
      const assembled: AttemptRow[] = (rawAttempts ?? []).map((a) => {
        let timeTakenSeconds: number | null = null;
        if (a.submitted_at && a.started_at) {
          const started = new Date(a.started_at).getTime();
          const submitted = new Date(a.submitted_at).getTime();
          timeTakenSeconds = Math.max(
            0,
            Math.round((submitted - started) / 1000),
          );
        }

        return {
          id: a.id,
          student_id: a.student_id,
          status: a.status as AttemptRow["status"],
          started_at: a.started_at,
          submitted_at: a.submitted_at,
          evaluated_at: a.evaluated_at,
          result: resultsMap.get(a.id) ?? null,
          time_taken_seconds: timeTakenSeconds,
        };
      });

      // 5. Compute summary statistics
      const submittedOrEvaluated = assembled.filter(
        (a) => a.status === "submitted" || a.status === "evaluated",
      );
      const evaluated = assembled.filter((a) => a.result !== null);
      const percentages = evaluated.map((a) => a.result!.percentage);

      const computedSummary: ExamAttemptsSummary = {
        total_attempts: assembled.length,
        submitted_count: submittedOrEvaluated.filter(
          (a) => a.status === "submitted",
        ).length,
        evaluated_count: evaluated.length,
        average_score:
          evaluated.length > 0
            ? Math.round(
                (evaluated.reduce((s, a) => s + a.result!.total_score, 0) /
                  evaluated.length) *
                  100,
              ) / 100
            : null,
        median_score:
          evaluated.length > 0
            ? median(evaluated.map((a) => a.result!.total_score))
            : null,
        average_percentage:
          percentages.length > 0
            ? Math.round(
                (percentages.reduce((s, p) => s + p, 0) / percentages.length) *
                  100,
              ) / 100
            : null,
        median_percentage: percentages.length > 0 ? median(percentages) : null,
        pass_count: evaluated.filter((a) => a.result!.passed).length,
        fail_count: evaluated.filter((a) => !a.result!.passed).length,
      };

      setExamPackage(pkg as ExamPackageSummary);
      setAttempts(assembled);
      setSummary(computedSummary);
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load exam attempts.";
      setError(message);
      setStatus("error");
    }
  }, [packageId]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, examPackage, attempts, summary, error, reload: load };
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  }
  return sorted[mid];
}
