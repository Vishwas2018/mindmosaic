/**
 * useExamPublishing — Manage exam lifecycle and scheduling
 *
 * Handles:
 * - Publishing/unpublishing exams
 * - Setting availability windows
 * - Archiving exams
 * - Validating lifecycle rules
 */

import { useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type {
  ExamPackage,
  PublishingResult,
  ExamVisibilityRules,
} from "../types/exam-publishing.types";

export interface UseExamPublishingReturn {
  isUpdating: boolean;
  updateError: string | null;
  publishExam: (
    packageId: string,
    availableFrom?: string | null,
    availableUntil?: string | null,
  ) => Promise<PublishingResult>;
  unpublishExam: (packageId: string) => Promise<PublishingResult>;
  archiveExam: (packageId: string) => Promise<PublishingResult>;
  checkVisibility: (exam: ExamPackage, isAdmin: boolean) => ExamVisibilityRules;
}

export function useExamPublishing(): UseExamPublishingReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // ──────────────────────────────────────────────────
  // Publish Exam
  // ──────────────────────────────────────────────────
  const publishExam = useCallback(
    async (
      packageId: string,
      availableFrom?: string | null,
      availableUntil?: string | null,
    ): Promise<PublishingResult> => {
      setIsUpdating(true);
      setUpdateError(null);

      try {
        // Validate dates
        if (availableFrom && availableUntil) {
          const from = new Date(availableFrom);
          const until = new Date(availableUntil);
          if (from >= until) {
            throw new Error("Available from must be before available until");
          }
        }

        // Update to published
        const { error } = await supabase
          .from("exam_packages")
          .update({
            status: "published",
            available_from: availableFrom || null,
            available_until: availableUntil || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", packageId);

        if (error) throw error;

        setIsUpdating(false);
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to publish exam";
        setUpdateError(message);
        setIsUpdating(false);
        return { success: false, error: message };
      }
    },
    [],
  );

  // ──────────────────────────────────────────────────
  // Unpublish Exam (back to draft)
  // ──────────────────────────────────────────────────
  const unpublishExam = useCallback(
    async (packageId: string): Promise<PublishingResult> => {
      setIsUpdating(true);
      setUpdateError(null);

      try {
        // Check if attempts exist
        const { data: attempts, error: attErr } = await supabase
          .from("exam_attempts")
          .select("id")
          .eq("exam_package_id", packageId)
          .limit(1);

        if (attErr) throw attErr;

        if (attempts && attempts.length > 0) {
          throw new Error(
            "Cannot unpublish: exam has student attempts. Archive instead.",
          );
        }

        // Update to draft
        const { error } = await supabase
          .from("exam_packages")
          .update({
            status: "draft",
            available_from: null,
            available_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", packageId);

        if (error) throw error;

        setIsUpdating(false);
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to unpublish exam";
        setUpdateError(message);
        setIsUpdating(false);
        return { success: false, error: message };
      }
    },
    [],
  );

  // ──────────────────────────────────────────────────
  // Archive Exam
  // ──────────────────────────────────────────────────
  const archiveExam = useCallback(
    async (packageId: string): Promise<PublishingResult> => {
      setIsUpdating(true);
      setUpdateError(null);

      try {
        const { error } = await supabase
          .from("exam_packages")
          .update({
            status: "archived",
            updated_at: new Date().toISOString(),
          })
          .eq("id", packageId);

        if (error) throw error;

        setIsUpdating(false);
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to archive exam";
        setUpdateError(message);
        setIsUpdating(false);
        return { success: false, error: message };
      }
    },
    [],
  );

  // ──────────────────────────────────────────────────
  // Check Visibility Rules
  // ──────────────────────────────────────────────────
  const checkVisibility = useCallback(
    (exam: ExamPackage, isAdmin: boolean): ExamVisibilityRules => {
      const now = new Date();

      // Admins always see everything
      if (isAdmin) {
        return {
          isEditable: exam.status === "draft",
          isVisibleToStudents: exam.status === "published",
          canStartAttempt: false, // Admins don't take exams
        };
      }

      // Archived exams hidden from everyone except admins
      if (exam.status === "archived") {
        return {
          isEditable: false,
          isVisibleToStudents: false,
          canStartAttempt: false,
          reason: "Exam is archived",
        };
      }

      // Draft exams hidden from students
      if (exam.status === "draft") {
        return {
          isEditable: false,
          isVisibleToStudents: false,
          canStartAttempt: false,
          reason: "Exam is not published yet",
        };
      }

      // Published exams — check availability window
      const from = exam.available_from ? new Date(exam.available_from) : null;
      const until = exam.available_until
        ? new Date(exam.available_until)
        : null;

      // Before availability window
      if (from && now < from) {
        return {
          isEditable: false,
          isVisibleToStudents: true,
          canStartAttempt: false,
          reason: `Exam opens on ${from.toLocaleDateString()}`,
        };
      }

      // After availability window
      if (until && now > until) {
        return {
          isEditable: false,
          isVisibleToStudents: true,
          canStartAttempt: false,
          reason: `Exam closed on ${until.toLocaleDateString()}`,
        };
      }

      // Within availability window
      return {
        isEditable: false,
        isVisibleToStudents: true,
        canStartAttempt: true,
      };
    },
    [],
  );

  return {
    isUpdating,
    updateError,
    publishExam,
    unpublishExam,
    archiveExam,
    checkVisibility,
  };
}
