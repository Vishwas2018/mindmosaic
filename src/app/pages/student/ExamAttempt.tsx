/**
 * MindMosaic — Exam Attempt Page (Day 25)
 *
 * Enhancements over UI polish pass:
 * - <Card> wraps the question area
 * - animate-fade-in on question content (key-driven remount per question)
 * - focus-ring + touch-target on all navigation buttons
 * - aria-labels on Previous/Next/Submit buttons
 * - animate-shake on submit button when unanswered questions remain
 * - Save indicator uses animate-fade-in
 * - Submitted success screen uses animate-slide-up + <Card>
 * - Error/loading states use animate-fade-in
 *
 * No logic, routing, or data flow changes.
 */

import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExamAttempt } from "../../../features/exam/hooks/useExamAttempt";
import {
  QuestionRenderer,
  ExamTimer,
  CompactTimer,
  ExamProgress,
  CompactProgress,
  SubmitConfirmModal,
} from "../../../features/exam/components";
import type { ResponseData } from "../../../features/exam/types/exam.types";
import { Card } from "../../../components/ui/Card";
import { ProgressRing } from "../../../components/ui/ProgressRing";

export function ExamAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const {
    isLoading,
    error,
    attempt,
    examPackage,
    questions,
    responses,
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    answeredCount,
    goToQuestion,
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,
    setResponse,
    getResponse,
    isSaving,
    lastSavedAt,
    isSubmitting,
    submitAttempt,
    isSubmitted,
    startedAt,
    durationMinutes,
  } = useExamAttempt({ attemptId: attemptId || "" });

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [shakeSubmit, setShakeSubmit] = useState(false);

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitted && answeredCount > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitted, answeredCount]);

  const handleResponseChange = useCallback(
    (data: ResponseData) => {
      if (currentQuestion) {
        setResponse(currentQuestion.id, data);
      }
    },
    [currentQuestion, setResponse]
  );

  const handleSubmitClick = useCallback(() => {
    // Shake if there are unanswered questions as a gentle nudge
    if (answeredCount < totalQuestions) {
      setShakeSubmit(true);
      setTimeout(() => setShakeSubmit(false), 500);
    }
    setShowSubmitModal(true);
  }, [answeredCount, totalQuestions]);

  const handleSubmitConfirm = useCallback(async () => {
    const result = await submitAttempt();
    if (result.success) {
      setShowSubmitModal(false);
      setTimeout(() => {
        navigate(`/student/review/${attemptId}`);
      }, 1500);
    } else {
      console.error("Submit failed:", result.error);
    }
  }, [submitAttempt, navigate, attemptId]);

  // Loading
  if (isLoading) {
    return (
      <div className="animate-fade-in flex min-h-screen items-center justify-center bg-background-soft">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent" />
          <p className="text-lg text-text-muted">Getting your exam ready…</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !attempt || !examPackage || !questions.length) {
    return (
      <div className="animate-fade-in flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="max-w-md text-center">
          <p className="text-4xl" aria-hidden="true">😕</p>
          <h2 className="mt-4 text-xl font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            {error || "We couldn't load this exam. Please try again."}
          </p>
          <button
            onClick={() => navigate("/student/exams")}
            className="focus-ring touch-target mt-6 rounded-xl bg-primary-blue px-8 py-3 text-base font-medium text-white hover:bg-primary-blue-light"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  // Submitted success
  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="animate-slide-up max-w-md text-center">
          <ProgressRing
            value={answeredCount}
            max={totalQuestions}
            size="lg"
            showLabel
            labelFormat="fraction"
            color="success-green"
            aria-label={`You answered ${answeredCount} of ${totalQuestions} questions`}
          />
          <h2 className="mt-6 text-2xl font-bold text-text-primary">
            Great work! 🎉
          </h2>
          <p className="mt-2 text-lg leading-relaxed text-text-muted">
            Your exam has been submitted. You did your best and that's what
            counts.
          </p>
          <button
            onClick={() => navigate(`/student/review/${attemptId}`)}
            className="focus-ring touch-target mt-6 rounded-xl bg-primary-blue px-8 py-3.5 text-base font-medium text-white hover:bg-primary-blue-light"
            aria-label="See your answers and review this exam"
          >
            See Your Answers
          </button>
        </div>
      </div>
    );
  }

  const showTimer = examPackage.year_level >= 3;

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="max-w-[200px] truncate font-semibold text-text-primary sm:max-w-none">
                {examPackage.title}
              </h1>
              <CompactProgress
                currentIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                answeredCount={answeredCount}
              />
            </div>
            {showTimer && startedAt && (
              <CompactTimer
                startedAt={startedAt}
                durationMinutes={durationMinutes}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr,280px]">
          {/* Question area */}
          <div className="space-y-6">
            {/* Mobile timer */}
            {showTimer && startedAt && (
              <div className="lg:hidden">
                <ExamTimer
                  startedAt={startedAt}
                  durationMinutes={durationMinutes}
                  showWarnings={true}
                />
              </div>
            )}

            {/* Question card — key forces remount for fade-in per question */}
            <Card padding="normal" key={currentQuestion?.id || currentQuestionIndex}>
              <div className="animate-fade-in">
                {currentQuestion ? (
                  <>
                    <p className="mb-4 text-sm font-medium text-text-muted">
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                    </p>
                    <QuestionRenderer
                      question={currentQuestion}
                      questionNumber={currentQuestionIndex + 1}
                      totalQuestions={totalQuestions}
                      value={getResponse(currentQuestion.id)}
                      onChange={handleResponseChange}
                      disabled={false}
                    />
                  </>
                ) : (
                  <p className="text-text-muted">No question to display.</p>
                )}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={goToPrevious}
                disabled={!canGoPrevious}
                className="focus-ring touch-target rounded-xl border border-border-subtle bg-white px-6 py-3 text-sm font-medium text-text-primary hover:bg-background-soft disabled:opacity-40 disabled:hover:bg-white"
                aria-label="Go to previous question"
              >
                ← Previous
              </button>

              {currentQuestionIndex === totalQuestions - 1 ? (
                <button
                  onClick={handleSubmitClick}
                  className={`focus-ring touch-target rounded-xl bg-primary-blue px-6 py-3 text-sm font-medium text-white hover:bg-primary-blue-light ${
                    shakeSubmit ? "animate-shake" : ""
                  }`}
                  aria-label={`Submit exam. ${answeredCount} of ${totalQuestions} questions answered.`}
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  onClick={goToNext}
                  disabled={!canGoNext}
                  className="focus-ring touch-target rounded-xl bg-primary-blue px-6 py-3 text-sm font-medium text-white hover:bg-primary-blue-light disabled:opacity-40"
                  aria-label="Go to next question"
                >
                  Next →
                </button>
              )}
            </div>

            {/* Save indicator */}
            <div className="text-center text-sm text-text-muted" aria-live="polite">
              {isSaving ? (
                <span className="animate-pulse-soft">Saving your answer…</span>
              ) : lastSavedAt ? (
                <span className="animate-fade-in">✓ Saved</span>
              ) : null}
            </div>
          </div>

          {/* Sidebar: progress grid (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              {showTimer && startedAt && (
                <ExamTimer
                  startedAt={startedAt}
                  durationMinutes={durationMinutes}
                  showWarnings={true}
                />
              )}

              {/* Visual progress ring */}
              <Card padding="compact" className="flex flex-col items-center py-6">
                <ProgressRing
                  value={answeredCount}
                  max={totalQuestions}
                  size="lg"
                  showLabel
                  labelFormat="fraction"
                  color={
                    answeredCount === totalQuestions
                      ? "success-green"
                      : "primary-blue"
                  }
                  aria-label={`${answeredCount} of ${totalQuestions} questions answered`}
                />
                <p className="mt-3 text-sm text-text-muted">
                  {answeredCount === totalQuestions
                    ? "All questions answered!"
                    : `${totalQuestions - answeredCount} remaining`}
                </p>
              </Card>

              <ExamProgress
                totalQuestions={totalQuestions}
                responses={responses}
                currentIndex={currentQuestionIndex}
                questionIds={questions.map((q) => q.id)}
                onJumpTo={goToQuestion}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Submit confirmation modal */}
      <SubmitConfirmModal
        isOpen={showSubmitModal}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        isSubmitting={isSubmitting}
        onConfirm={handleSubmitConfirm}
        onCancel={() => setShowSubmitModal(false)}
      />
    </div>
  );
}
