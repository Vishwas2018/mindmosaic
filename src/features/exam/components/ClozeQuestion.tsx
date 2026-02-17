/**
 * MindMosaic — Cloze (Fill-in-the-Blank) Question Component
 *
 * response_type: "cloze"
 * Renders text with ___ blanks replaced by inline input fields.
 * Internally uses ShortResponseData for single-blank cloze.
 *
 * The prompt_blocks contain text with "___" markers.
 * validation: { acceptedAnswers: [...], caseSensitive: false }
 */

import { useId } from "react";
import type { ShortResponseData } from "../types/exam.types";

interface ClozeQuestionProps {
  questionId: string;
  /** The text containing ___ blank markers */
  text: string;
  value: ShortResponseData | undefined;
  onChange: (data: ShortResponseData) => void;
  disabled?: boolean;
}

export function ClozeQuestion({
  questionId,
  text,
  value,
  onChange,
  disabled = false,
}: ClozeQuestionProps) {
  const inputId = useId();
  const answer = value?.answer ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange({ answer: e.target.value });
  };

  // Split text around the blank marker(s)
  const parts = text.split(/___+/);

  if (parts.length <= 1) {
    // No blanks found — fall back to a standard text input
    return (
      <div className="space-y-3">
        <p className="text-text-primary leading-relaxed">{text}</p>
        <input
          id={inputId}
          type="text"
          value={answer}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Type your answer…"
          aria-label="Your answer"
          className={`
            w-full px-4 py-3 rounded-lg border-2 text-text-primary
            transition-colors focus-ring
            placeholder:text-text-muted
            ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
            ${answer ? "border-primary-blue" : "border-border-subtle"}
          `}
        />
      </div>
    );
  }

  // Render inline blank(s)
  return (
    <div
      className="leading-relaxed text-text-primary text-base"
      aria-labelledby={`question-${questionId}`}
    >
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && (
            <input
              type="text"
              value={answer}
              onChange={handleChange}
              disabled={disabled}
              placeholder="…"
              aria-label={`Blank ${index + 1}`}
              className={`
                inline-block w-32 sm:w-40 mx-1 px-3 py-1.5 rounded-md border-2
                text-center text-text-primary font-medium
                transition-colors focus-ring
                placeholder:text-text-muted
                ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
                ${answer ? "border-primary-blue" : "border-border-subtle"}
              `}
            />
          )}
        </span>
      ))}
    </div>
  );
}
