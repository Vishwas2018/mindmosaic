/**
 * MindMosaic — MCQ Question Component
 *
 * Multiple choice question with single selection.
 * Renders options A, B, C, D with radio button behavior.
 */

import type { ExamQuestionOption, McqResponseData } from "../types/exam.types";

interface McqQuestionProps {
  questionId: string;
  options: ExamQuestionOption[];
  value: McqResponseData | undefined;
  onChange: (data: McqResponseData) => void;
  disabled?: boolean;
}

export function McqQuestion({
  questionId,
  options,
  value,
  onChange,
  disabled = false,
}: McqQuestionProps) {
  const selectedOptionId = value?.selectedOptionId ?? "";

  const handleSelect = (optionId: string) => {
    if (disabled) return;
    onChange({ selectedOptionId: optionId });
  };

  return (
    <div className="space-y-3" role="radiogroup" aria-labelledby={`question-${questionId}`}>
      {options.map((option) => {
        const isSelected = selectedOptionId === option.option_id;

        return (
          <button
            key={option.option_id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => handleSelect(option.option_id)}
            className={`
              w-full text-left p-4 rounded-lg border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
              ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary-blue-light"}
              ${
                isSelected
                  ? "border-primary-blue bg-primary-blue/5"
                  : "border-border-subtle bg-white"
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Option letter badge */}
              <span
                className={`
                  shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  font-semibold text-sm transition-colors
                  ${
                    isSelected
                      ? "bg-primary-blue text-white"
                      : "bg-gray-100 text-text-muted"
                  }
                `}
              >
                {option.option_id}
              </span>

              {/* Option content */}
              <span className="text-text-primary pt-1">{option.content}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
