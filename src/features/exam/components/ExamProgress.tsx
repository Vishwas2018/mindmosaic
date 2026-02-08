/**
 * MindMosaic — Exam Progress Component
 *
 * Shows progress through exam questions.
 * Displays answered vs total and allows jumping to specific questions.
 */

import type { ResponseData } from "../types/exam.types";

interface ExamProgressProps {
  currentIndex: number;
  totalQuestions: number;
  responses: Map<string, ResponseData>;
  questionIds: string[];
  onJumpTo: (index: number) => void;
  /** Whether to show the grid of question buttons */
  showGrid?: boolean;
}

export function ExamProgress({
  currentIndex,
  totalQuestions,
  responses,
  questionIds,
  onJumpTo,
  showGrid = true,
}: ExamProgressProps) {
  // Calculate answered count
  const answeredCount = questionIds.filter((id) => {
    const response = responses.get(id);
    return response && hasContent(response);
  }).length;

  const percentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">
            {answeredCount} of {totalQuestions} answered
          </span>
          <span className="text-text-muted font-medium">{percentage}%</span>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-blue transition-all duration-300"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
          />
        </div>
      </div>

      {/* Question grid */}
      {showGrid && (
        <div className="flex flex-wrap gap-2">
          {questionIds.map((id, index) => {
            const response = responses.get(id);
            const isAnswered = response && hasContent(response);
            const isCurrent = index === currentIndex;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onJumpTo(index)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${index + 1}${isAnswered ? " (answered)" : " (unanswered)"}`}
                className={`
                  w-10 h-10 rounded-lg text-sm font-medium
                  transition-all
                  focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
                  ${
                    isCurrent
                      ? "bg-primary-blue text-white ring-2 ring-primary-blue ring-offset-2"
                      : isAnswered
                        ? "bg-success-green/10 text-success-green border border-success-green"
                        : "bg-gray-100 text-text-muted hover:bg-gray-200"
                  }
                `}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Progress (for header)
// =============================================================================

interface CompactProgressProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export function CompactProgress({
  currentIndex,
  totalQuestions,
  answeredCount,
}: CompactProgressProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-muted">
        Q{currentIndex + 1}/{totalQuestions}
      </span>
      <span className="text-sm text-success-green">
        ✓ {answeredCount}
      </span>
    </div>
  );
}

// =============================================================================
// Helper
// =============================================================================

function hasContent(response: ResponseData): boolean {
  if ("selectedOptionId" in response) {
    return response.selectedOptionId !== "";
  }
  if ("selectedOptionIds" in response) {
    return response.selectedOptionIds.length > 0;
  }
  if ("answer" in response) {
    if (typeof response.answer === "string") {
      return response.answer.trim() !== "";
    }
    if (typeof response.answer === "number") {
      return !isNaN(response.answer);
    }
  }
  return false;
}
