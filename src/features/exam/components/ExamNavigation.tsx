/**
 * MindMosaic — Exam Navigation Component
 *
 * Previous/Next navigation and Submit button.
 */

interface ExamNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isSaving: boolean;
  answeredCount: number;
}

export function ExamNavigation({
  currentIndex,
  totalQuestions,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting,
  isSubmitted,
  isSaving,
  answeredCount,
}: ExamNavigationProps) {
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const allAnswered = answeredCount === totalQuestions;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
      {/* Previous button */}
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious || isSubmitting || isSubmitted}
        className={`
          px-6 py-3 rounded-lg font-medium transition-all
          focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
          ${
            canGoPrevious && !isSubmitting && !isSubmitted
              ? "bg-gray-100 text-text-primary hover:bg-gray-200"
              : "bg-gray-50 text-text-muted cursor-not-allowed"
          }
        `}
      >
        ← Previous
      </button>

      {/* Center: Save status */}
      <div className="text-sm text-text-muted">
        {isSaving ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Saving...
          </span>
        ) : (
          <span className="text-success-green">✓ Saved</span>
        )}
      </div>

      {/* Next / Submit button */}
      <div className="flex items-center gap-3">
        {isLastQuestion ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || isSubmitted}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all
              focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
              ${
                isSubmitting
                  ? "bg-primary-blue/50 text-white cursor-wait"
                  : isSubmitted
                    ? "bg-success-green text-white cursor-not-allowed"
                    : "bg-primary-blue text-white hover:bg-primary-blue-light"
              }
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Submitting...
              </span>
            ) : isSubmitted ? (
              "Submitted ✓"
            ) : (
              "Submit Exam"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isSubmitting || isSubmitted}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all
              focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
              ${
                canGoNext && !isSubmitting && !isSubmitted
                  ? "bg-primary-blue text-white hover:bg-primary-blue-light"
                  : "bg-gray-50 text-text-muted cursor-not-allowed"
              }
            `}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Submit Confirmation Modal
// =============================================================================

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  answeredCount: number;
  totalQuestions: number;
  isSubmitting: boolean;
}

export function SubmitConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  answeredCount,
  totalQuestions,
  isSubmitting,
}: SubmitConfirmModalProps) {
  if (!isOpen) return null;

  const allAnswered = answeredCount === totalQuestions;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2
          id="submit-modal-title"
          className="text-xl font-semibold text-text-primary mb-4"
        >
          Submit Exam?
        </h2>

        {allAnswered ? (
          <p className="text-text-muted mb-6">
            You have answered all {totalQuestions} questions. Once submitted,
            you cannot change your answers.
          </p>
        ) : (
          <div className="mb-6">
            <p className="text-text-muted mb-2">
              You have answered {answeredCount} of {totalQuestions} questions.
            </p>
            <p className="text-accent-amber font-medium">
              ⚠️ {unansweredCount} question{unansweredCount > 1 ? "s" : ""}{" "}
              {unansweredCount > 1 ? "are" : "is"} unanswered.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-text-muted hover:bg-gray-100 transition-colors"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${
                isSubmitting
                  ? "bg-primary-blue/50 text-white cursor-wait"
                  : "bg-primary-blue text-white hover:bg-primary-blue-light"
              }
            `}
          >
            {isSubmitting ? "Submitting..." : "Yes, Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
