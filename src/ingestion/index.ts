/**
 * MindMosaic Exam Package Ingestion
 *
 * This module provides the official ingestion pipeline for exam packages.
 */

export { transformExamPackage } from "./transformExamPackage";
export type {
  TransformedExamPackage,
  ExamPackageRow,
  ExamMediaAssetRow,
  ExamQuestionRow,
  ExamQuestionOptionRow,
  ExamCorrectAnswerRow,
} from "./transformExamPackage";

export { insertExamPackageData, insertExamPackageTransaction } from "./insertExamPackage";
export type { InsertResult, InsertSuccess, InsertError } from "./insertExamPackage";
