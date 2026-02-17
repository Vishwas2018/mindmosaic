/**
 * MindMosaic — Boolean (True/False) Question Component
 *
 * Standalone boolean question with optional explanation field.
 * response_type: "boolean"
 * Uses BooleanResponseData { answer: boolean; explanation?: string }
 *
 * Unlike the legacy TrueFalseQuestion (which piggybacks on MCQ options),
 * this is driven by the validation.correct field.
 */

import { useId } from "react";
import type {
  BooleanResponseData,
  BooleanValidation,
} from "../types/exam.types";

interface BooleanQuestionProps {
  questionId: string;
  value: BooleanResponseData | undefined;
  onChange: (data: BooleanResponseData) => void;
  disabled?: boolean;
  validation?: BooleanValidation | null;
}

export function BooleanQuestion({
  questionId,
  value,
  onChange,
  disabled = false,
  validation,
}: BooleanQuestionProps) {
  const explanationId = useId();
  const hasSelection = value !== undefined;
  const requireExplanation = validation?.requireExplanation ?? false;

  const handleSelect = (answer: boolean) => {
    if (disabled) return;
    onChange({ answer, explanation: value?.explanation });
  };

  const handleExplanationChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (disabled || value === undefined) return;
    onChange({ answer: value.answer, explanation: e.target.value });
  };

  const options = [
    { answer: true, label: "True" },
    { answer: false, label: "False" },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex gap-4"
        role="radiogroup"
        aria-labelledby={`question-${questionId}`}
      >
        {options.map((option) => {
          const isSelected = hasSelection && value.answer === option.answer;

          return (
            <button
              key={String(option.answer)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => handleSelect(option.answer)}
              className={`
                flex-1 py-4 px-6 rounded-lg border-2 transition-all
                font-medium text-center touch-target focus-ring
                ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary-blue-light"}
                ${
                  isSelected
                    ? "border-primary-blue bg-primary-blue text-white"
                    : "border-border-subtle bg-white text-text-primary"
                }
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {requireExplanation && hasSelection && (
        <div className="space-y-2">
          <label
            htmlFor={explanationId}
            className="block text-sm font-medium text-text-muted"
          >
            Explain your answer
          </label>
          <textarea
            id={explanationId}
            value={value.explanation ?? ""}
            onChange={handleExplanationChange}
            disabled={disabled}
            placeholder="Why did you choose this answer?"
            rows={3}
            className={`
              w-full px-4 py-3 rounded-lg border-2 text-text-primary
              transition-colors resize-none
              focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
              placeholder:text-text-muted
              ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
              ${value.explanation ? "border-primary-blue" : "border-border-subtle"}
            `}
          />
        </div>
      )}
    </div>
  );
}
