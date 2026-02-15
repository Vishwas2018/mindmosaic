/**
 * MindMosaic — Exam Review Page (Day 25)
 *
 * Enhancements over UI polish pass:
 * - <ProgressRing> for score display (replaces raw text)
 * - <Avatar> in header alongside exam title
 * - <FloatingShapes> behind score banner
 * - <Card variant="highlighted"> for score result area
 * - Question list uses stagger-children + animate-slide-up
 * - focus-ring + touch-target on all buttons
 * - aria-labels on Back/Continue/Try Another buttons
 * - animate-fade-in on page load and state screens
 * - Color-coded score ring (green=passed, amber=keep trying)
 *
 * No logic, routing, or data flow changes.
 */

import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useExamReview } from "../../../features/exam/hooks/useExamReview";
import { AttemptSummaryPanel } from "../../../features/exam/components/AttemptSummaryPanel";
import { ReviewQuestionCard } from "../../../features/exam/components/ReviewQuestionCard";
import { ReviewQuestionNav } from "../../../features/exam/components/ReviewQuestionNav";
import { Card } from "../../../components/ui/Card";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { Avatar } from "../../../components/ui/Avatar";
import { FloatingShapes } from "../../../components/ui/FloatingShapes";
import { useAuth } from "../../../context/useAuth";

export function ExamReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const {
    isLoading,
    error,
    attempt,
    examPackage,
    questions,
    responses,
    result,
    breakdown,
  } = useExamReview(attemptId || "");

  // Scroll to question when nav clicked
  useEffect(() => {
    const el = questionRefs.current.get(activeQuestionIndex);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeQuestionIndex]);

  // Loading
  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
          <p className="text-lg text-text-muted">Loading your results…</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!attempt || !examPackage) {
    return (
      <div className="animate-fade-in mx-auto max-w-md py-20 text-center">
        <p className="text-4xl" aria-hidden="true">
          🔍
        </p>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          Review not found
        </h2>
        <p className="mt-2 text-base leading-relaxed text-text-muted">
          {error ||
            "We couldn't find this exam review. It may not exist or you might not have access."}
        </p>
        <button
          onClick={() => navigate("/student/exams")}
          className="focus-ring touch-target mt-6 rounded-xl bg-primary-blue px-8 py-3 text-base font-medium text-white hover:bg-primary-blue-light"
          aria-label="Go back to exam list"
        >
          Back to Exams
        </button>
      </div>
    );
  }

  // Not submitted yet
  if (attempt.status === "in_progress") {
    return (
      <div className="animate-fade-in mx-auto max-w-md py-20 text-center">
        <p className="text-4xl" aria-hidden="true">
          ⏳
        </p>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          Exam still in progress
        </h2>
        <p className="mt-2 text-base leading-relaxed text-text-muted">
          You need to submit this exam before you can review it.
        </p>
        <button
          onClick={() => navigate(`/student/attempts/${attemptId}`)}
          className="focus-ring touch-target mt-6 rounded-xl bg-primary-blue px-8 py-3 text-base font-medium text-white hover:bg-primary-blue-light"
          aria-label="Continue your exam"
        >
          Continue Exam
        </button>
      </div>
    );
  }

  const scoreColor = result?.passed ? "success-green" : "accent-amber";

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <button
          onClick={() => navigate("/student/exams")}
          className="focus-ring mb-4 text-sm font-medium text-primary-blue hover:underline"
          aria-label="Back to exam list"
        >
          ← Back to Exams
        </button>
        <div className="flex items-center gap-4">
          <Avatar name={user?.email || ""} size="md" />
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              {examPackage.title}
            </h1>
            <p className="mt-1 text-base text-text-muted">
              Submitted{" "}
              {attempt.submitted_at
                ? new Date(attempt.submitted_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
              {" · "}
              {questions.length} questions
            </p>
          </div>
        </div>
      </header>

      {/* Score result with ProgressRing */}
      {result && (
        <div className="relative mb-8 overflow-hidden rounded-2xl">
          <FloatingShapes variant={result.passed ? "cool" : "warm"} />
          <div
            className={`relative z-10 p-8 ${
              result.passed ? "bg-success-green/5" : "bg-accent-amber/5"
            }`}
          >
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={result.total_score}
                  max={result.max_score}
                  size="lg"
                  showLabel
                  labelFormat="percentage"
                  color={scoreColor}
                  aria-label={`Score: ${result.total_score} out of ${result.max_score}, ${result.percentage} percent`}
                />
                <div>
                  <p className="text-base text-text-muted">Your Score</p>
                  <p
                    className={`mt-1 text-3xl font-bold ${
                      result.passed ? "text-success-green" : "text-accent-amber"
                    }`}
                  >
                    {result.total_score} / {result.max_score}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <span
                  className={`inline-block rounded-2xl px-5 py-2.5 text-lg font-semibold text-white ${
                    result.passed ? "bg-success-green" : "bg-accent-amber"
                  }`}
                >
                  {result.passed ? "Well done! ⭐" : "Keep practising!"}
                </span>
                {!result.passed && (
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    Every practice makes you stronger. You'll get there!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending evaluation */}
      {attempt.status === "submitted" && !result && (
        <Card
          padding="normal"
          className="mb-8 border-l-4 border-l-primary-blue bg-primary-blue/5"
        >
          <p className="text-lg font-medium text-primary-blue">
            ⏳ Your exam is being reviewed
          </p>
          <p className="mt-1 text-base leading-relaxed text-text-muted">
            Your answers have been submitted. Check back soon for your results.
          </p>
        </Card>
      )}

      {/* Summary panel */}
      {result && (
        <div className="animate-slide-up mb-8">
          <AttemptSummaryPanel
            attempt={attempt}
            result={result}
            totalQuestions={questions.length}
          />
        </div>
      )}

      {/* Question navigation */}
      {questions.length > 0 && breakdown && (
        <div className="mb-8">
          <ReviewQuestionNav
            questions={questions}
            breakdown={breakdown}
            activeIndex={activeQuestionIndex}
            onSelect={setActiveQuestionIndex}
          />
        </div>
      )}

      {/* Questions */}
      <div className="stagger-children space-y-8">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="animate-slide-up"
            ref={(el) => {
              if (el) questionRefs.current.set(index, el);
            }}
          >
            <ReviewQuestionCard
              question={question}
              questionNumber={index + 1}
              response={responses.get(question.id)}
              breakdown={breakdown?.get(question.id)}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-border-subtle pt-8 text-center">
        <p className="mb-4 text-base leading-relaxed text-text-muted">
          Want to keep practising? Every attempt helps you improve.
        </p>
        <Link
          to="/student/exams"
          className="focus-ring touch-target inline-block rounded-xl bg-primary-blue px-8 py-3.5 text-base font-medium text-white hover:bg-primary-blue-light"
          aria-label="Try another exam"
        >
          Try Another Exam
        </Link>
      </footer>
    </div>
  );
}
