/**
 * MindMosaic — Parent Dashboard Types (Day 21)
 *
 * Types for parent read-only access to child's exam data.
 */

// =============================================================================
// Profile & Relationships
// =============================================================================

export interface ChildProfile {
  id: string;
  full_name: string;
  year_level: number;
  email: string;
}

// Note: Assumes profiles table has a parent_id field linking to parent user
// If missing, hook will detect and provide clear error message

// =============================================================================
// Exam Summary for Parents
// =============================================================================

export interface ParentExamSummary {
  exam_id: string;
  exam_title: string;
  subject: string;
  year_level: number;
  duration_minutes: number;
  total_marks: number;
  assessment_type: "naplan" | "icas";

  // Attempt data
  attempt_id: string | null;
  status: "not_started" | "in_progress" | "submitted";
  submitted_at: string | null;

  // Results (if marked)
  total_score: number | null;
  percentage: number | null;
  is_marked: boolean;
}

// =============================================================================
// Detailed Exam Results
// =============================================================================

export interface ParentExamResult {
  exam_title: string;
  subject: string;
  year_level: number;
  total_marks: number;
  submitted_at: string;

  // Overall scores
  total_score: number;
  percentage: number;

  // Question-level marks (NO answers or prompts)
  questions: ParentQuestionResult[];
}

export interface ParentQuestionResult {
  question_number: number;
  marks_available: number;
  marks_awarded: number | null;
  response_type: string;
}

// =============================================================================
// Progress Overview
// =============================================================================

export interface ProgressSummary {
  total_exams: number;
  completed_exams: number;
  in_progress: number;
  not_started: number;
  average_percentage: number | null;
  exams_by_subject: SubjectSummary[];
}

export interface SubjectSummary {
  subject: string;
  exam_count: number;
  average_percentage: number | null;
  highest_score: number | null;
  lowest_score: number | null;
}
