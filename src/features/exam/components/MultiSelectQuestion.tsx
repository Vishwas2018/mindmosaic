/**
 * MindMosaic — Multi-Select Question Component
 *
 * Multiple choice question allowing multiple selections.
 * Uses checkbox behavior instead of radio buttons.
 */

import type {
  ExamQuestionOption,
  MultiSelectResponseData,
} from "../types/exam.types";

interface MultiSelectQuestionProps {
  questionId: string;
  options: ExamQuestionOption[];
  value: MultiSelectResponseData | undefined;
  onChange: (data: MultiSelectResponseData) => void;
  disabled?: boolean;
}

export function MultiSelectQuestion({
  questionId,
  options,
  value,
  onChange,
  disabled = false,
}: MultiSelectQuestionProps) {
  const selectedOptionIds = value?.selectedOptionIds ?? [];

  const handleToggle = (optionId: string) => {
    if (disabled) return;

    const isCurrentlySelected = selectedOptionIds.includes(optionId);
    let newSelectedIds: string[];

    if (isCurrentlySelected) {
      // Remove from selection
      newSelectedIds = selectedOptionIds.filter((id) => id !== optionId);
    } else {
      // Add to selection
      newSelectedIds = [...selectedOptionIds, optionId];
    }

    onChange({ selectedOptionIds: newSelectedIds });
  };

  return (
    <div className="space-y-3" role="group" aria-labelledby={`question-${questionId}`}>
      <p className="text-sm text-text-muted mb-2">
        Select all that apply
      </p>

      {options.map((option) => {
        const isSelected = selectedOptionIds.includes(option.option_id);

        return (
          <button
            key={option.option_id}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => handleToggle(option.option_id)}
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
              {/* Checkbox indicator */}
              <span
                className={`
                  shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center
                  transition-colors mt-0.5
                  ${
                    isSelected
                      ? "border-primary-blue bg-primary-blue"
                      : "border-gray-300 bg-white"
                  }
                `}
              >
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>

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
