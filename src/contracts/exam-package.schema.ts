/**
 * MindMosaic Exam Package Contract
 * Version: 1.0.0
 *
 * This schema defines the authoritative structure for exam packages.
 * All exam content must conform to this contract.
 *
 * Design Principles:
 * - Render-agnostic: No HTML, only structured content blocks
 * - Validatable: Every field has explicit constraints
 * - Versionable: Schema version tracked in metadata
 * - Portable: Can be validated on frontend and backend
 */

import { z } from "zod";

// =============================================================================
// Schema Version
// =============================================================================

export const EXAM_PACKAGE_SCHEMA_VERSION = "1.0.0";

// =============================================================================
// Enums and Constants
// =============================================================================

export const AssessmentType = z.enum(["naplan", "icas"]);
export type AssessmentType = z.infer<typeof AssessmentType>;

export const ExamStatus = z.enum(["draft", "published"]);
export type ExamStatus = z.infer<typeof ExamStatus>;

export const Subject = z.enum([
  "numeracy",
  "reading",
  "writing",
  "language-conventions",
  "mathematics",
  "english",
  "science",
]);
export type Subject = z.infer<typeof Subject>;

export const Difficulty = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const ResponseType = z.enum(["mcq", "short", "extended", "numeric"]);
export type ResponseType = z.infer<typeof ResponseType>;

export const MediaType = z.enum(["image", "diagram", "graph"]);
export type MediaType = z.infer<typeof MediaType>;

export const MediaPlacement = z.enum(["above", "inline", "below"]);
export type MediaPlacement = z.infer<typeof MediaPlacement>;

export const PromptBlockType = z.enum([
  "text",
  "heading",
  "list",
  "quote",
  "instruction",
]);
export type PromptBlockType = z.infer<typeof PromptBlockType>;

// =============================================================================
// Media Reference Schema
// =============================================================================

export const MediaReferenceSchema = z.object({
  mediaId: z.string().uuid(),
  type: MediaType,
  placement: MediaPlacement,
  altText: z.string().min(1).max(500),
  caption: z.string().max(200).optional(),
});
export type MediaReference = z.infer<typeof MediaReferenceSchema>;

// =============================================================================
// Prompt Block Schemas (Discriminated Union)
// =============================================================================

const TextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string().min(1),
});

const HeadingBlockSchema = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  content: z.string().min(1).max(200),
});

const ListBlockSchema = z.object({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(z.string().min(1)).min(1).max(20),
});

const QuoteBlockSchema = z.object({
  type: z.literal("quote"),
  content: z.string().min(1),
  attribution: z.string().max(100).optional(),
});

const InstructionBlockSchema = z.object({
  type: z.literal("instruction"),
  content: z.string().min(1).max(500),
});

export const PromptBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  HeadingBlockSchema,
  ListBlockSchema,
  QuoteBlockSchema,
  InstructionBlockSchema,
]);
export type PromptBlock = z.infer<typeof PromptBlockSchema>;

// =============================================================================
// MCQ Option Schema
// =============================================================================

export const McqOptionSchema = z.object({
  id: z.string().regex(/^[A-D]$/),
  content: z.string().min(1).max(500),
  mediaReference: MediaReferenceSchema.optional(),
});
export type McqOption = z.infer<typeof McqOptionSchema>;

// =============================================================================
// Correct Answer Schemas (Discriminated Union)
// =============================================================================

const McqAnswerSchema = z.object({
  type: z.literal("mcq"),
  correctOptionId: z.string().regex(/^[A-D]$/),
});

const ShortAnswerSchema = z.object({
  type: z.literal("short"),
  acceptedAnswers: z.array(z.string().min(1)).min(1).max(10),
  caseSensitive: z.boolean().default(false),
});

const NumericAnswerSchema = z
  .object({
    type: z.literal("numeric"),
    exactValue: z.number().optional(),
    range: z
      .object({
        min: z.number(),
        max: z.number(),
      })
      .optional(),
    tolerance: z.number().min(0).optional(),
    unit: z.string().max(20).optional(),
  })
  .refine(
    (v) =>
      (v.exactValue !== undefined && v.range === undefined) ||
      (v.exactValue === undefined && v.range !== undefined),
    {
      message:
        "Numeric answers must define either exactValue or range (not both)",
    },
  );

const ExtendedAnswerSchema = z.object({
  type: z.literal("extended"),
  rubric: z
    .array(
      z.object({
        criterion: z.string().min(1),
        maxMarks: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(10),
  sampleResponse: z.string().optional(),
});

export const CorrectAnswerSchema = z.discriminatedUnion("type", [
  McqAnswerSchema,
  ShortAnswerSchema,
  NumericAnswerSchema,
  ExtendedAnswerSchema,
]);
export type CorrectAnswer = z.infer<typeof CorrectAnswerSchema>;

// =============================================================================
// Question Schema
// =============================================================================

export const QuestionSchema = z
  .object({
    id: z.string().uuid(),
    sequenceNumber: z.number().int().min(1),
    difficulty: Difficulty,
    responseType: ResponseType,
    marks: z.number().int().min(1).max(10).default(1),
    promptBlocks: z.array(PromptBlockSchema).min(1).max(20),
    mediaReferences: z.array(MediaReferenceSchema).max(5).optional(),
    options: z.array(McqOptionSchema).length(4).optional(),
    correctAnswer: CorrectAnswerSchema,
    tags: z.array(z.string().min(1).max(50)).max(10).default([]),
    hint: z.string().max(500).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.responseType !== q.correctAnswer.type) {
      ctx.addIssue({
        path: ["correctAnswer"],
        message: "responseType must match correctAnswer.type",
        code: z.ZodIssueCode.custom,
      });
    }

    if (q.responseType === "mcq" && !q.options) {
      ctx.addIssue({
        path: ["options"],
        message: "MCQ questions must define exactly 4 options",
        code: z.ZodIssueCode.custom,
      });
    }

    if (q.responseType !== "mcq" && q.options) {
      ctx.addIssue({
        path: ["options"],
        message: "Only MCQ questions may define options",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type Question = z.infer<typeof QuestionSchema>;

// =============================================================================
// Exam Metadata Schema
// =============================================================================

export const ExamMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  yearLevel: z.number().int().min(1).max(9),
  subject: Subject,
  assessmentType: AssessmentType,
  durationMinutes: z.number().int().min(5).max(180),
  totalMarks: z.number().int().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  schemaVersion: z.literal(EXAM_PACKAGE_SCHEMA_VERSION),
  status: ExamStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  instructions: z.array(z.string().min(1).max(500)).max(10).optional(),
});
export type ExamMetadata = z.infer<typeof ExamMetadataSchema>;

// =============================================================================
// Media Asset Schema (Package-Level Manifest)
// =============================================================================

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  type: MediaType,
  filename: z.string().min(1).max(200),
  mimeType: z.string().regex(/^image\/(png|jpeg|svg\+xml|webp)$/),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  sizeBytes: z.number().int().min(1).optional(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

// =============================================================================
// Exam Package Schema (Top Level)
// =============================================================================

export const ExamPackageSchema = z.object({
  metadata: ExamMetadataSchema,
  questions: z.array(QuestionSchema).min(1).max(100),
  mediaAssets: z.array(MediaAssetSchema).max(50).default([]),
});
export type ExamPackage = z.infer<typeof ExamPackageSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

export function validateExamPackage(data: unknown): {
  success: boolean;
  data?: ExamPackage;
  errors?: z.ZodError;
} {
  const result = ExamPackageSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error };
}

export function validateMediaReferences(examPackage: ExamPackage): string[] {
  const errors: string[] = [];
  const assetIds = new Set(examPackage.mediaAssets.map((a) => a.id));

  for (const question of examPackage.questions) {
    question.mediaReferences?.forEach((ref) => {
      if (!assetIds.has(ref.mediaId)) {
        errors.push(
          `Question ${question.id}: Media reference ${ref.mediaId} not found`,
        );
      }
    });

    question.options?.forEach((opt) => {
      if (opt.mediaReference && !assetIds.has(opt.mediaReference.mediaId)) {
        errors.push(
          `Question ${question.id}, Option ${opt.id}: Media reference ${opt.mediaReference.mediaId} not found`,
        );
      }
    });
  }

  return errors;
}

export function validateTotalMarks(examPackage: ExamPackage): boolean {
  const total = examPackage.questions.reduce((sum, q) => sum + q.marks, 0);
  return total === examPackage.metadata.totalMarks;
}
