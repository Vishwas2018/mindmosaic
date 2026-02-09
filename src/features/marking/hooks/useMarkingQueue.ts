/**
 * useMarkingQueue — Loads attempts awaiting or completed marking.
 *
 * Design decisions:
 * - Only "submitted" and "evaluated" attempts appear in the queue.
 *   "started" attempts are still in-progress and not reviewable.
 * - Admin RLS grants full read access to exam_attempts, profiles, and
 *   exam_packages, so no RPC or Edge Function is needed here.
 * - We join profiles to show student identity (id + role confirmation).
 *   In a production system you'd join a display_name column — for now
 *   we surface the student_id which the admin can cross-reference.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface MarkingQueueAttempt {
  id: string;
  exam_package_id: string;
  student_id: string;
  status: "submitted" | "evaluated";
  started_at: string;
  submitted_at: string | null;
  evaluated_at: string | null;
  /** Joined from exam_packages */
  exam_title: string;
  year_level: number;
  subject: string;
  assessment_type: "naplan" | "icas";
  total_marks: number;
  /** Whether an exam_results row exists for this attempt */
  has_result: boolean;
}

type QueueStatus = "loading" | "ready" | "error";

export interface UseMarkingQueueReturn {
  status: QueueStatus;
  attempts: MarkingQueueAttempt[];
  error: string | null;
  reload: () => void;
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useMarkingQueue(): UseMarkingQueueReturn {
  const [status, setStatus] = useState<QueueStatus>("loading");
  const [attempts, setAttempts] = useState<MarkingQueueAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      // Fetch submitted + evaluated attempts with exam package metadata.
      // Admin RLS allows reading all rows in both tables.
      const { data: rawAttempts, error: attErr } = await supabase
        .from("exam_attempts")
        .select(
          `
          id,
          exam_package_id,
          student_id,
          status,
          started_at,
          submitted_at,
          evaluated_at,
          exam_packages (
            title,
            year_level,
            subject,
            assessment_type,
            total_marks
          )
        `,
        )
        .in("status", ["submitted", "evaluated"])
        .order("submitted_at", { ascending: false });

      if (attErr) throw attErr;

      // Check which attempts already have results
      const attemptIds = (rawAttempts ?? []).map((a) => a.id);
      let resultSet = new Set<string>();

      if (attemptIds.length > 0) {
        const { data: results, error: resErr } = await supabase
          .from("exam_results")
          .select("attempt_id")
          .in("attempt_id", attemptIds);

        if (resErr) throw resErr;
        resultSet = new Set((results ?? []).map((r) => r.attempt_id));
      }

      // Assemble queue entries
      const assembled: MarkingQueueAttempt[] = (rawAttempts ?? []).map((a) => {
        // Supabase returns joined relation as object (single) or array.
        // exam_attempts → exam_packages is many-to-one, so it returns an object.
        const pkg = a.exam_packages as unknown as {
          title: string;
          year_level: number;
          subject: string;
          assessment_type: "naplan" | "icas";
          total_marks: number;
        } | null;

        return {
          id: a.id,
          exam_package_id: a.exam_package_id,
          student_id: a.student_id,
          status: a.status as "submitted" | "evaluated",
          started_at: a.started_at,
          submitted_at: a.submitted_at,
          evaluated_at: a.evaluated_at,
          exam_title: pkg?.title ?? "Unknown Exam",
          year_level: pkg?.year_level ?? 0,
          subject: pkg?.subject ?? "—",
          assessment_type: pkg?.assessment_type ?? "naplan",
          total_marks: pkg?.total_marks ?? 0,
          has_result: resultSet.has(a.id),
        };
      });

      setAttempts(assembled);
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load marking queue.";
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, attempts, error, reload: load };
}
