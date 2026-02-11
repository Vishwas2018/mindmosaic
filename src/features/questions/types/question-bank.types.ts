/**
 * MindMosaic — Question Bank Types (Day 19)
 *
 * Types for admin question authoring and management.
 */

import type { Json } from "../../../lib/database.types";

// =============================================================================
// Question Bank Types
// =============================================================================

export interface QuestionBankItem {
  id: string;
  exam_package_id: string; // Questions belong to packages (bank or authored)
  sequence_number: number;
  difficulty: "easy" | "medium" | "hard";
  response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
  marks: number;
  prompt_blocks: PromptBlock[];
  media_references: Json | null;
  tags: string[];
  hint: string | null;
}

export interface QuestionWithAnswer extends QuestionBankItem {
  options?: QuestionOption[];
  correctAnswer?: CorrectAnswer;
}

export interface QuestionOption {
  question_id: string;
  option_id: string;
  content: string;
  media_reference: Json | null;
}

export interface CorrectAnswer {
  question_id: string;
  answer_type: string;
  correct_option_id: string | null;
  correct_option_ids: string[] | null;
  accepted_answers: Json | null;
  case_sensitive: boolean;
  exact_value: number | null;
  range_min: number | null;
  range_max: number | null;
  tolerance: number | null;
  unit: string | null;
  rubric: Json | null;
  sample_response: string | null;
}

// =============================================================================
// Prompt Block Types (from Day 15 contract)
// =============================================================================

export type PromptBlock =
  | { type: "text"; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; content: string; attribution?: string }
  | { type: "instruction"; content: string };

// =============================================================================
// Exam Blueprint Types
// =============================================================================

export interface ExamBlueprint {
  title: string;
  subject: string;
  year_level: number;
  assessment_type: "naplan" | "icas";
  duration_minutes: number;
  sections: BlueprintSection[];
}

export interface BlueprintSection {
  name: string;
  question_count: number;
  filters: QuestionFilters;
}

export interface QuestionFilters {
  subject?: string;
  tags?: string[];
  difficulty?: ("easy" | "medium" | "hard")[];
  response_type?: ("mcq" | "multi" | "short" | "extended" | "numeric")[];
  marks?: number;
}

// =============================================================================
// Generation Types
// =============================================================================

export interface GeneratedExam {
  package_id: string;
  questions: QuestionWithAnswer[];
  total_marks: number;
}

export interface GenerationResult {
  success: boolean;
  exam?: GeneratedExam;
  error?: string;
}
