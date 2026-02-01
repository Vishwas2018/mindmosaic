/**
 * MindMosaic Exam Package Ingestion Tests
 *
 * These tests verify:
 * 1. JSON Schema validation (using Ajv)
 * 2. Business rule validation
 * 3. Transformation to database rows
 *
 * NOTE: Database insertion tests require a running Supabase instance
 * and are marked as integration tests.
 */

import { describe, it, expect } from "vitest";
import {
  validateExamPackage,
  validateBusinessRules,
  validateExamPackageFull,
} from "../../src/validation/validateExamPackage";
import { transformExamPackage } from "../../src/ingestion/transformExamPackage";

// Load test fixture
import validExamPackage from "../fixtures/validExamPackage.json";

// =============================================================================
// Validation Tests
// =============================================================================

describe("validateExamPackage", () => {
  it("should accept a valid exam package", () => {
    const result = validateExamPackage(validExamPackage);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.metadata.id).toBe(
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      );
    }
  });

  it("should reject missing metadata", () => {
    const invalid = { questions: [] };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should reject missing questions", () => {
    const invalid = {
      metadata: validExamPackage.metadata,
    };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should reject empty questions array", () => {
    const invalid = {
      metadata: validExamPackage.metadata,
      questions: [],
    };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid yearLevel", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        yearLevel: 10, // max is 9
      },
    };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid subject", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        subject: "invalid-subject",
      },
    };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid schemaVersion", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        schemaVersion: "2.0.0",
      },
    };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should reject MCQ with fewer than 4 options", () => {
    const invalid = {
      ...validExamPackage,
      questions: [
        {
          ...validExamPackage.questions[0],
          options: [
            { id: "A", content: "Option A" },
            { id: "B", content: "Option B" },
          ],
        },
      ],
    };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
  });

  it("should provide structured error output", () => {
    const invalid = { foo: "bar" };
    const result = validateExamPackage(invalid);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty("path");
      expect(result.errors[0]).toHaveProperty("message");
      expect(result.errors[0]).toHaveProperty("keyword");
    }
  });
});

// =============================================================================
// Business Rule Tests
// =============================================================================

describe("validateBusinessRules", () => {
  it("should pass with valid exam package", () => {
    const schemaResult = validateExamPackage(validExamPackage);
    expect(schemaResult.valid).toBe(true);
    if (schemaResult.valid) {
      const errors = validateBusinessRules(schemaResult.data);
      expect(errors).toEqual([]);
    }
  });

  it("should detect total marks mismatch", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        totalMarks: 100, // Doesn't match sum of question marks
      },
    };
    const schemaResult = validateExamPackage(invalid);
    expect(schemaResult.valid).toBe(true);
    if (schemaResult.valid) {
      const errors = validateBusinessRules(schemaResult.data);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("Total marks mismatch");
    }
  });

  it("should detect missing media asset references", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        totalMarks: 1, // Match the single question
      },
      questions: [
        {
          ...validExamPackage.questions[0],
          mediaReferences: [
            {
              mediaId: "a0000000-0000-0000-0000-000000000000",
              type: "image",
              placement: "above",
              altText: "Test image",
            },
          ],
        },
      ],
    };
    const schemaResult = validateExamPackage(invalid);
    expect(schemaResult.valid).toBe(true);
    if (schemaResult.valid) {
      const errors = validateBusinessRules(schemaResult.data);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("not found in mediaAssets");
    }
  });

  it("should detect answer type mismatch", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        totalMarks: 1, // Match the single question
      },
      questions: [
        {
          ...validExamPackage.questions[0],
          responseType: "mcq",
          correctAnswer: {
            type: "short", // Doesn't match responseType
            acceptedAnswers: ["test"],
          },
        },
      ],
    };
    const schemaResult = validateExamPackage(invalid);
    expect(schemaResult.valid).toBe(true);
    if (schemaResult.valid) {
      const errors = validateBusinessRules(schemaResult.data);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((e) => e.includes("does not match responseType")),
      ).toBe(true);
    }
  });
});

// =============================================================================
// Full Validation Tests
// =============================================================================

describe("validateExamPackageFull", () => {
  it("should pass valid package through full validation", () => {
    const result = validateExamPackageFull(validExamPackage);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("should return schema errors for invalid schema", () => {
    const result = validateExamPackageFull({ invalid: true });
    expect(result.valid).toBe(false);
    expect(result.schemaErrors).toBeDefined();
  });

  it("should return business errors for business rule violations", () => {
    const invalid = {
      ...validExamPackage,
      metadata: {
        ...validExamPackage.metadata,
        totalMarks: 999,
      },
    };
    const result = validateExamPackageFull(invalid);
    expect(result.valid).toBe(false);
    expect(result.businessErrors).toBeDefined();
  });
});

// =============================================================================
// Transformation Tests
// =============================================================================

describe("transformExamPackage", () => {
  it("should transform valid package to database rows", () => {
    const schemaResult = validateExamPackage(validExamPackage);
    expect(schemaResult.valid).toBe(true);
    if (!schemaResult.valid) return;

    const transformed = transformExamPackage(schemaResult.data);

    // Verify exam package row
    expect(transformed.examPackage.id).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
    expect(transformed.examPackage.title).toBe(
      "Test Exam - Mathematics Basics",
    );
    expect(transformed.examPackage.year_level).toBe(3);
    expect(transformed.examPackage.subject).toBe("mathematics");
    expect(transformed.examPackage.assessment_type).toBe("naplan");
    expect(transformed.examPackage.duration_minutes).toBe(30);
    expect(transformed.examPackage.total_marks).toBe(4);
    expect(transformed.examPackage.schema_version).toBe("1.0.0");
    expect(transformed.examPackage.status).toBe("draft");

    // Verify questions
    expect(transformed.questions).toHaveLength(4);
    expect(transformed.questions[0].exam_package_id).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
    expect(transformed.questions[0].sequence_number).toBe(1);
    expect(transformed.questions[0].response_type).toBe("mcq");

    // Verify MCQ options (only for MCQ questions)
    expect(transformed.questionOptions).toHaveLength(4); // 1 MCQ question with 4 options
    expect(transformed.questionOptions[0].question_id).toBe(
      "01111111-1111-1111-1111-111111111111",
    );
    expect(transformed.questionOptions[0].option_id).toBe("A");

    // Verify correct answers
    expect(transformed.correctAnswers).toHaveLength(4);
    expect(transformed.correctAnswers[0].answer_type).toBe("mcq");
    expect(transformed.correctAnswers[0].correct_option_id).toBe("C");
    expect(transformed.correctAnswers[1].answer_type).toBe("numeric");
    expect(transformed.correctAnswers[1].exact_value).toBe(5);
    expect(transformed.correctAnswers[2].answer_type).toBe("short");
    expect(transformed.correctAnswers[2].accepted_answers).toEqual([
      "square",
      "Square",
      "SQUARE",
    ]);
    expect(transformed.correctAnswers[3].answer_type).toBe("extended");
    expect(transformed.correctAnswers[3].rubric).toBeDefined();
  });

  it("should handle empty mediaAssets", () => {
    const schemaResult = validateExamPackage(validExamPackage);
    expect(schemaResult.valid).toBe(true);
    if (!schemaResult.valid) return;

    const transformed = transformExamPackage(schemaResult.data);
    expect(transformed.mediaAssets).toEqual([]);
  });

  it("should transform media assets when present", () => {
    const withMedia = {
      ...validExamPackage,
      mediaAssets: [
        {
          id: "a0000111-1111-1111-1111-111111111111",
          type: "image",
          filename: "test.png",
          mimeType: "image/png",
          width: 400,
          height: 300,
        },
      ],
    };
    const schemaResult = validateExamPackage(withMedia);
    expect(schemaResult.valid).toBe(true);
    if (!schemaResult.valid) return;

    const transformed = transformExamPackage(schemaResult.data);
    expect(transformed.mediaAssets).toHaveLength(1);
    expect(transformed.mediaAssets[0].exam_package_id).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
    expect(transformed.mediaAssets[0].mime_type).toBe("image/png");
  });

  it("should use correct column naming convention (snake_case)", () => {
    const schemaResult = validateExamPackage(validExamPackage);
    expect(schemaResult.valid).toBe(true);
    if (!schemaResult.valid) return;

    const transformed = transformExamPackage(schemaResult.data);

    // Verify snake_case naming
    expect(transformed.examPackage).toHaveProperty("year_level");
    expect(transformed.examPackage).toHaveProperty("assessment_type");
    expect(transformed.examPackage).toHaveProperty("duration_minutes");
    expect(transformed.examPackage).toHaveProperty("total_marks");
    expect(transformed.examPackage).toHaveProperty("schema_version");
    expect(transformed.examPackage).toHaveProperty("created_at");
    expect(transformed.examPackage).toHaveProperty("updated_at");

    expect(transformed.questions[0]).toHaveProperty("exam_package_id");
    expect(transformed.questions[0]).toHaveProperty("sequence_number");
    expect(transformed.questions[0]).toHaveProperty("response_type");
    expect(transformed.questions[0]).toHaveProperty("prompt_blocks");
    expect(transformed.questions[0]).toHaveProperty("media_references");

    expect(transformed.questionOptions[0]).toHaveProperty("question_id");
    expect(transformed.questionOptions[0]).toHaveProperty("option_id");
    expect(transformed.questionOptions[0]).toHaveProperty("media_reference");

    expect(transformed.correctAnswers[0]).toHaveProperty("question_id");
    expect(transformed.correctAnswers[0]).toHaveProperty("answer_type");
    expect(transformed.correctAnswers[0]).toHaveProperty("correct_option_id");
  });
});

// =============================================================================
// Integration Tests (require Supabase)
// =============================================================================

describe.skip("insertExamPackageData (integration)", () => {
  it("should insert exam package into database", async () => {
    // This test requires a running Supabase instance
    // and admin JWT credentials
    // Implementation would go here
  });

  it("should respect RLS policies", async () => {
    // This test verifies that non-admin users cannot insert
    // Implementation would go here
  });
});
