/**
 * MindMosaic Exam Package Validation
 *
 * This module validates exam packages against the locked JSON Schema
 * from Day 7 (src/contracts/exam-package.json-schema.ts).
 *
 * Uses Ajv for JSON Schema validation (no Zod at runtime).
 */

import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { EXAM_PACKAGE_JSON_SCHEMA } from "../contracts/exam-package.json-schema";

// =============================================================================
// Types
// =============================================================================

export interface ValidationSuccess {
  valid: true;
  data: ExamPackageInput;
}

export interface ValidationError {
  valid: false;
  errors: FormattedValidationError[];
}

export interface FormattedValidationError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export type ValidationResult = ValidationSuccess | ValidationError;

/**
 * Input type for exam package (matches JSON Schema structure)
 * This is the raw input before transformation to database rows.
 */
export interface ExamPackageInput {
  metadata: {
    id: string;
    title: string;
    yearLevel: number;
    subject: string;
    assessmentType: string;
    durationMinutes: number;
    totalMarks: number;
    version: string;
    schemaVersion: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    instructions?: string[];
  };
  questions: QuestionInput[];
  mediaAssets?: MediaAssetInput[];
}

export interface QuestionInput {
  id: string;
  sequenceNumber: number;
  difficulty: string;
  responseType: string;
  marks?: number;
  promptBlocks: PromptBlockInput[];
  mediaReferences?: MediaReferenceInput[];
  options?: McqOptionInput[];
  correctAnswer: CorrectAnswerInput;
  tags?: string[];
  hint?: string;
}

export interface PromptBlockInput {
  type: string;
  content?: string;
  level?: number;
  ordered?: boolean;
  items?: string[];
  attribution?: string;
}

export interface MediaReferenceInput {
  mediaId: string;
  type: string;
  placement: string;
  altText: string;
  caption?: string;
}

export interface McqOptionInput {
  id: string;
  content: string;
  mediaReference?: MediaReferenceInput;
}

export interface CorrectAnswerInput {
  type: string;
  // MCQ
  correctOptionId?: string;
  // Short
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  // Numeric
  exactValue?: number;
  range?: { min: number; max: number };
  tolerance?: number;
  unit?: string;
  // Extended
  rubric?: { criterion: string; maxMarks: number }[];
  sampleResponse?: string;
}

export interface MediaAssetInput {
  id: string;
  type: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

// =============================================================================
// Validator Setup
// =============================================================================

/**
 * Create and configure the Ajv validator instance.
 * Uses draft-07 schema and adds format validation.
 */
function createValidator(): InstanceType<typeof Ajv> {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
  } as any);

  addFormats(ajv);
  ajv.addSchema(EXAM_PACKAGE_JSON_SCHEMA, "exam-package");

  return ajv;
}

let validatorInstance: InstanceType<typeof Ajv> | null = null;

function getValidator(): InstanceType<typeof Ajv> {
  if (!validatorInstance) {
    validatorInstance = createValidator();
  }
  return validatorInstance;
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format Ajv errors into a developer-friendly structure.
 */
function formatErrors(
  errors: ErrorObject[] | null | undefined,
): FormattedValidationError[] {
  if (!errors || errors.length === 0) {
    return [
      {
        path: "",
        message: "Unknown validation error",
        keyword: "unknown",
        params: {},
      },
    ];
  }

  return errors.map((error) => ({
    path: (error as any).instancePath ?? (error as any).dataPath ?? "/",
    message: error.message || "Validation failed",
    keyword: error.keyword,
    params: error.params as Record<string, unknown>,
  }));
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate an exam package against the JSON Schema.
 *
 * @param data - The raw exam package data to validate
 * @returns ValidationResult - Either success with typed data, or errors
 */
export function validateExamPackage(data: unknown): ValidationResult {
  const ajv = getValidator();
  const validate = ajv.getSchema("exam-package");

  if (!validate) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: "Schema not found: exam-package",
          keyword: "internal",
          params: {},
        },
      ],
    };
  }

  const isValid = validate(data);

  if (isValid) {
    return {
      valid: true,
      data: data as ExamPackageInput,
    };
  }

  return {
    valid: false,
    errors: formatErrors(validate.errors),
  };
}

/**
 * Perform additional business rule validation beyond JSON Schema.
 * These are contract-level rules that JSON Schema cannot express.
 *
 * @param data - The validated exam package data
 * @returns Array of error messages (empty if valid)
 */
export function validateBusinessRules(data: ExamPackageInput): string[] {
  const errors: string[] = [];

  // Rule 1: Total marks must equal sum of question marks
  const calculatedMarks = data.questions.reduce(
    (sum, q) => sum + (q.marks ?? 1),
    0,
  );
  if (calculatedMarks !== data.metadata.totalMarks) {
    errors.push(
      `Total marks mismatch: metadata.totalMarks is ${data.metadata.totalMarks}, ` +
        `but sum of question marks is ${calculatedMarks}`,
    );
  }

  // Rule 2: All media references must exist in mediaAssets
  const assetIds = new Set((data.mediaAssets ?? []).map((a) => a.id));

  for (const question of data.questions) {
    // Check question-level media references
    if (question.mediaReferences) {
      for (const ref of question.mediaReferences) {
        if (!assetIds.has(ref.mediaId)) {
          errors.push(
            `Question ${question.id}: mediaReference ${ref.mediaId} not found in mediaAssets`,
          );
        }
      }
    }

    // Check option-level media references (MCQ only)
    if (question.options) {
      for (const option of question.options) {
        if (
          option.mediaReference &&
          !assetIds.has(option.mediaReference.mediaId)
        ) {
          errors.push(
            `Question ${question.id}, Option ${option.id}: ` +
              `mediaReference ${option.mediaReference.mediaId} not found in mediaAssets`,
          );
        }
      }
    }
  }

  // Rule 3: MCQ questions must have exactly 4 options
  for (const question of data.questions) {
    if (question.responseType === "mcq") {
      if (!question.options || question.options.length !== 4) {
        errors.push(
          `Question ${question.id}: MCQ questions must have exactly 4 options, ` +
            `found ${question.options?.length ?? 0}`,
        );
      }
    }
  }

  // Rule 4: correctAnswer.type must match question.responseType
  for (const question of data.questions) {
    if (question.correctAnswer.type !== question.responseType) {
      errors.push(
        `Question ${question.id}: correctAnswer.type (${question.correctAnswer.type}) ` +
          `does not match responseType (${question.responseType})`,
      );
    }
  }

  // Rule 5: Sequence numbers must be unique and sequential
  const seqNumbers = data.questions
    .map((q) => q.sequenceNumber)
    .sort((a, b) => a - b);
  for (let i = 0; i < seqNumbers.length; i++) {
    if (seqNumbers[i] !== i + 1) {
      errors.push(
        `Sequence numbers must be sequential starting from 1. ` +
          `Found gap or duplicate at position ${i + 1}`,
      );
      break;
    }
  }

  return errors;
}

/**
 * Full validation: JSON Schema + business rules.
 */
export function validateExamPackageFull(data: unknown): {
  valid: boolean;
  data?: ExamPackageInput;
  schemaErrors?: FormattedValidationError[];
  businessErrors?: string[];
} {
  // Step 1: JSON Schema validation
  const schemaResult = validateExamPackage(data);

  if (!schemaResult.valid) {
    return {
      valid: false,
      schemaErrors: schemaResult.errors,
    };
  }

  // Step 2: Business rule validation
  const businessErrors = validateBusinessRules(schemaResult.data);

  if (businessErrors.length > 0) {
    return {
      valid: false,
      data: schemaResult.data,
      businessErrors,
    };
  }

  return {
    valid: true,
    data: schemaResult.data,
  };
}
