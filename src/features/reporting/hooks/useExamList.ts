/**
 * useExamList — Loads all exam packages for admin selection.
 *
 * The admin needs to pick an exam before viewing its attempts.
 * This hook fetches all packages (draft + published) since admin
 * has full SELECT access. We include attempt counts via a separate
 * query to show which exams have activity.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

export interface ExamListItem {
  id: string;
  title: string;
  year_level: number;
  subject: string;
  assessment_type: "naplan" | "icas";
  status: "draft" | "published";
  total_marks: number;
  created_at: string;
  attempt_count: number;
}

type LoadStatus = "loading" | "ready" | "error";

export interface UseExamListReturn {
  status: LoadStatus;
  exams: ExamListItem[];
  error: string | null;
  reload: () => void;
}

export function useExamList(): UseExamListReturn {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      // Fetch all packages
      const { data: packages, error: pkgErr } = await supabase
        .from("exam_packages")
        .select(
          "id, title, year_level, subject, assessment_type, status, total_marks, created_at"
        )
        .order("created_at", { ascending: false });

      if (pkgErr) throw pkgErr;

      // Fetch attempt counts per package.
      // Supabase doesn't support GROUP BY via the client lib,
      // so we fetch all attempt package IDs and count client-side.
      // For operational reporting this is acceptable.
      const { data: attempts, error: attErr } = await supabase
        .from("exam_attempts")
        .select("exam_package_id");

      if (attErr) throw attErr;

      const countMap = new Map<string, number>();
      for (const a of attempts ?? []) {
        countMap.set(
          a.exam_package_id,
          (countMap.get(a.exam_package_id) ?? 0) + 1
        );
      }

      const assembled: ExamListItem[] = (packages ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        year_level: p.year_level,
        subject: p.subject,
        assessment_type: p.assessment_type as "naplan" | "icas",
        status: p.status as "draft" | "published",
        total_marks: p.total_marks,
        created_at: p.created_at,
        attempt_count: countMap.get(p.id) ?? 0,
      }));

      setExams(assembled);
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load exams.";
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, exams, error, reload: load };
}