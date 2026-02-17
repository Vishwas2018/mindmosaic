/**
 * MindMosaic — Question Renderer
 *
 * Routes to appropriate question component based on response_type.
 * Combines prompt blocks with response input.
 */

import { PromptBlockRenderer } from "./PromptBlockRenderer";
import { McqQuestion } from "./McqQuestion";
import { MultiSelectQuestion } from "./MultiSelectQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";
import { ShortAnswerQuestion } from "./ShortAnswerQuestion";
import { NumericQuestion } from "./NumericQuestion";
import { ExtendedQuestion } from "./ExtendedQuestion";
import { BooleanQuestion } from "./BooleanQuestion";
import { OrderingQuestion } from "./OrderingQuestion";
import { MatchingQuestion } from "./MatchingQuestion";
import { ClozeQuestion } from "./ClozeQuestion";
import type {
  QuestionWithOptions,
  ResponseData,
  PromptBlock,
  McqResponseData,
  MultiSelectResponseData,
  ShortResponseData,
  NumericResponseData,
  ExtendedResponseData,
  BooleanResponseData,
  BooleanValidation,
  OrderingResponseData,
  OrderingPromptBlock,
  MatchingResponseData,
  MatchingPromptBlock,
} from "../types/exam.types";

interface QuestionRendererProps {
  question: QuestionWithOptions;
  questionNumber: number;
  totalQuestions: number;
  value: ResponseData | undefined;
  onChange: (data: ResponseData) => void;
  disabled?: boolean;
  showHint?: boolean;
}

export function QuestionRenderer({
  question,
  questionNumber,
  totalQuestions,
  value,
  onChange,
  disabled = false,
  showHint = false,
}: QuestionRendererProps) {
  const promptBlocks = question.prompt_blocks as PromptBlock[];

  return (
    <div className="space-y-6">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-muted">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="text-sm text-text-muted">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </span>
      </div>

      {/* Question prompt */}
      <div className="bg-white rounded-lg border border-border-subtle p-6">
        <PromptBlockRenderer blocks={promptBlocks} />
      </div>

      {/* Hint (optional) */}
      {showHint && question.hint && (
        <div className="bg-blue-50 border border-primary-blue-light rounded-lg p-4">
          <p className="text-sm text-primary-blue flex items-start gap-2">
            <span className="shrink-0">💡</span>
            <span>{question.hint}</span>
          </p>
        </div>
      )}

      {/* Response input */}
      <div className="pt-2">
        <ResponseInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Response Input Router
// =============================================================================

interface ResponseInputProps {
  question: QuestionWithOptions;
  value: ResponseData | undefined;
  onChange: (data: ResponseData) => void;
  disabled: boolean;
}

function ResponseInput({
  question,
  value,
  onChange,
  disabled,
}: ResponseInputProps) {
  switch (question.response_type) {
    case "mcq":
      // Check if this is a true/false question (only 2 options with True/False content)
      if (
        question.options?.length === 2 &&
        question.options.some((o) =>
          ["true", "false"].includes(o.content.toLowerCase())
        )
      ) {
        return (
          <TrueFalseQuestion
            questionId={question.id}
            value={value as McqResponseData | undefined}
            onChange={onChange}
            disabled={disabled}
          />
        );
      }

      // Regular MCQ
      if (!question.options || question.options.length === 0) {
        return (
          <p className="text-danger-red">
            Error: No options available for this question
          </p>
        );
      }

      return (
        <McqQuestion
          questionId={question.id}
          options={question.options}
          value={value as McqResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    // multi_select is the canonical type; "multi" is a legacy alias
    case "multi_select":
    case "multi":
      if (!question.options || question.options.length === 0) {
        return (
          <p className="text-danger-red">
            Error: No options available for this question
          </p>
        );
      }

      return (
        <MultiSelectQuestion
          questionId={question.id}
          options={question.options}
          value={value as MultiSelectResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "short": {
      // Detect cloze presentation: text prompt contains ___ blanks
      const textBlock = (question.prompt_blocks as PromptBlock[]).find(
        (b) => b.type === "text",
      );
      const hasBlanks =
        textBlock && "content" in textBlock && /___+/.test(textBlock.content);

      if (hasBlanks) {
        return (
          <ClozeQuestion
            questionId={question.id}
            text={textBlock.content}
            value={value as ShortResponseData | undefined}
            onChange={onChange}
            disabled={disabled}
          />
        );
      }

      return (
        <ShortAnswerQuestion
          questionId={question.id}
          value={value as ShortResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }

    case "numeric":
      return (
        <NumericQuestion
          questionId={question.id}
          value={value as NumericResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "boolean": {
      return (
        <BooleanQuestion
          questionId={question.id}
          value={value as BooleanResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
          validation={question.validation as BooleanValidation | null | undefined}
        />
      );
    }

    case "ordering": {
      const orderingBlock = (question.prompt_blocks as PromptBlock[]).find(
        (b): b is OrderingPromptBlock => b.type === "ordering",
      );
      const items = orderingBlock?.items ?? [];

      if (items.length === 0) {
        return (
          <p className="text-danger-red">
            Error: No items available for ordering question
          </p>
        );
      }

      return (
        <OrderingQuestion
          questionId={question.id}
          items={items}
          value={value as OrderingResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }

    case "matching": {
      const matchingBlock = (question.prompt_blocks as PromptBlock[]).find(
        (b): b is MatchingPromptBlock => b.type === "matching",
      );
      const pairs = matchingBlock?.pairs ?? [];

      if (pairs.length === 0) {
        return (
          <p className="text-danger-red">
            Error: No pairs available for matching question
          </p>
        );
      }

      const leftItems = pairs.map((p) => p.left);
      const rightItems = pairs.map((p) => p.right);

      return (
        <MatchingQuestion
          questionId={question.id}
          leftItems={leftItems}
          rightItems={rightItems}
          value={value as MatchingResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }

    // Legacy: extended is no longer a supported type but existing data should
    // render gracefully. Re-use ExtendedQuestion for backward compatibility.
    case "extended":
      return (
        <ExtendedQuestion
          questionId={question.id}
          value={value as ExtendedResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    default:
      return (
        <p className="text-danger-red">
          Unsupported question type: {question.response_type}
        </p>
      );
  }
}