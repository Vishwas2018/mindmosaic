/**
 * ExamAttemptsPage — Admin view of all attempts for a specific exam.
 *
 * Route: /admin/exams/:id/attempts
 *
 * Shows:
 *  - ExamSummaryPanel with aggregate stats
 *  - ExamAttemptsTable with sortable rows
 *  - Clicking a row navigates to the Day 17 AttemptMarkingPage
 */

import { useParams, useNavigate } from "react-router-dom";
import { useExamAttempts } from "../../../features/reporting/hooks/useExamAttempts";
import { ExamSummaryPanel } from "../../../features/reporting/components/ExamSummaryPanel";
import { ExamAttemptsTable } from "../../../features/reporting/components/ExamAttemptsTable";

export function ExamAttemptsPage() {
  const { id: packageId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { status, examPackage, attempts, summary, error, reload } =
    useExamAttempts(packageId);

  // ── Loading ──
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading exam data…</p>
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
            Exam Not Found
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {error ?? "The exam package could not be found."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/exams")}
            className="mt-4 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (status === "error" || !examPackage || !summary) {
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/admin/exams")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary-blue hover:text-primary-blue-light"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to Exams
      </button>

      {/* Page title */}
      <h1 className="mb-5 text-xl font-bold text-text-primary">
        Exam Attempts
      </h1>

      {/* Summary panel */}
      <ExamSummaryPanel examPackage={examPackage} summary={summary} />

      {/* Attempts table */}
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary">
            All Attempts ({attempts.length})
          </p>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
          >
            Refresh
          </button>
        </div>
        <ExamAttemptsTable
          attempts={attempts}
          onOpenAttempt={(attemptId) => navigate(`/admin/marking/${attemptId}`)}
        />
      </div>
    </div>
  );
}
