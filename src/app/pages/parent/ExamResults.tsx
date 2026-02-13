/**
 * ParentExamResults — Detailed exam result view (read-only)
 *
 * Route: /parent/exams/:attemptId
 */

import { useParams, Link } from "react-router-dom";
import { useChildProfile } from "../../../features/parent/hooks/useChildProfile";
import { useParentExamDetail } from "../../../features/parent/hooks/useParentExamDetail";

export function ParentExamResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { child } = useChildProfile();
  const { status, result, error } = useParentExamDetail(
    child?.id || null,
    attemptId || null,
  );

  // ──────────────────────────────────────────────────
  // Loading State
  // ──────────────────────────────────────────────────
  if (status === "loading" || !child) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="text-center text-text-muted">Loading results...</div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Error State
  // ──────────────────────────────────────────────────
  if (status === "error" || !result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4">
          <Link
            to="/parent/dashboard"
            className="text-sm text-primary-blue hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
          {error || "Unable to load exam results"}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Main View
  // ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/parent/dashboard"
          className="mb-2 inline-block text-sm text-primary-blue hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-xl font-bold text-text-primary">
          {result.exam_title}
        </h1>
        <div className="mt-1 flex items-center gap-4 text-sm text-text-muted">
          <span>Year {result.year_level}</span>
          <span>{result.subject}</span>
          <span>
            Submitted {new Date(result.submitted_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6 rounded-lg border border-border-subtle bg-white p-6">
        <h2 className="mb-4 font-semibold text-text-primary">Overall Score</h2>
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold text-text-primary">
            {result.total_score}
          </div>
          <div className="text-xl text-text-muted">
            / {result.total_marks} marks
          </div>
          <div className="ml-4 rounded-full bg-primary-blue/10 px-3 py-1 text-lg font-semibold text-primary-blue">
            {result.percentage}%
          </div>
        </div>
      </div>

      {/* Question Breakdown */}
      <div className="rounded-lg border border-border-subtle bg-white p-6">
        <h2 className="mb-4 font-semibold text-text-primary">
          Question Breakdown
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          Individual question marks (question content not shown for privacy)
        </p>

        <div className="overflow-hidden rounded-md border border-border-subtle">
          <table className="w-full">
            <thead className="bg-background-soft">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">
                  Question
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">
                  Type
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Marks Available
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Marks Awarded
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {result.questions.map((q) => {
                const isCorrect =
                  q.marks_awarded !== null &&
                  q.marks_awarded === q.marks_available;
                const isPartial =
                  q.marks_awarded !== null &&
                  q.marks_awarded > 0 &&
                  q.marks_awarded < q.marks_available;

                return (
                  <tr
                    key={q.question_number}
                    className="hover:bg-background-soft"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      Q{q.question_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatResponseType(q.response_type)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-muted">
                      {q.marks_available}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-text-primary">
                      {q.marks_awarded ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isCorrect && (
                        <span className="inline-flex items-center rounded-full bg-success-green/10 px-2 py-0.5 text-xs font-medium text-success-green">
                          ✓ Correct
                        </span>
                      )}
                      {isPartial && (
                        <span className="inline-flex items-center rounded-full bg-warning-yellow/10 px-2 py-0.5 text-xs font-medium text-warning-yellow">
                          ◐ Partial
                        </span>
                      )}
                      {!isCorrect && !isPartial && q.marks_awarded === 0 && (
                        <span className="inline-flex items-center rounded-full bg-danger-red/10 px-2 py-0.5 text-xs font-medium text-danger-red">
                          ✗ Incorrect
                        </span>
                      )}
                      {q.marks_awarded === null && (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 rounded-md bg-primary-blue/5 p-4 text-sm text-text-muted">
        <span className="font-medium text-text-primary">Privacy Note:</span>{" "}
        Question content, student responses, and marking comments are not shown
        to protect exam integrity and student privacy.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────

function formatResponseType(type: string): string {
  const map: Record<string, string> = {
    mcq: "Multiple Choice",
    multi: "Multi-select",
    short: "Short Answer",
    extended: "Extended Response",
    numeric: "Numeric",
  };
  return map[type] || type;
}
