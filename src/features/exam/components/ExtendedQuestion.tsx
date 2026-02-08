/**
 * MindMosaic — Extended Question Component
 *
 * Multi-line text area for extended/essay responses.
 * Includes word count and character guidance.
 */

import { useId, useMemo } from "react";
import type { ExtendedResponseData } from "../types/exam.types";

interface ExtendedQuestionProps {
  questionId: string;
  value: ExtendedResponseData | undefined;
  onChange: (data: ExtendedResponseData) => void;
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum number of rows. Default: 6 */
  minRows?: number;
  /** Maximum character length. Default: 5000 */
  maxLength?: number;
  /** Suggested word count range. Optional */
  wordCountGuidance?: { min: number; max: number };
}

export function ExtendedQuestion({
  questionId,
  value,
  onChange,
  disabled = false,
  placeholder = "Type your response here...",
  minRows = 6,
  maxLength = 5000,
  wordCountGuidance,
}: ExtendedQuestionProps) {
  const textareaId = useId();
  const answer = value?.answer ?? "";

  // Calculate word count
  const wordCount = useMemo(() => {
    if (!answer.trim()) return 0;
    return answer.trim().split(/\s+/).length;
  }, [answer]);

  // Determine word count status
  const wordCountStatus = useMemo(() => {
    if (!wordCountGuidance) return null;

    if (wordCount < wordCountGuidance.min) {
      return "under";
    } else if (wordCount > wordCountGuidance.max) {
      return "over";
    } else {
      return "good";
    }
  }, [wordCount, wordCountGuidance]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    onChange({ answer: e.target.value });
  };

  return (
    <div className="space-y-2">
      <label htmlFor={textareaId} className="sr-only">
        Your extended response
      </label>

      <textarea
        id={textareaId}
        value={answer}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={minRows}
        aria-describedby={`${textareaId}-hint`}
        className={`
          w-full px-4 py-3 rounded-lg border-2 text-text-primary
          resize-y min-h-[150px] leading-relaxed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
          placeholder:text-text-muted
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
          ${answer ? "border-primary-blue" : "border-border-subtle"}
        `}
      />

      <div
        id={`${textareaId}-hint`}
        className="flex flex-wrap justify-between gap-2 text-xs"
      >
        {/* Word count */}
        <div className="flex items-center gap-2">
          <span
            className={`
              ${wordCountStatus === "under" ? "text-accent-amber" : ""}
              ${wordCountStatus === "over" ? "text-danger-red" : ""}
              ${wordCountStatus === "good" ? "text-success-green" : ""}
              ${!wordCountStatus ? "text-text-muted" : ""}
            `}
          >
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>

          {wordCountGuidance && (
            <span className="text-text-muted">
              (aim for {wordCountGuidance.min}–{wordCountGuidance.max} words)
            </span>
          )}
        </div>

        {/* Character count */}
        <span className="text-text-muted">
          {answer.length} / {maxLength} characters
        </span>
      </div>
    </div>
  );
}
