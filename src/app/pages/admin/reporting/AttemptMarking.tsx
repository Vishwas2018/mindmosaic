/**
 * AttemptMarkingPage — Admin marks a single submitted attempt.
 *
 * Route: /admin/marking/:attemptId
 *
 * Displays:
 *  - Attempt metadata (exam, student, timing)
 *  - All questions with student responses + correct answers
 *  - Manual marking form for extended-response questions
 *  - Finalize button to auto-score objectives + apply manual marks
 *
 * Once finalized (status = "evaluated"), the page becomes read-only.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAttemptMarking } from "../../../../features/marking/hooks/useAttemptMarking";
import { MarkingQuestionCard } from "../../../../features/exam/components/MarkingQuestionCard";

export function AttemptMarkingPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const {
    status,
    data,
    error,
    reload,
    manualMarks,
    setManualMark,
    finalizeMarking,
    isFinalizing,
  } = useAttemptMarking(attemptId);

  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // ── Loading ──
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading attempt data…</p>
        </div>
      </div>
    );
  }

  // ── Not found / error ──
  if (status === "not-found" || status === "error" || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger-red">
            {status === "not-found" ? "Attempt Not Found" : "Error"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {error ?? "Could not load this attempt."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/marking")}
              className="rounded-md border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-soft"
            >
              Back to Queue
            </button>
            {status === "error" && (
              <button
                type="button"
                onClick={reload}
                className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { attempt, examPackage, questions, existingResult } = data;
  const isFinalized = attempt.status === "evaluated";

  // Count questions needing manual marking
  const manualQuestions = questions.filter(
    (q) => q.question.response_type === "extended",
  );
  const unmarkedManual = manualQuestions.filter(
    (q) => !manualMarks.has(q.question.id),
  );
  const allManualMarked = unmarkedManual.length === 0;

  // Handle finalize
  const handleFinalize = async () => {
    setFinalizeError(null);
    const result = await finalizeMarking();
    if (!result.success) {
      setFinalizeError(result.error ?? "Finalization failed.");
    }
    setShowFinalizeConfirm(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/admin/marking")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary-blue hover:text-primary-blue-light"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to Marking Queue
      </button>

      {/* Page title */}
      <h1 className="mb-1 text-xl font-bold text-text-primary">
        {isFinalized ? "Attempt Review" : "Mark Attempt"}
      </h1>

      {/* Attempt metadata panel */}
      <div className="mb-5 rounded-lg border border-border-subtle bg-white p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {examPackage.title}
          </h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Year {examPackage.year_level} · {examPackage.subject} ·{" "}
            {examPackage.assessment_type.toUpperCase()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaCard
            label="Student"
            value={attempt.student_id.slice(0, 8) + "…"}
          />
          <MetaCard label="Questions" value={String(questions.length)} />
          <MetaCard
            label="Submitted"
            value={
              attempt.submitted_at
                ? new Date(attempt.submitted_at).toLocaleString("en-AU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"
            }
          />
          <MetaCard
            label="Status"
            value={isFinalized ? "Evaluated" : "Needs Marking"}
            highlight={isFinalized ? "success" : "warning"}
          />
        </div>

        {/* Existing result summary (if scored) */}
        {existingResult && (
          <div className="mt-3 flex items-center gap-3 rounded-md bg-background-soft px-3 py-2">
            <span className="text-sm text-text-muted">Current score:</span>
            <span className="text-sm font-semibold text-text-primary">
              {existingResult.total_score} / {existingResult.max_score}
            </span>
            <span className="text-sm text-text-muted">
              ({Math.round(existingResult.percentage)}%)
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                existingResult.passed
                  ? "bg-success-green/10 text-success-green"
                  : "bg-danger-red/10 text-danger-red"
              }`}
            >
              {existingResult.passed ? "Passed" : "Not Passed"}
            </span>
          </div>
        )}
      </div>

      {/* Manual marking progress (only if there are extended questions) */}
      {manualQuestions.length > 0 && !isFinalized && (
        <div className="mb-5 rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-4">
          <p className="text-sm font-medium text-text-primary">
            {allManualMarked ? (
              <span className="text-success-green">
                All {manualQuestions.length} extended response
                {manualQuestions.length !== 1 ? "s" : ""} marked.
              </span>
            ) : (
              <>
                {unmarkedManual.length} of {manualQuestions.length} extended
                response{manualQuestions.length !== 1 ? "s" : ""} still need
                marking.
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Enter a score for each extended response below, then finalize.
          </p>
        </div>
      )}

      {/* Question cards */}
      <div className="space-y-4">
        {questions.map((q) => (
          <MarkingQuestionCard
            key={q.question.id}
            data={q}
            manualMark={manualMarks.get(q.question.id)}
            onManualMarkChange={(mark) => setManualMark(q.question.id, mark)}
            isFinalized={isFinalized}
          />
        ))}
      </div>

      {/* Finalize section */}
      {!isFinalized && (
        <div className="mt-6 rounded-lg border border-border-subtle bg-white p-5">
          {finalizeError && (
            <div className="mb-3 rounded-md bg-danger-red/10 px-3 py-2 text-sm text-danger-red">
              {finalizeError}
            </div>
          )}

          {!showFinalizeConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Ready to finalize?
                </p>
                <p className="text-xs text-text-muted">
                  This will auto-score objective questions, apply your manual
                  marks, and set the attempt to &quot;evaluated&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={!allManualMarked && manualQuestions.length > 0}
                className="rounded-md bg-primary-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                Finalize Marking
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm font-medium text-text-primary">
                Are you sure you want to finalize this attempt? This action sets
                the status to &quot;evaluated&quot;.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="rounded-md bg-primary-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light disabled:opacity-50"
                >
                  {isFinalizing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Finalizing…
                    </span>
                  ) : (
                    "Confirm Finalize"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinalizeConfirm(false)}
                  disabled={isFinalizing}
                  className="rounded-md border border-border-subtle bg-white px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-background-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finalized notice */}
      {isFinalized && (
        <div className="mt-6 rounded-lg border border-success-green/30 bg-success-green/5 p-4 text-center">
          <p className="text-sm font-medium text-success-green">
            This attempt has been finalized and evaluated.
          </p>
          {attempt.evaluated_at && (
            <p className="mt-0.5 text-xs text-text-muted">
              Evaluated{" "}
              {new Date(attempt.evaluated_at).toLocaleString("en-AU", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <div className="mt-6 flex justify-center pb-8">
        <button
          type="button"
          onClick={() => navigate("/admin/marking")}
          className="rounded-md border border-border-subtle bg-white px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-background-soft"
        >
          Return to Marking Queue
        </button>
      </div>
    </div>
  );
}

// ── Small metadata card ──

function MetaCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "warning";
}) {
  const valueColor =
    highlight === "success"
      ? "text-success-green"
      : highlight === "warning"
        ? "text-accent-amber"
        : "text-text-primary";

  return (
    <div className="rounded-md bg-background-soft px-3 py-2.5">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
