import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExamReview } from "../../../features/exam/hooks/useExamReview";
import { AttemptSummaryPanel } from "../../../features/exam/components/AttemptSummaryPanel";
import { ReviewQuestionCard } from "../../../features/exam/components/ReviewQuestionCard";
import { ReviewQuestionNav } from "../../../features/exam/components/ReviewQuestionNav";

/**
 * /student/attempts/:attemptId/review
 *
 * Read-only review of a submitted exam attempt.
 * All data is fetched via useExamReview, which respects RLS.
 */
export function ExamReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { status, data, error, reload } = useExamReview(attemptId);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll to the active question when nav button is clicked
  useEffect(() => {
    const el = questionRefs.current.get(activeQuestionIndex);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeQuestionIndex]);

  // ── Loading state ──
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading review…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (status === "not-found") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary">
            Attempt Not Found
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {error ??
              "The attempt could not be found or you don't have access."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/student")}
            className="mt-4 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Not submitted yet ──
  if (status === "not-submitted") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary">
            Exam In Progress
          </p>
          <p className="mt-1 text-sm text-text-muted">
            This attempt hasn't been submitted yet. You can only review
            submitted exams.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/student/attempts/${attemptId}`)}
            className="mt-4 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Continue Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (status === "error" || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger-red">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {error ?? "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Ready ──
  const { questions } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/student")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary-blue hover:text-primary-blue-light"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to Dashboard
      </button>

      {/* Page title */}
      <h1 className="mb-5 text-xl font-bold text-text-primary">Exam Review</h1>

      {/* Summary panel */}
      <AttemptSummaryPanel data={data} />

      {/* Question navigation */}
      <div className="mt-5 rounded-lg border border-border-subtle bg-white p-4">
        <p className="mb-2 text-xs font-medium text-text-muted">Questions</p>
        <ReviewQuestionNav
          questions={questions}
          activeIndex={activeQuestionIndex}
          onSelect={setActiveQuestionIndex}
        />
      </div>

      {/* Question cards */}
      <div className="mt-5 space-y-4">
        {questions.map((q, i) => (
          <div
            key={q.question.id}
            ref={(el) => {
              if (el) questionRefs.current.set(i, el);
            }}
          >
            <ReviewQuestionCard data={q} />
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="mt-6 flex justify-center pb-8">
        <button
          type="button"
          onClick={() => navigate("/student")}
          className="rounded-md border border-border-subtle bg-white px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-background-soft"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
