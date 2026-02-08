/**
 * MindMosaic — Short Answer Question Component
 *
 * Single-line or short text input for brief answers.
 */

import { useId } from "react";
import type { ShortResponseData } from "../types/exam.types";

interface ShortAnswerQuestionProps {
  questionId: string;
  value: ShortResponseData | undefined;
  onChange: (data: ShortResponseData) => void;
  disabled?: boolean;
  /** Placeholder text. Default: "Type your answer here..." */
  placeholder?: string;
  /** Maximum character length */
  maxLength?: number;
}

export function ShortAnswerQuestion({
  questionId,
  value,
  onChange,
  disabled = false,
  placeholder = "Type your answer here...",
  maxLength = 500,
}: ShortAnswerQuestionProps) {
  const inputId = useId();
  const answer = value?.answer ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange({ answer: e.target.value });
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        Your answer
      </label>

      <input
        id={inputId}
        type="text"
        value={answer}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-describedby={`${inputId}-hint`}
        className={`
          w-full px-4 py-3 rounded-lg border-2 text-text-primary
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
          placeholder:text-text-muted
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
          ${answer ? "border-primary-blue" : "border-border-subtle"}
        `}
      />

      <div
        id={`${inputId}-hint`}
        className="flex justify-between text-xs text-text-muted"
      >
        <span>Enter a short answer</span>
        <span>
          {answer.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
