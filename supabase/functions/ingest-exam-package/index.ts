/**
 * MindMosaic Exam Package Ingestion Edge Function
 *
 * This is the ONLY allowed way to insert exam content into the database.
 *
 * Endpoint: POST /functions/v1/ingest-exam-package
 *
 * Request:
 *   - Method: POST
 *   - Headers:
 *     - Authorization: Bearer <admin_jwt>
 *     - Content-Type: application/json
 *   - Body: ExamPackage JSON (matching contract schema)
 *
 * Response (success):
 *   {
 *     "success": true,
 *     "examPackageId": "<uuid>"
 *   }
 *
 * Response (validation error):
 *   {
 *     "success": false,
 *     "error": "validation_failed",
 *     "schemaErrors": [...] | "businessErrors": [...]
 *   }
 *
 * Response (insert error):
 *   {
 *     "success": false,
 *     "error": "insert_failed",
 *     "message": "..."
 *   }
 *
 * Requires: Admin role JWT
 */

// @ts-ignore Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore Deno imports
import Ajv from "https://esm.sh/ajv@8.12.0";
// @ts-ignore Deno imports
import addFormats from "https://esm.sh/ajv-formats@2.1.1";

// =============================================================================
// JSON Schema (copied from contract for edge function isolation)
// =============================================================================

const EXAM_PACKAGE_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://mindmosaic.com/schemas/exam-package/1.0.0",
  title: "ExamPackage",
  description: "MindMosaic Exam Package Contract v1.0.0",
  type: "object",
  required: ["metadata", "questions"],
  additionalProperties: false,
  properties: {
    metadata: { $ref: "#/$defs/ExamMetadata" },
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
    AssessmentType: { type: "string", enum: ["naplan", "icas"] },
    ExamStatus: { type: "string", enum: ["draft", "published"] },
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
    Difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    ResponseType: {
      type: "string",
      enum: ["mcq", "short", "extended", "numeric"],
    },
    MediaType: { type: "string", enum: ["image", "diagram", "graph"] },
    MediaPlacement: { type: "string", enum: ["above", "inline", "below"] },
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
        id: { type: "string", format: "uuid" },
        title: { type: "string", minLength: 1, maxLength: 200 },
        yearLevel: { type: "integer", minimum: 1, maximum: 9 },
        subject: { $ref: "#/$defs/Subject" },
        assessmentType: { $ref: "#/$defs/AssessmentType" },
        durationMinutes: { type: "integer", minimum: 5, maximum: 180 },
        totalMarks: { type: "integer", minimum: 1 },
        version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
        schemaVersion: { type: "string", const: "1.0.0" },
        status: { $ref: "#/$defs/ExamStatus" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        instructions: {
          type: "array",
          items: { type: "string", minLength: 1, maxLength: 500 },
          maxItems: 10,
        },
      },
    },
    MediaReference: {
      type: "object",
      required: ["mediaId", "type", "placement", "altText"],
      additionalProperties: false,
      properties: {
        mediaId: { type: "string", format: "uuid" },
        type: { $ref: "#/$defs/MediaType" },
        placement: { $ref: "#/$defs/MediaPlacement" },
        altText: { type: "string", minLength: 1, maxLength: 500 },
        caption: { type: "string", maxLength: 200 },
      },
    },
    MediaAsset: {
      type: "object",
      required: ["id", "type", "filename", "mimeType"],
      additionalProperties: false,
      properties: {
        id: { type: "string", format: "uuid" },
        type: { $ref: "#/$defs/MediaType" },
        filename: { type: "string", minLength: 1, maxLength: 200 },
        mimeType: {
          type: "string",
          pattern: "^image/(png|jpeg|svg\\+xml|webp)$",
        },
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 },
        sizeBytes: { type: "integer", minimum: 1 },
      },
    },
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
    McqOption: {
      type: "object",
      required: ["id", "content"],
      additionalProperties: false,
      properties: {
        id: { type: "string", pattern: "^[A-D]$" },
        content: { type: "string", minLength: 1, maxLength: 500 },
        mediaReference: { $ref: "#/$defs/MediaReference" },
      },
    },
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
        correctOptionId: { type: "string", pattern: "^[A-D]$" },
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
        caseSensitive: { type: "boolean", default: false },
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
          properties: { min: { type: "number" }, max: { type: "number" } },
        },
        tolerance: { type: "number", minimum: 0 },
        unit: { type: "string", maxLength: 20 },
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
        id: { type: "string", format: "uuid" },
        sequenceNumber: { type: "integer", minimum: 1 },
        difficulty: { $ref: "#/$defs/Difficulty" },
        responseType: { $ref: "#/$defs/ResponseType" },
        marks: { type: "integer", minimum: 1, maximum: 10, default: 1 },
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
        correctAnswer: { $ref: "#/$defs/CorrectAnswer" },
        tags: {
          type: "array",
          items: { type: "string", minLength: 1, maxLength: 50 },
          maxItems: 10,
          default: [],
        },
        hint: { type: "string", maxLength: 500 },
      },
    },
  },
};

// =============================================================================
// Validation
// =============================================================================

interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

function createValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(EXAM_PACKAGE_JSON_SCHEMA, "exam-package");
  return ajv;
}

function validateSchema(
  ajv: Ajv,
  data: unknown,
): { valid: boolean; errors?: ValidationError[] } {
  const validate = ajv.getSchema("exam-package");
  if (!validate) {
    return {
      valid: false,
      errors: [{ path: "", message: "Schema not found", keyword: "internal" }],
    };
  }

  const isValid = validate(data);
  if (isValid) {
    return { valid: true };
  }

  const errors = (validate.errors || []).map(
    (e: { instancePath?: string; message?: string; keyword: string }) => ({
      path: e.instancePath || "/",
      message: e.message || "Validation failed",
      keyword: e.keyword,
    }),
  );

  return { valid: false, errors };
}

function validateBusinessRules(data: ExamPackageInput): string[] {
  const errors: string[] = [];

  // Rule 1: Total marks
  const calculatedMarks = data.questions.reduce(
    (sum: number, q: QuestionInput) => sum + (q.marks ?? 1),
    0,
  );
  if (calculatedMarks !== data.metadata.totalMarks) {
    errors.push(
      `Total marks mismatch: expected ${data.metadata.totalMarks}, got ${calculatedMarks}`,
    );
  }

  // Rule 2: Media references
  const assetIds = new Set(
    (data.mediaAssets ?? []).map((a: MediaAssetInput) => a.id),
  );
  for (const q of data.questions) {
    for (const ref of q.mediaReferences ?? []) {
      if (!assetIds.has(ref.mediaId)) {
        errors.push(
          `Question ${q.id}: mediaReference ${ref.mediaId} not found`,
        );
      }
    }
    for (const opt of q.options ?? []) {
      if (opt.mediaReference && !assetIds.has(opt.mediaReference.mediaId)) {
        errors.push(
          `Question ${q.id}, Option ${opt.id}: mediaReference ${opt.mediaReference.mediaId} not found`,
        );
      }
    }
  }

  // Rule 3: MCQ options
  for (const q of data.questions) {
    if (q.responseType === "mcq" && (!q.options || q.options.length !== 4)) {
      errors.push(`Question ${q.id}: MCQ must have exactly 4 options`);
    }
  }

  // Rule 4: Answer type match
  for (const q of data.questions) {
    if (q.correctAnswer.type !== q.responseType) {
      errors.push(
        `Question ${q.id}: correctAnswer.type doesn't match responseType`,
      );
    }
  }

  return errors;
}

// =============================================================================
// Types (minimal for edge function)
// =============================================================================

interface ExamPackageInput {
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

interface QuestionInput {
  id: string;
  sequenceNumber: number;
  difficulty: string;
  responseType: string;
  marks?: number;
  promptBlocks: unknown[];
  mediaReferences?: { mediaId: string }[];
  options?: {
    id: string;
    content: string;
    mediaReference?: { mediaId: string };
  }[];
  correctAnswer: { type: string; [key: string]: unknown };
  tags?: string[];
  hint?: string;
}

interface MediaAssetInput {
  id: string;
  type: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

// =============================================================================
// Transformation
// =============================================================================

function transformPackage(input: ExamPackageInput) {
  const packageId = input.metadata.id;

  const examPackage = {
    id: packageId,
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

  const mediaAssets = (input.mediaAssets ?? []).map((a: MediaAssetInput) => ({
    id: a.id,
    exam_package_id: packageId,
    type: a.type,
    filename: a.filename,
    mime_type: a.mimeType,
    width: a.width ?? null,
    height: a.height ?? null,
    size_bytes: a.sizeBytes ?? null,
  }));

  const questions = input.questions.map((q: QuestionInput) => ({
    id: q.id,
    exam_package_id: packageId,
    sequence_number: q.sequenceNumber,
    difficulty: q.difficulty,
    response_type: q.responseType,
    marks: q.marks ?? 1,
    prompt_blocks: q.promptBlocks,
    media_references: q.mediaReferences ?? [],
    tags: q.tags ?? [],
    hint: q.hint ?? null,
  }));

  const questionOptions: {
    question_id: string;
    option_id: string;
    content: string;
    media_reference: unknown;
  }[] = [];
  for (const q of input.questions) {
    if (q.responseType === "mcq" && q.options) {
      for (const opt of q.options) {
        questionOptions.push({
          question_id: q.id,
          option_id: opt.id,
          content: opt.content,
          media_reference: opt.mediaReference ?? null,
        });
      }
    }
  }

  const correctAnswers = input.questions.map((q: QuestionInput) => {
    const answer = q.correctAnswer;
    return {
      question_id: q.id,
      answer_type: answer.type,
      correct_option_id: answer.type === "mcq" ? answer.correctOptionId : null,
      accepted_answers: answer.type === "short" ? answer.acceptedAnswers : null,
      case_sensitive:
        answer.type === "short" ? (answer.caseSensitive ?? false) : null,
      exact_value:
        answer.type === "numeric" ? (answer.exactValue ?? null) : null,
      range_min:
        answer.type === "numeric" && answer.range
          ? (answer.range as { min: number }).min
          : null,
      range_max:
        answer.type === "numeric" && answer.range
          ? (answer.range as { max: number }).max
          : null,
      tolerance: answer.type === "numeric" ? (answer.tolerance ?? null) : null,
      unit: answer.type === "numeric" ? (answer.unit ?? null) : null,
      rubric: answer.type === "extended" ? answer.rubric : null,
      sample_response:
        answer.type === "extended" ? (answer.sampleResponse ?? null) : null,
    };
  });

  return {
    examPackage,
    mediaAssets,
    questions,
    questionOptions,
    correctAnswers,
  };
}

// =============================================================================
// Database Insertion
// =============================================================================

async function insertData(
  supabase: ReturnType<typeof createClient>,
  data: ReturnType<typeof transformPackage>,
): Promise<{ success: boolean; error?: string }> {
  // Insert in dependency order
  const { error: e1 } = await supabase
    .from("exam_packages")
    .insert(data.examPackage);
  if (e1) return { success: false, error: `exam_packages: ${e1.message}` };

  if (data.mediaAssets.length > 0) {
    const { error: e2 } = await supabase
      .from("exam_media_assets")
      .insert(data.mediaAssets);
    if (e2) {
      return { success: false, error: `exam_media_assets: ${e2.message}` };
    }
  }

  const { error: e3 } = await supabase
    .from("exam_questions")
    .insert(data.questions);
  if (e3) return { success: false, error: `exam_questions: ${e3.message}` };

  if (data.questionOptions.length > 0) {
    const { error: e4 } = await supabase
      .from("exam_question_options")
      .insert(data.questionOptions);
    if (e4) {
      return {
        success: false,
        error: `exam_question_options: ${e4.message}`,
      };
    }
  }

  const { error: e5 } = await supabase
    .from("exam_correct_answers")
    .insert(data.correctAnswers);
  if (e5) {
    return { success: false, error: `exam_correct_answers: ${e5.message}` };
  }

  return { success: true };
}

// =============================================================================
// Edge Function Handler
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "method_not_allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Parse request body
    const body = await req.json();

    // Create validator
    const ajv = createValidator();

    // Step 1: Schema validation
    const schemaResult = validateSchema(ajv, body);
    if (!schemaResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "validation_failed",
          schemaErrors: schemaResult.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 2: Business rule validation
    const businessErrors = validateBusinessRules(body as ExamPackageInput);
    if (businessErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "validation_failed",
          businessErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 3: Transform data
    const transformed = transformPackage(body as ExamPackageInput);

    // Step 4: Auth validation (validate caller, but do inserts with service role)
    const authHeader =
      req.headers.get("authorization") ?? req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "unauthorized",
          message: "Missing or invalid Authorization header",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    //@ts-ignore
    const supabaseUrl = globalThis.Deno?.env.get("SUPABASE_URL");
    //@ts-ignore
    const serviceRoleKey = globalThis.Deno?.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "configuration_error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: userResult, error: userError } =
      await supabase.auth.getUser(jwt);

    if (userError || !userResult?.user?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "unauthorized",
          message: "Invalid token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userResult.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "forbidden",
          message: "Admin access required",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 5: Insert data
    const insertResult = await insertData(supabase, transformed);

    if (!insertResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "insert_failed",
          message: insertResult.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        examPackageId: transformed.examPackage.id,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: "internal_error", message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
