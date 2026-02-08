import type { ReviewQuestionData } from "../hooks/useExamReview";

interface ReviewQuestionNavProps {
  questions: ReviewQuestionData[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Compact question navigator for the review page.
 * Shows numbered buttons with color-coded correctness.
 */
export function ReviewQuestionNav({
  questions,
  activeIndex,
  onSelect,
}: ReviewQuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        const isActive = i === activeIndex;
        const breakdown = q.breakdown;
        const isScored = breakdown !== null;
        const isCorrect = breakdown?.correct ?? false;
        const isManual = breakdown?.requires_manual_review ?? false;

        // Determine dot/ring styling
        let colorClass: string;
        if (!isScored) {
          colorClass = isActive
            ? "bg-primary-blue text-white"
            : "bg-background-soft text-text-muted hover:bg-border-subtle";
        } else if (isManual) {
          colorClass = isActive
            ? "bg-accent-amber text-white"
            : "bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20";
        } else if (isCorrect) {
          colorClass = isActive
            ? "bg-success-green text-white"
            : "bg-success-green/10 text-success-green hover:bg-success-green/20";
        } else {
          colorClass = isActive
            ? "bg-danger-red text-white"
            : "bg-danger-red/10 text-danger-red hover:bg-danger-red/20";
        }

        // Unanswered indicator
        const unanswered = q.response === null;

        return (
          <button
            key={q.question.id}
            type="button"
            onClick={() => onSelect(i)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${colorClass}`}
            aria-label={`Go to question ${q.question.sequence_number}`}
            aria-current={isActive ? "step" : undefined}
          >
            {q.question.sequence_number}
            {/* Small dot for unanswered */}
            {unanswered && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-amber" />
            )}
          </button>
        );
      })}
    </div>
  );
}
