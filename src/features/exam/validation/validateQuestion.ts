/**
 * MindMosaic — Question Engine v1: Data Validation
 *
 * Validates prompt_blocks and validation JSON shapes
 * per the canonical data shapes defined in the spec.
 *
 * Used by:
 *   - Question authoring UI (client-side preview)
 *   - Ingestion pipeline (pre-insert check)
 *   - Scoring (guards against malformed data)
 */

import type { Json } from "../../../lib/database.types";

// =============================================================================
// Supported types (canonical set)
// =============================================================================

const SUPPORTED_RESPONSE_TYPES = new Set([
  "mcq",
  "multi_select",
  "short",
  "numeric",
  "boolean",
  "ordering",
  "matching",
]);

const UNSUPPORTED_RESPONSE_TYPES = new Set([
  "diagram_click",
  "graph_question",
  "audio",
  "extended_response",
  "text_highlight",
]);

// =============================================================================
// Validation result
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Validate that a response_type is in the canonical supported set.
 */
export function validateResponseType(responseType: string): ValidationResult {
  if (SUPPORTED_RESPONSE_TYPES.has(responseType)) {
    return ok();
  }
  if (UNSUPPORTED_RESPONSE_TYPES.has(responseType)) {
    return fail(
      `"${responseType}" is explicitly unsupported by MindMosaic Question Engine v1.`,
    );
  }
  // Legacy values that exist in DB but shouldn't be used for new questions
  if (responseType === "multi" || responseType === "extended") {
    return fail(
      `"${responseType}" is a legacy type. Use "${responseType === "multi" ? "multi_select" : "short"}" instead.`,
    );
  }
  return fail(`Unknown response_type: "${responseType}".`);
}

/**
 * Validate prompt_blocks JSON shape for a given response_type.
 */
export function validatePromptBlocks(
  responseType: string,
  promptBlocks: Json,
): ValidationResult {
  if (!Array.isArray(promptBlocks)) {
    return fail("prompt_blocks must be a JSON array.");
  }

  if (promptBlocks.length === 0) {
    return fail("prompt_blocks must contain at least one block.");
  }

  const results: ValidationResult[] = [];

  for (let i = 0; i < promptBlocks.length; i++) {
    const block = promptBlocks[i] as Record<string, unknown>;
    if (!block || typeof block !== "object" || !block.type) {
      results.push(fail(`prompt_blocks[${i}]: missing or invalid block type.`));
      continue;
    }

    switch (block.type) {
      case "text":
        if (typeof block.content !== "string" || block.content.trim() === "") {
          results.push(fail(`prompt_blocks[${i}]: text block requires non-empty "content" string.`));
        }
        break;

      case "heading":
        if (typeof block.content !== "string") {
          results.push(fail(`prompt_blocks[${i}]: heading block requires "content" string.`));
        }
        if (![1, 2, 3].includes(block.level as number)) {
          results.push(fail(`prompt_blocks[${i}]: heading level must be 1, 2, or 3.`));
        }
        break;

      case "list":
        if (!Array.isArray(block.items) || block.items.length === 0) {
          results.push(fail(`prompt_blocks[${i}]: list block requires non-empty "items" array.`));
        }
        break;

      case "mcq":
        results.push(validateMcqBlock(block, i));
        break;

      case "multi_select":
        results.push(validateMultiSelectBlock(block, i));
        break;

      case "ordering":
        results.push(validateOrderingBlock(block, i));
        break;

      case "matching":
        results.push(validateMatchingBlock(block, i));
        break;

      case "quote":
      case "instruction":
      case "stimulus":
        // Minimal validation — just needs content
        if (typeof block.content !== "string") {
          results.push(fail(`prompt_blocks[${i}]: ${block.type} block requires "content" string.`));
        }
        break;

      default:
        // Unknown block types are allowed (forward compat) but warned
        break;
    }
  }

  // Type-specific requirements
  if (responseType === "ordering") {
    const hasOrderingBlock = promptBlocks.some(
      (b: unknown) => (b as Record<string, unknown>).type === "ordering",
    );
    if (!hasOrderingBlock) {
      results.push(fail('ordering questions require an "ordering" prompt block.'));
    }
  }

  if (responseType === "matching") {
    const hasMatchingBlock = promptBlocks.some(
      (b: unknown) => (b as Record<string, unknown>).type === "matching",
    );
    if (!hasMatchingBlock) {
      results.push(fail('matching questions require a "matching" prompt block.'));
    }
  }

  return results.length === 0 ? ok() : merge(...results);
}

/**
 * Validate the validation JSON shape for a given response_type.
 */
export function validateValidationJson(
  responseType: string,
  validation: Json | null | undefined,
): ValidationResult {
  // Some types don't use validation (mcq, multi_select use prompt_blocks instead)
  if (responseType === "mcq" || responseType === "multi_select") {
    return ok(); // Answer key is in prompt_blocks
  }

  // These types REQUIRE validation
  const requiresValidation = new Set(["short", "numeric", "boolean", "ordering", "matching"]);

  if (requiresValidation.has(responseType)) {
    if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
      return fail(`${responseType} questions require a "validation" JSON object.`);
    }

    const v = validation as Record<string, unknown>;

    switch (responseType) {
      case "short":
        if (!Array.isArray(v.acceptedAnswers) || v.acceptedAnswers.length === 0) {
          return fail('short validation requires non-empty "acceptedAnswers" array.');
        }
        break;

      case "numeric":
        if (typeof v.correct !== "number") {
          return fail('numeric validation requires "correct" as a number.');
        }
        if (v.tolerance !== undefined && typeof v.tolerance !== "number") {
          return fail('numeric validation "tolerance" must be a number if provided.');
        }
        break;

      case "boolean":
        if (typeof v.correct !== "boolean") {
          return fail('boolean validation requires "correct" as a boolean.');
        }
        break;

      case "ordering":
        if (!Array.isArray(v.correctOrder) || v.correctOrder.length === 0) {
          return fail('ordering validation requires non-empty "correctOrder" array.');
        }
        break;

      case "matching":
        if (
          !v.correctPairs ||
          typeof v.correctPairs !== "object" ||
          Array.isArray(v.correctPairs) ||
          Object.keys(v.correctPairs as Record<string, unknown>).length === 0
        ) {
          return fail('matching validation requires non-empty "correctPairs" object.');
        }
        break;
    }
  }

  return ok();
}

/**
 * Full validation of a question's data shape.
 */
export function validateQuestion(
  responseType: string,
  promptBlocks: Json,
  validation: Json | null | undefined,
): ValidationResult {
  return merge(
    validateResponseType(responseType),
    validatePromptBlocks(responseType, promptBlocks),
    validateValidationJson(responseType, validation),
  );
}

// =============================================================================
// Block-level validators
// =============================================================================

function validateMcqBlock(
  block: Record<string, unknown>,
  index: number,
): ValidationResult {
  const prefix = `prompt_blocks[${index}].mcq`;

  if (!Array.isArray(block.options) || block.options.length < 2) {
    return fail(`${prefix}: requires at least 2 options.`);
  }

  for (let i = 0; i < (block.options as unknown[]).length; i++) {
    const opt = (block.options as Record<string, unknown>[])[i];
    if (!opt || typeof opt.id !== "string" || typeof opt.text !== "string") {
      return fail(`${prefix}.options[${i}]: requires "id" and "text" strings.`);
    }
  }

  if (typeof block.correctOptionId !== "string") {
    return fail(`${prefix}: requires "correctOptionId" string.`);
  }

  const optionIds = (block.options as Array<{ id: string }>).map((o) => o.id);
  if (!optionIds.includes(block.correctOptionId as string)) {
    return fail(`${prefix}: correctOptionId "${block.correctOptionId}" not found in options.`);
  }

  return ok();
}

function validateMultiSelectBlock(
  block: Record<string, unknown>,
  index: number,
): ValidationResult {
  const prefix = `prompt_blocks[${index}].multi_select`;

  if (!Array.isArray(block.options) || block.options.length < 2) {
    return fail(`${prefix}: requires at least 2 options.`);
  }

  if (!Array.isArray(block.correctOptionIds) || block.correctOptionIds.length === 0) {
    return fail(`${prefix}: requires non-empty "correctOptionIds" array.`);
  }

  const optionIds = new Set(
    (block.options as Array<{ id: string }>).map((o) => o.id),
  );
  for (const id of block.correctOptionIds as string[]) {
    if (!optionIds.has(id)) {
      return fail(`${prefix}: correctOptionIds contains "${id}" which is not in options.`);
    }
  }

  return ok();
}

function validateOrderingBlock(
  block: Record<string, unknown>,
  index: number,
): ValidationResult {
  const prefix = `prompt_blocks[${index}].ordering`;

  if (typeof block.instruction !== "string") {
    return fail(`${prefix}: requires "instruction" string.`);
  }

  if (!Array.isArray(block.items) || block.items.length < 2) {
    return fail(`${prefix}: requires at least 2 items.`);
  }

  return ok();
}

function validateMatchingBlock(
  block: Record<string, unknown>,
  index: number,
): ValidationResult {
  const prefix = `prompt_blocks[${index}].matching`;

  if (!Array.isArray(block.pairs) || block.pairs.length < 2) {
    return fail(`${prefix}: requires at least 2 pairs.`);
  }

  for (let i = 0; i < (block.pairs as unknown[]).length; i++) {
    const pair = (block.pairs as Record<string, unknown>[])[i];
    if (!pair || typeof pair.left !== "string" || typeof pair.right !== "string") {
      return fail(`${prefix}.pairs[${i}]: requires "left" and "right" strings.`);
    }
  }

  return ok();
}