/**
 * MindMosaic Contracts
 *
 * This module exports all contract definitions used across the application.
 */

// Exam Package Schema (Zod)
export {
  EXAM_PACKAGE_SCHEMA_VERSION,
  AssessmentType,
  ExamStatus,
  Subject,
  Difficulty,
  ResponseType,
  MediaType,
  MediaPlacement,
  PromptBlockType,
  MediaReferenceSchema,
  PromptBlockSchema,
  McqOptionSchema,
  CorrectAnswerSchema,
  QuestionSchema,
  ExamMetadataSchema,
  MediaAssetSchema,
  ExamPackageSchema,
  validateExamPackage,
  validateMediaReferences,
  validateTotalMarks,
} from "./exam-package.schema";

export type {
  MediaReference,
  PromptBlock,
  McqOption,
  CorrectAnswer,
  Question,
  ExamMetadata,
  MediaAsset,
  ExamPackage,
} from "./exam-package.schema";

// Exam Package JSON Schema (for edge functions)
export { EXAM_PACKAGE_JSON_SCHEMA } from "./exam-package.json-schema";
