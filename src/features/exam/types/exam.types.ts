/**
 * MindMosaic — Exam Feature Types
 *
 * Frontend types for exam runtime.
 * Maps to database schema but optimized for UI usage.
 */

import type {
  ExamPackage,
  ExamQuestion,
  ExamQuestionOption,
  ExamAttempt,
  ExamResponse,
  ExamResult,
  ResponseType,
  Json,
} from "../../../lib/database.types";

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type {
  ExamPackage,
  ExamQuestion,
  ExamQuestionOption,
  ExamAttempt,
  ExamResponse,
  ExamResult,
  ResponseType,
};

// =============================================================================
// Prompt Block Types (from contract)
// =============================================================================

export type PromptBlockType = "text" | "heading" | "list" | "quote" | "instruction";

export interface TextBlock {
  type: "text";
  content: string;
}

export interface HeadingBlock {
  type: "heading";
  level: 1 | 2 | 3;
  content: string;
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface QuoteBlock {
  type: "quote";
  content: string;
  attribution?: string;
}

export interface InstructionBlock {
  type: "instruction";
  content: string;
}

export type PromptBlock =
  | TextBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | InstructionBlock;

// =============================================================================
// Media Reference Types
// =============================================================================

export interface MediaReference {
  mediaId: string;
  type: "image" | "diagram" | "graph";
  placement: "above" | "inline" | "below";
  altText: string;
  caption?: string;
}

// =============================================================================
// Response Data Types
// =============================================================================

export interface McqResponseData {
  selectedOptionId: string;
}

export interface MultiSelectResponseData {
  selectedOptionIds: string[];
}

export interface ShortResponseData {
  answer: string;
}

export interface NumericResponseData {
  answer: number;
}

export interface ExtendedResponseData {
  answer: string;
}

export type ResponseData =
  | McqResponseData
  | MultiSelectResponseData
  | ShortResponseData
  | NumericResponseData
  | ExtendedResponseData;

// =============================================================================
// UI State Types
// =============================================================================

export interface QuestionWithOptions extends ExamQuestion {
  options?: ExamQuestionOption[];
  prompt_blocks: PromptBlock[];
  media_references: MediaReference[] | null;
}

export interface AttemptState {
  attempt: ExamAttempt;
  examPackage: ExamPackage;
  questions: QuestionWithOptions[];
  responses: Map<string, ResponseData>;
  currentQuestionIndex: number;
  isSaving: boolean;
  lastSavedAt: Date | null;
  isSubmitting: boolean;
}

export interface SavedResponse {
  questionId: string;
  responseData: ResponseData;
  savedAt: Date;
}

// =============================================================================
// Edge Function Response Types
// =============================================================================

export interface StartAttemptResponse {
  attempt_id: string;
  started_at: string;
  existing_attempt_id?: string;
}

export interface SaveResponseResponse {
  response_id: string;
  is_update: boolean;
  responded_at: string;
}

export interface SubmitAttemptResponse {
  submitted_at: string;
  answered_questions: number;
  total_questions: number;
}

export interface ScoreAttemptResponse {
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  breakdown: Array<{
    question_id: string;
    sequence_number: number;
    response_type: ResponseType;
    score: number;
    max_score: number;
    is_correct: boolean;
    requires_manual_review?: boolean;
  }>;
}

// =============================================================================
// Helper Type Guards
// =============================================================================

export function isMcqResponse(data: ResponseData): data is McqResponseData {
  return "selectedOptionId" in data;
}

export function isMultiSelectResponse(data: ResponseData): data is MultiSelectResponseData {
  return "selectedOptionIds" in data;
}

export function isShortResponse(data: ResponseData): data is ShortResponseData {
  return "answer" in data && typeof data.answer === "string";
}

export function isNumericResponse(data: ResponseData): data is NumericResponseData {
  return "answer" in data && typeof data.answer === "number";
}

export function isExtendedResponse(data: ResponseData): data is ExtendedResponseData {
  return "answer" in data && typeof data.answer === "string";
}

// =============================================================================
// Utility Functions
// =============================================================================

export function parsePromptBlocks(json: Json): PromptBlock[] {
  if (!Array.isArray(json)) {
    return [];
  }
  return json as PromptBlock[];
}

export function parseMediaReferences(json: Json | null): MediaReference[] | null {
  if (!json || !Array.isArray(json)) {
    return null;
  }
  return json as MediaReference[];
}

export function getResponseForQuestion(
  responses: Map<string, ResponseData>,
  questionId: string
): ResponseData | undefined {
  return responses.get(questionId);
}

export function isQuestionAnswered(
  responses: Map<string, ResponseData>,
  questionId: string
): boolean {
  const response = responses.get(questionId);
  if (!response) return false;

  if (isMcqResponse(response)) {
    return response.selectedOptionId !== "";
  }
  if (isMultiSelectResponse(response)) {
    return response.selectedOptionIds.length > 0;
  }
  if (isShortResponse(response) || isExtendedResponse(response)) {
    return response.answer.trim() !== "";
  }
  if (isNumericResponse(response)) {
    return !isNaN(response.answer);
  }

  return false;
}
