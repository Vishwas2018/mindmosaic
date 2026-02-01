/**
 * MindMosaic Exam Package Transformation
 *
 * This module transforms a validated exam package (contract format)
 * into relational database rows for insertion.
 *
 * Maps to Day 8 schema tables:
 * - exam_packages
 * - exam_media_assets
 * - exam_questions
 * - exam_question_options
 * - exam_correct_answers
 */

import type {
  ExamPackageInput,
  QuestionInput,
  CorrectAnswerInput,
  MediaAssetInput,
} from "../validation/validateExamPackage";

// =============================================================================
// Database Row Types (matching Day 8 schema exactly)
// =============================================================================

/**
 * Row for exam_packages table
 */
export interface ExamPackageRow {
  id: string;
  title: string;
  year_level: number;
  subject: string;
  assessment_type: string;
  duration_minutes: number;
  total_marks: number;
  version: string;
  schema_version: string;
  status: string;
  instructions: unknown; // JSONB
  created_at: string;
  updated_at: string;
}

/**
 * Row for exam_media_assets table
 */
export interface ExamMediaAssetRow {
  id: string;
  exam_package_id: string;
  type: string;
  filename: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
}

/**
 * Row for exam_questions table
 */
export interface ExamQuestionRow {
  id: string;
  exam_package_id: string;
  sequence_number: number;
  difficulty: string;
  response_type: string;
  marks: number;
  prompt_blocks: unknown; // JSONB
  media_references: unknown; // JSONB
  tags: unknown; // JSONB
  hint: string | null;
}

/**
 * Row for exam_question_options table
 */
export interface ExamQuestionOptionRow {
  question_id: string;
  option_id: string;
  content: string;
  media_reference: unknown | null; // JSONB
}

/**
 * Row for exam_correct_answers table
 */
export interface ExamCorrectAnswerRow {
  question_id: string;
  answer_type: string;
  // MCQ fields
  correct_option_id: string | null;
  // Short fields
  accepted_answers: unknown | null; // JSONB
  case_sensitive: boolean | null;
  // Numeric fields
  exact_value: number | null;
  range_min: number | null;
  range_max: number | null;
  tolerance: number | null;
  unit: string | null;
  // Extended fields
  rubric: unknown | null; // JSONB
  sample_response: string | null;
}

/**
 * Complete transformed package ready for insertion
 */
export interface TransformedExamPackage {
  examPackage: ExamPackageRow;
  mediaAssets: ExamMediaAssetRow[];
  questions: ExamQuestionRow[];
  questionOptions: ExamQuestionOptionRow[];
  correctAnswers: ExamCorrectAnswerRow[];
}

// =============================================================================
// Transformation Functions
// =============================================================================

/**
 * Transform exam package metadata to database row.
 */
function transformMetadata(input: ExamPackageInput): ExamPackageRow {
  return {
    id: input.metadata.id,
    title: input.metadata.title,
    year_level: input.metadata.yearLevel,
    subject: input.metadata.subject,
    assessment_type: input.metadata.assessmentType,
    duration_minutes: input.metadata.durationMinutes,
    total_marks: input.metadata.totalMarks,
    version: input.metadata.version,
    schema_version: input.metadata.schemaVersion,
    status: input.metadata.status,
    instructions: input.metadata.instructions ?? [],
    created_at: input.metadata.createdAt,
    updated_at: input.metadata.updatedAt,
  };
}

/**
 * Transform media assets to database rows.
 */
function transformMediaAssets(input: ExamPackageInput): ExamMediaAssetRow[] {
  const packageId = input.metadata.id;
  const assets = input.mediaAssets ?? [];

  return assets.map((asset: MediaAssetInput) => ({
    id: asset.id,
    exam_package_id: packageId,
    type: asset.type,
    filename: asset.filename,
    mime_type: asset.mimeType,
    width: asset.width ?? null,
    height: asset.height ?? null,
    size_bytes: asset.sizeBytes ?? null,
  }));
}

/**
 * Transform questions to database rows.
 */
function transformQuestions(input: ExamPackageInput): ExamQuestionRow[] {
  const packageId = input.metadata.id;

  return input.questions.map((question: QuestionInput) => ({
    id: question.id,
    exam_package_id: packageId,
    sequence_number: question.sequenceNumber,
    difficulty: question.difficulty,
    response_type: question.responseType,
    marks: question.marks ?? 1,
    prompt_blocks: question.promptBlocks,
    media_references: question.mediaReferences ?? [],
    tags: question.tags ?? [],
    hint: question.hint ?? null,
  }));
}

/**
 * Transform MCQ options to database rows.
 * Only MCQ questions have options.
 */
function transformQuestionOptions(
  input: ExamPackageInput,
): ExamQuestionOptionRow[] {
  const rows: ExamQuestionOptionRow[] = [];

  for (const question of input.questions) {
    if (question.responseType === "mcq" && question.options) {
      for (const option of question.options) {
        rows.push({
          question_id: question.id,
          option_id: option.id,
          content: option.content,
          media_reference: option.mediaReference ?? null,
        });
      }
    }
  }

  return rows;
}

/**
 * Transform a single correct answer to database row.
 */
function transformCorrectAnswer(
  questionId: string,
  answer: CorrectAnswerInput,
): ExamCorrectAnswerRow {
  const row: ExamCorrectAnswerRow = {
    question_id: questionId,
    answer_type: answer.type,
    // Initialize all nullable fields to null
    correct_option_id: null,
    accepted_answers: null,
    case_sensitive: null,
    exact_value: null,
    range_min: null,
    range_max: null,
    tolerance: null,
    unit: null,
    rubric: null,
    sample_response: null,
  };

  // Populate type-specific fields
  switch (answer.type) {
    case "mcq":
      row.correct_option_id = answer.correctOptionId ?? null;
      break;

    case "short":
      row.accepted_answers = answer.acceptedAnswers ?? null;
      row.case_sensitive = answer.caseSensitive ?? false;
      break;

    case "numeric":
      row.exact_value = answer.exactValue ?? null;
      if (answer.range) {
        row.range_min = answer.range.min;
        row.range_max = answer.range.max;
      }
      row.tolerance = answer.tolerance ?? null;
      row.unit = answer.unit ?? null;
      break;

    case "extended":
      row.rubric = answer.rubric ?? null;
      row.sample_response = answer.sampleResponse ?? null;
      break;
  }

  return row;
}

/**
 * Transform all correct answers to database rows.
 */
function transformCorrectAnswers(
  input: ExamPackageInput,
): ExamCorrectAnswerRow[] {
  return input.questions.map((question: QuestionInput) =>
    transformCorrectAnswer(question.id, question.correctAnswer),
  );
}

// =============================================================================
// Main Transform Function
// =============================================================================

/**
 * Transform a validated exam package into database rows.
 *
 * @param input - Validated exam package from contract
 * @returns TransformedExamPackage - All rows needed for insertion
 */
export function transformExamPackage(
  input: ExamPackageInput,
): TransformedExamPackage {
  return {
    examPackage: transformMetadata(input),
    mediaAssets: transformMediaAssets(input),
    questions: transformQuestions(input),
    questionOptions: transformQuestionOptions(input),
    correctAnswers: transformCorrectAnswers(input),
  };
}
