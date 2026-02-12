/**
 * ParentProgressOverview — Progress summary with subject breakdown
 *
 * Route: /parent/progress
 */

import { Link } from "react-router-dom";
import { useChildProfile } from "../../features/parent/hooks/useChildProfile";
import { useParentExamResults } from "../../features/parent/hooks/useParentExamResults";
import { useParentProgress } from "../../features/parent/hooks/useParentProgress";
import { ProgressTable } from "../../features/parent/components/ProgressTable";

export function ParentProgressOverview() {
  const { child } = useChildProfile();
  const { status, exams, error } = useParentExamResults(child?.id || null);
  const progress = useParentProgress(exams);

  // ──────────────────────────────────────────────────
  // Loading State
  // ──────────────────────────────────────────────────
  if (status === "loading" || !child) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="text-center text-text-muted">Loading progress...</div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Error State
  // ──────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4">
          <Link
            to="/parent/dashboard"
            className="text-sm text-primary-blue hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="rounded-md bg-danger-red/10 px-4 py-3 text-sm text-danger-red">
          {error || "Failed to load progress data"}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // Main View
  // ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/parent/dashboard"
          className="mb-2 inline-block text-sm text-primary-blue hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-xl font-bold text-text-primary">
          Progress Overview
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {child.full_name}'s exam performance summary
        </p>
      </div>

      {/* Progress Table */}
      {exams.length > 0 ? (
        <ProgressTable summary={progress} />
      ) : (
        <div className="rounded-lg border border-border-subtle bg-background-soft p-6 text-center text-text-muted">
          No exam data available yet
        </div>
      )}

      {/* Exam List */}
      {exams.length > 0 && (
        <div className="mt-6 rounded-lg border border-border-subtle bg-white p-6">
          <h2 className="mb-4 font-semibold text-text-primary">All Exams</h2>
          <div className="overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full">
              <thead className="bg-background-soft">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">
                    Exam
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">
                    Subject
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Status
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Score
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {exams.map((exam) => (
                  <tr key={exam.exam_id} className="hover:bg-background-soft">
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {exam.exam_title}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {exam.subject}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={exam.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-primary">
                      {exam.is_marked
                        ? `${exam.total_score}/${exam.total_marks} (${exam.percentage}%)`
                        : exam.status === "submitted"
                          ? "Pending"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-muted">
                      {exam.submitted_at
                        ? new Date(exam.submitted_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Status Badge
// ────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: "not_started" | "in_progress" | "submitted";
}) {
  const styles = {
    not_started: "bg-gray-100 text-gray-700",
    in_progress: "bg-primary-blue/10 text-primary-blue",
    submitted: "bg-success-green/10 text-success-green",
  };

  const labels = {
    not_started: "Not Started",
    in_progress: "In Progress",
    submitted: "Submitted",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
