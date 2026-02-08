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
import type {
  QuestionWithOptions,
  ResponseData,
  PromptBlock,
  McqResponseData,
  MultiSelectResponseData,
  ShortResponseData,
  NumericResponseData,
  ExtendedResponseData,
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

    case "short":
      return (
        <ShortAnswerQuestion
          questionId={question.id}
          value={value as ShortResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "numeric":
      return (
        <NumericQuestion
          questionId={question.id}
          value={value as NumericResponseData | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

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
          Unknown question type: {question.response_type}
        </p>
      );
  }
}
