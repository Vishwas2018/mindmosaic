/**
 * MindMosaic — Exam Attempt Page
 *
 * Main exam-taking interface.
 * Renders questions, handles responses, autosaves, and submission.
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
  ExamNavigation,
  SubmitConfirmModal,
} from "../../../features/exam/components";
import type { ResponseData } from "../../../features/exam/types/exam.types";

export function ExamAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  // Exam state
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

  // Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Warn before leaving if not submitted
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

  // Handle response changes
  const handleResponseChange = useCallback(
    (data: ResponseData) => {
      if (currentQuestion) {
        setResponse(currentQuestion.id, data);
      }
    },
    [currentQuestion, setResponse],
  );

  // Handle submit button click
  const handleSubmitClick = useCallback(() => {
    setShowSubmitModal(true);
  }, []);

  // Handle submit confirmation
  const handleSubmitConfirm = useCallback(async () => {
    const result = await submitAttempt();
    if (result.success) {
      setShowSubmitModal(false);
      // Redirect to review page after short delay
      setTimeout(() => {
        navigate(`/student/attempts/${attemptId}/review`);
      }, 1000);
    } else {
      // Keep modal open and show error
      console.error("Submit failed:", result.error);
    }
  }, [submitAttempt, navigate, attemptId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-blue border-t-transparent mx-auto" />
          <p className="text-text-muted">Loading exam...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !attempt || !examPackage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-danger-red mb-4">⚠️ {error || "Exam not found"}</p>
          <button
            onClick={() => navigate("/student/exams")}
            className="text-primary-blue hover:underline"
          >
            Back to exam list
          </button>
        </div>
      </div>
    );
  }

  // Already submitted - redirect to review
  if (isSubmitted && !showSubmitModal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-success-green text-lg mb-4">
            ✓ Exam submitted successfully!
          </p>
          <button
            onClick={() => navigate(`/student/attempts/${attemptId}/review`)}
            className="text-primary-blue hover:underline"
          >
            View your answers →
          </button>
        </div>
      </div>
    );
  }

  // Determine if timer should be shown (Years 3-9)
  const showTimer = examPackage.year_level >= 3;

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Header */}
      <header className="bg-white border-b border-border-subtle sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Exam info */}
            <div className="flex items-center gap-4">
              <h1 className="font-semibold text-text-primary truncate max-w-[200px] sm:max-w-none">
                {examPackage.title}
              </h1>
              <CompactProgress
                currentIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                answeredCount={answeredCount}
              />
            </div>

            {/* Right: Timer */}
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
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          {/* Question area */}
          <div className="space-y-6">
            {/* Timer (full version for mobile) */}
            {showTimer && startedAt && (
              <div className="lg:hidden">
                <ExamTimer
                  startedAt={startedAt}
                  durationMinutes={durationMinutes}
                  showWarnings={true}
                />
              </div>
            )}

            {/* Question card */}
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              {currentQuestion ? (
                <QuestionRenderer
                  question={currentQuestion}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={totalQuestions}
                  value={getResponse(currentQuestion.id)}
                  onChange={handleResponseChange}
                  disabled={isSubmitted}
                />
              ) : (
                <p className="text-text-muted">No questions available</p>
              )}
            </div>

            {/* Navigation */}
            <ExamNavigation
              currentIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onSubmit={handleSubmitClick}
              isSubmitting={isSubmitting}
              isSubmitted={isSubmitted}
              isSaving={isSaving}
              answeredCount={answeredCount}
            />
          </div>

          {/* Sidebar (progress grid) */}
          <aside className="hidden lg:block">
            <div className="bg-white rounded-xl border border-border-subtle p-4 sticky top-24">
              {/* Timer (desktop) */}
              {showTimer && startedAt && (
                <div className="mb-4 pb-4 border-b border-border-subtle">
                  <p className="text-xs text-text-muted mb-2">Time Remaining</p>
                  <ExamTimer
                    startedAt={startedAt}
                    durationMinutes={durationMinutes}
                    showWarnings={true}
                  />
                </div>
              )}

              {/* Progress */}
              <div>
                <p className="text-xs text-text-muted mb-3">Progress</p>
                <ExamProgress
                  currentIndex={currentQuestionIndex}
                  totalQuestions={totalQuestions}
                  responses={responses}
                  questionIds={questions.map((q) => q.id)}
                  onJumpTo={goToQuestion}
                  showGrid={true}
                />
              </div>

              {/* Save status */}
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs text-text-muted">
                  {isSaving ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin">⏳</span>
                      Saving...
                    </span>
                  ) : lastSavedAt ? (
                    <span className="flex items-center gap-1">
                      <span className="text-success-green">✓</span>
                      Last saved {formatTime(lastSavedAt)}
                    </span>
                  ) : (
                    "Changes will be saved automatically"
                  )}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Submit confirmation modal */}
      <SubmitConfirmModal
        isOpen={showSubmitModal}
        onConfirm={handleSubmitConfirm}
        onCancel={() => setShowSubmitModal(false)}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// =============================================================================
// Helper
// =============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
