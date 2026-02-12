/**
 * MindMosaic — Exam Publishing Types (Day 20)
 *
 * Types for exam lifecycle and scheduling.
 */

// =============================================================================
// Exam Status & Lifecycle
// =============================================================================

export type ExamStatus = "draft" | "published" | "archived";

export interface ExamPackage {
  id: string;
  title: string;
  year_level: number;
  subject: string;
  assessment_type: "naplan" | "icas";
  duration_minutes: number;
  total_marks: number;
  version: string;
  schema_version: string;
  status: ExamStatus;
  instructions: string | null;
  pass_mark_percentage: number;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Publishing Operations
// =============================================================================

export interface PublishingOperation {
  type: "publish" | "unpublish" | "archive";
  packageId: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
}

export interface PublishingResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Validation
// =============================================================================

export interface ExamVisibilityRules {
  isEditable: boolean; // Can admin edit?
  isVisibleToStudents: boolean; // Can students see?
  canStartAttempt: boolean; // Can students start new attempt?
  reason?: string; // Why blocked?
}
