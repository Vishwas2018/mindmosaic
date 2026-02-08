/**
 * MindMosaic — True/False Question Component
 *
 * Simplified MCQ with True/False options.
 * Uses the same response data structure as MCQ (selectedOptionId: "A" or "B")
 */

import type { McqResponseData } from "../types/exam.types";

interface TrueFalseQuestionProps {
  questionId: string;
  value: McqResponseData | undefined;
  onChange: (data: McqResponseData) => void;
  disabled?: boolean;
  /** Custom labels for the options. Defaults to "True" and "False" */
  labels?: { true: string; false: string };
}

export function TrueFalseQuestion({
  questionId,
  value,
  onChange,
  disabled = false,
  labels = { true: "True", false: "False" },
}: TrueFalseQuestionProps) {
  // Map to option IDs: A = True, B = False
  const selectedOptionId = value?.selectedOptionId ?? "";

  const handleSelect = (optionId: "A" | "B") => {
    if (disabled) return;
    onChange({ selectedOptionId: optionId });
  };

  const options = [
    { id: "A" as const, label: labels.true },
    { id: "B" as const, label: labels.false },
  ];

  return (
    <div
      className="flex gap-4"
      role="radiogroup"
      aria-labelledby={`question-${questionId}`}
    >
      {options.map((option) => {
        const isSelected = selectedOptionId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => handleSelect(option.id)}
            className={`
              flex-1 py-4 px-6 rounded-lg border-2 transition-all
              font-medium text-center
              focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
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
  );
}
