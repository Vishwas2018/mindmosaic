/**
 * MindMosaic Exam Package JSON Schema
 * Version: 1.0.0
 *
 * This is the JSON Schema equivalent of the Zod schema.
 * Used for server-side validation in edge functions.
 *
 * IMPORTANT: Keep this in sync with exam-package.schema.ts
 */

export const EXAM_PACKAGE_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://mindmosaic.com/schemas/exam-package/1.0.0",
  title: "ExamPackage",
  description: "MindMosaic Exam Package Contract v1.0.0",
  type: "object",
  required: ["metadata", "questions"],
  additionalProperties: false,
  properties: {
    metadata: {
      $ref: "#/$defs/ExamMetadata",
    },
    questions: {
      type: "array",
      items: { $ref: "#/$defs/Question" },
      minItems: 1,
      maxItems: 100,
    },
    mediaAssets: {
      type: "array",
      items: { $ref: "#/$defs/MediaAsset" },
      maxItems: 50,
      default: [],
    },
  },
  $defs: {
    // =========================================================================
    // Enums
    // =========================================================================
    AssessmentType: {
      type: "string",
      enum: ["naplan", "icas"],
    },
    ExamStatus: {
      type: "string",
      enum: ["draft", "published"],
    },
    Subject: {
      type: "string",
      enum: [
        "numeracy",
        "reading",
        "writing",
        "language-conventions",
        "mathematics",
        "english",
        "science",
      ],
    },
    Difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
    },
    ResponseType: {
      type: "string",
      enum: ["mcq", "short", "extended", "numeric"],
    },
    MediaType: {
      type: "string",
      enum: ["image", "diagram", "graph"],
    },
    MediaPlacement: {
      type: "string",
      enum: ["above", "inline", "below"],
    },

    // =========================================================================
    // Exam Metadata
    // =========================================================================
    ExamMetadata: {
      type: "object",
      required: [
        "id",
        "title",
        "yearLevel",
        "subject",
        "assessmentType",
        "durationMinutes",
        "totalMarks",
        "version",
        "schemaVersion",
        "status",
        "createdAt",
        "updatedAt",
      ],
      additionalProperties: false,
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        title: {
          type: "string",
          minLength: 1,
          maxLength: 200,
        },
        yearLevel: {
          type: "integer",
          minimum: 1,
          maximum: 9,
        },
        subject: {
          $ref: "#/$defs/Subject",
        },
        assessmentType: {
          $ref: "#/$defs/AssessmentType",
        },
        durationMinutes: {
          type: "integer",
          minimum: 5,
          maximum: 180,
        },
        totalMarks: {
          type: "integer",
          minimum: 1,
        },
        version: {
          type: "string",
          pattern: "^\\d+\\.\\d+\\.\\d+$",
        },
        schemaVersion: {
          type: "string",
          const: "1.0.0",
        },
        status: {
          $ref: "#/$defs/ExamStatus",
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
        },
        instructions: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
          maxItems: 10,
        },
      },
    },

    // =========================================================================
    // Media Reference
    // =========================================================================
    MediaReference: {
      type: "object",
      required: ["mediaId", "type", "placement", "altText"],
      additionalProperties: false,
      properties: {
        mediaId: {
          type: "string",
          format: "uuid",
        },
        type: {
          $ref: "#/$defs/MediaType",
        },
        placement: {
          $ref: "#/$defs/MediaPlacement",
        },
        altText: {
          type: "string",
          minLength: 1,
          maxLength: 500,
        },
        caption: {
          type: "string",
          maxLength: 200,
        },
      },
    },

    // =========================================================================
    // Media Asset
    // =========================================================================
    MediaAsset: {
      type: "object",
      required: ["id", "type", "filename", "mimeType"],
      additionalProperties: false,
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        type: {
          $ref: "#/$defs/MediaType",
        },
        filename: {
          type: "string",
          minLength: 1,
          maxLength: 200,
        },
        mimeType: {
          type: "string",
          pattern: "^image/(png|jpeg|svg\\+xml|webp)$",
        },
        width: {
          type: "integer",
          minimum: 1,
        },
        height: {
          type: "integer",
          minimum: 1,
        },
        sizeBytes: {
          type: "integer",
          minimum: 1,
        },
      },
    },

    // =========================================================================
    // Prompt Blocks
    // =========================================================================
    PromptBlock: {
      oneOf: [
        { $ref: "#/$defs/TextBlock" },
        { $ref: "#/$defs/HeadingBlock" },
        { $ref: "#/$defs/ListBlock" },
        { $ref: "#/$defs/QuoteBlock" },
        { $ref: "#/$defs/InstructionBlock" },
      ],
    },
    TextBlock: {
      type: "object",
      required: ["type", "content"],
      additionalProperties: false,
      properties: {
        type: { const: "text" },
        content: { type: "string", minLength: 1 },
      },
    },
    HeadingBlock: {
      type: "object",
      required: ["type", "level", "content"],
      additionalProperties: false,
      properties: {
        type: { const: "heading" },
        level: { type: "integer", enum: [1, 2, 3] },
        content: { type: "string", minLength: 1, maxLength: 200 },
      },
    },
    ListBlock: {
      type: "object",
      required: ["type", "ordered", "items"],
      additionalProperties: false,
      properties: {
        type: { const: "list" },
        ordered: { type: "boolean" },
        items: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 20,
        },
      },
    },
    QuoteBlock: {
      type: "object",
      required: ["type", "content"],
      additionalProperties: false,
      properties: {
        type: { const: "quote" },
        content: { type: "string", minLength: 1 },
        attribution: { type: "string", maxLength: 100 },
      },
    },
    InstructionBlock: {
      type: "object",
      required: ["type", "content"],
      additionalProperties: false,
      properties: {
        type: { const: "instruction" },
        content: { type: "string", minLength: 1, maxLength: 500 },
      },
    },

    // =========================================================================
    // MCQ Option
    // =========================================================================
    McqOption: {
      type: "object",
      required: ["id", "content"],
      additionalProperties: false,
      properties: {
        id: {
          type: "string",
          pattern: "^[A-D]$",
        },
        content: {
          type: "string",
          minLength: 1,
          maxLength: 500,
        },
        mediaReference: {
          $ref: "#/$defs/MediaReference",
        },
      },
    },

    // =========================================================================
    // Correct Answer (discriminated by type)
    // =========================================================================
    CorrectAnswer: {
      oneOf: [
        { $ref: "#/$defs/McqAnswer" },
        { $ref: "#/$defs/ShortAnswer" },
        { $ref: "#/$defs/NumericAnswer" },
        { $ref: "#/$defs/ExtendedAnswer" },
      ],
    },
    McqAnswer: {
      type: "object",
      required: ["type", "correctOptionId"],
      additionalProperties: false,
      properties: {
        type: { const: "mcq" },
        correctOptionId: {
          type: "string",
          pattern: "^[A-D]$",
        },
      },
    },
    ShortAnswer: {
      type: "object",
      required: ["type", "acceptedAnswers"],
      additionalProperties: false,
      properties: {
        type: { const: "short" },
        acceptedAnswers: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 10,
        },
        caseSensitive: {
          type: "boolean",
          default: false,
        },
      },
    },
    NumericAnswer: {
      type: "object",
      required: ["type"],
      additionalProperties: false,
      properties: {
        type: { const: "numeric" },
        exactValue: { type: "number" },
        range: {
          type: "object",
          required: ["min", "max"],
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
        },
        tolerance: {
          type: "number",
          minimum: 0,
        },
        unit: {
          type: "string",
          maxLength: 20,
        },
      },
    },
    ExtendedAnswer: {
      type: "object",
      required: ["type", "rubric"],
      additionalProperties: false,
      properties: {
        type: { const: "extended" },
        rubric: {
          type: "array",
          items: {
            type: "object",
            required: ["criterion", "maxMarks"],
            properties: {
              criterion: { type: "string", minLength: 1 },
              maxMarks: { type: "integer", minimum: 1, maximum: 10 },
            },
          },
          minItems: 1,
          maxItems: 10,
        },
        sampleResponse: { type: "string" },
      },
    },

    // =========================================================================
    // Question
    // =========================================================================
    Question: {
      type: "object",
      required: [
        "id",
        "sequenceNumber",
        "difficulty",
        "responseType",
        "promptBlocks",
        "correctAnswer",
      ],
      additionalProperties: false,
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        sequenceNumber: {
          type: "integer",
          minimum: 1,
        },
        difficulty: {
          $ref: "#/$defs/Difficulty",
        },
        responseType: {
          $ref: "#/$defs/ResponseType",
        },
        marks: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          default: 1,
        },
        promptBlocks: {
          type: "array",
          items: { $ref: "#/$defs/PromptBlock" },
          minItems: 1,
          maxItems: 20,
        },
        mediaReferences: {
          type: "array",
          items: { $ref: "#/$defs/MediaReference" },
          maxItems: 5,
        },
        options: {
          type: "array",
          items: { $ref: "#/$defs/McqOption" },
          minItems: 4,
          maxItems: 4,
        },
        correctAnswer: {
          $ref: "#/$defs/CorrectAnswer",
        },
        tags: {
          type: "array",
          items: { type: "string", minLength: 1, maxLength: 50 },
          maxItems: 10,
          default: [],
        },
        hint: {
          type: "string",
          maxLength: 500,
        },
      },
    },
  },
} as const;

export type ExamPackageJsonSchema = typeof EXAM_PACKAGE_JSON_SCHEMA;
