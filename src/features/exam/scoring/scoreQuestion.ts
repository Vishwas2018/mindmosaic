/**
 * MindMosaic — Question Engine v1: Client-Side Scoring
 *
 * Deterministic scoring rules:
 *   - mcq: exact match (1 correct option)
 *   - multi_select: partial credit if partialCredit=true, otherwise all-or-nothing
 *   - short/cloze: case-insensitive match against acceptedAnswers (via validation)
 *   - numeric: exact match with optional tolerance (via validation)
 *   - boolean: exact match (via validation.correct)
 *   - ordering: all-or-nothing (exact order match)
 *   - matching: all-or-nothing (all pairs correct)
 *   - extended: always requires manual review (score = 0 pending)
 *
 * This runs client-side for instant feedback and preview.
 * Authoritative scoring happens server-side via edge function.
 */

import type {
  ResponseData,
  QuestionWithOptions,
  McqResponseData,
  MultiSelectResponseData,
  ShortResponseData,
  NumericResponseData,
  BooleanResponseData,
  OrderingResponseData,
  MatchingResponseData,
  PromptBlock,
  McqPromptBlock,
  MultiSelectPromptBlock,
  ShortValidation,
  NumericValidation,
  BooleanValidation,
  OrderingValidation,
  MatchingValidation,
} from "../types/exam.types";

export interface ScoreResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  requiresManualReview: boolean;
}

/**
 * Score a single question response against its answer key.
 */
export function scoreQuestion(
  question: QuestionWithOptions,
  response: ResponseData | undefined,
): ScoreResult {
  const maxScore = question.marks;

  // No response → 0
  if (!response) {
    return {
      score: 0,
      maxScore,
      isCorrect: false,
      requiresManualReview: false,
    };
  }

  switch (question.response_type) {
    case "mcq":
      return scoreMcq(question, response as McqResponseData, maxScore);

    case "multi_select":
    case "multi":
      return scoreMultiSelect(
        question,
        response as MultiSelectResponseData,
        maxScore,
      );

    case "short":
      return scoreShort(question, response as ShortResponseData, maxScore);

    case "numeric":
      return scoreNumeric(question, response as NumericResponseData, maxScore);

    case "boolean":
      return scoreBoolean(question, response as BooleanResponseData, maxScore);

    case "ordering":
      return scoreOrdering(
        question,
        response as OrderingResponseData,
        maxScore,
      );

    case "matching":
      return scoreMatching(
        question,
        response as MatchingResponseData,
        maxScore,
      );

    case "extended":
      // Always requires manual review
      return {
        score: 0,
        maxScore,
        isCorrect: false,
        requiresManualReview: true,
      };

    default:
      return {
        score: 0,
        maxScore,
        isCorrect: false,
        requiresManualReview: false,
      };
  }
}

// =============================================================================
// Individual scorers
// =============================================================================

function scoreMcq(
  question: QuestionWithOptions,
  response: McqResponseData,
  maxScore: number,
): ScoreResult {
  // Answer key is in the mcq prompt block
  const mcqBlock = question.prompt_blocks.find(
    (b): b is McqPromptBlock => b.type === "mcq",
  );

  if (!mcqBlock) {
    // Fall back to options-based scoring (legacy: correct option marked in DB)
    // If no answer key is available, can't auto-score
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  const isCorrect = response.selectedOptionId === mcqBlock.correctOptionId;
  return {
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    requiresManualReview: false,
  };
}

function scoreMultiSelect(
  question: QuestionWithOptions,
  response: MultiSelectResponseData,
  maxScore: number,
): ScoreResult {
  const msBlock = question.prompt_blocks.find(
    (b): b is MultiSelectPromptBlock => b.type === "multi_select",
  );

  if (!msBlock) {
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  const correctSet = new Set(msBlock.correctOptionIds);
  const selectedSet = new Set(response.selectedOptionIds);

  // All-or-nothing if partialCredit is false/undefined
  if (!msBlock.partialCredit) {
    const isExactMatch =
      correctSet.size === selectedSet.size &&
      [...correctSet].every((id) => selectedSet.has(id));

    return {
      score: isExactMatch ? maxScore : 0,
      maxScore,
      isCorrect: isExactMatch,
      requiresManualReview: false,
    };
  }

  // Partial credit: +1 for each correct selection, -1 for each wrong selection
  // Minimum score is 0
  const totalCorrect = msBlock.correctOptionIds.length;
  let earned = 0;

  for (const id of response.selectedOptionIds) {
    if (correctSet.has(id)) {
      earned++;
    } else {
      earned--; // penalty for wrong selections
    }
  }

  earned = Math.max(0, earned);
  const ratio = totalCorrect > 0 ? earned / totalCorrect : 0;
  const score = Math.round(ratio * maxScore * 100) / 100;
  const isCorrect = score === maxScore;

  return { score, maxScore, isCorrect, requiresManualReview: false };
}

function scoreShort(
  question: QuestionWithOptions,
  response: ShortResponseData,
  maxScore: number,
): ScoreResult {
  const validation = question.validation as ShortValidation | null | undefined;

  if (!validation?.acceptedAnswers || validation.acceptedAnswers.length === 0) {
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  const studentAnswer = response.answer.trim();
  const caseSensitive = validation.caseSensitive ?? false;

  const isCorrect = validation.acceptedAnswers.some((accepted) => {
    if (caseSensitive) {
      return studentAnswer === accepted.trim();
    }
    return studentAnswer.toLowerCase() === accepted.trim().toLowerCase();
  });

  return {
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    requiresManualReview: false,
  };
}

function scoreNumeric(
  question: QuestionWithOptions,
  response: NumericResponseData,
  maxScore: number,
): ScoreResult {
  const validation = question.validation as
    | NumericValidation
    | null
    | undefined;

  if (validation?.correct === undefined) {
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  const tolerance = validation.tolerance ?? 0;
  const diff = Math.abs(response.answer - validation.correct);
  const isCorrect = diff <= tolerance;

  return {
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    requiresManualReview: false,
  };
}

function scoreBoolean(
  question: QuestionWithOptions,
  response: BooleanResponseData,
  maxScore: number,
): ScoreResult {
  const validation = question.validation as
    | BooleanValidation
    | null
    | undefined;

  if (validation?.correct === undefined) {
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  const isCorrect = response.answer === validation.correct;

  return {
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    requiresManualReview: false,
  };
}

function scoreOrdering(
  question: QuestionWithOptions,
  response: OrderingResponseData,
  maxScore: number,
): ScoreResult {
  const validation = question.validation as
    | OrderingValidation
    | null
    | undefined;

  if (!validation?.correctOrder || validation.correctOrder.length === 0) {
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  // All-or-nothing: every position must match
  const isCorrect =
    response.orderedItems.length === validation.correctOrder.length &&
    response.orderedItems.every(
      (item, index) => item === validation.correctOrder[index],
    );

  return {
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    requiresManualReview: false,
  };
}

function scoreMatching(
  question: QuestionWithOptions,
  response: MatchingResponseData,
  maxScore: number,
): ScoreResult {
  const validation = question.validation as
    | MatchingValidation
    | null
    | undefined;

  if (
    !validation?.correctPairs ||
    Object.keys(validation.correctPairs).length === 0
  ) {
    return { score: 0, maxScore, isCorrect: false, requiresManualReview: true };
  }

  // All-or-nothing: every pair must match
  const correctEntries = Object.entries(validation.correctPairs);
  const isCorrect =
    Object.keys(response.pairs).length === correctEntries.length &&
    correctEntries.every(([left, right]) => response.pairs[left] === right);

  return {
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    requiresManualReview: false,
  };
}
