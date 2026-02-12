/**
 * examVisibility — Utilities for filtering exams by visibility rules
 *
 * Used by student exam list to enforce:
 * - Status filtering (published only)
 * - Availability window checks
 */

import type { ExamPackage } from "../types/exam-publishing.types";

/**
 * Filter exams visible to students
 *
 * Rules:
 * - Only published exams
 * - Must be within availability window (or no window set)
 */
export function filterVisibleExams(exams: ExamPackage[]): ExamPackage[] {
  const now = new Date();

  return exams.filter((exam) => {
    // Must be published
    if (exam.status !== "published") return false;

    // Check availability window
    const from = exam.available_from ? new Date(exam.available_from) : null;
    const until = exam.available_until ? new Date(exam.available_until) : null;

    // Before window
    if (from && now < from) return false;

    // After window
    if (until && now > until) return false;

    return true;
  });
}

/**
 * Check if student can start new attempt
 *
 * Rules:
 * - Exam must be published
 * - Must be within availability window
 */
export function canStartAttempt(exam: ExamPackage): {
  allowed: boolean;
  reason?: string;
} {
  const now = new Date();

  // Must be published
  if (exam.status !== "published") {
    return { allowed: false, reason: "Exam is not available" };
  }

  // Check availability window
  const from = exam.available_from ? new Date(exam.available_from) : null;
  const until = exam.available_until ? new Date(exam.available_until) : null;

  // Before window
  if (from && now < from) {
    return {
      allowed: false,
      reason: `Exam opens on ${from.toLocaleDateString("en-AU", {
        dateStyle: "medium",
      })}`,
    };
  }

  // After window
  if (until && now > until) {
    return {
      allowed: false,
      reason: `Exam closed on ${until.toLocaleDateString("en-AU", {
        dateStyle: "medium",
      })}`,
    };
  }

  return { allowed: true };
}

/**
 * Get exam availability status for display
 */
export function getAvailabilityStatus(exam: ExamPackage): {
  status: "upcoming" | "open" | "closed" | "draft" | "archived";
  message: string;
} {
  const now = new Date();

  if (exam.status === "draft") {
    return { status: "draft", message: "Not published" };
  }

  if (exam.status === "archived") {
    return { status: "archived", message: "Archived" };
  }

  const from = exam.available_from ? new Date(exam.available_from) : null;
  const until = exam.available_until ? new Date(exam.available_until) : null;

  // Before window
  if (from && now < from) {
    return {
      status: "upcoming",
      message: `Opens ${from.toLocaleDateString("en-AU", {
        dateStyle: "medium",
      })}`,
    };
  }

  // After window
  if (until && now > until) {
    return {
      status: "closed",
      message: `Closed ${until.toLocaleDateString("en-AU", {
        dateStyle: "medium",
      })}`,
    };
  }

  // Within window or no restrictions
  return { status: "open", message: "Available now" };
}
