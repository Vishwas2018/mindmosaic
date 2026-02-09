/**
 * AdminExamListPage — Admin picks an exam to view its attempts.
 *
 * Route: /admin/exams
 *
 * This is the entry point to the Day 18 reporting flow.
 * Shows all exam packages (draft + published) with attempt counts.
 * Clicking a row navigates to /admin/exams/:id/attempts.
 */

import { useNavigate } from "react-router-dom";
import { useExamList } from "../../../features/reporting/hooks/useExamList";

export function AdminExamListPage() {
  const { status, exams, error, reload } = useExamList();
  const navigate = useNavigate();

  // ── Loading ──
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          <p className="text-sm text-text-muted">Loading exams…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger-red">
            Failed to load exams
          </p>
          <p className="mt-1 text-sm text-text-muted">{error}</p>
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
      <h1 className="mb-1 text-xl font-bold text-text-primary">Exam Reports</h1>
      <p className="mb-5 text-sm text-text-muted">
        Select an exam to view attempt details and performance summary.
      </p>

      {exams.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-white p-8 text-center">
          <p className="text-sm text-text-muted">No exam packages found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-background-soft">
                <th className="px-4 py-3 font-medium text-text-muted">Exam</th>
                <th className="px-4 py-3 font-medium text-text-muted">Year</th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Subject
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Attempts
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-background-soft/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">
                      {exam.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {exam.assessment_type.toUpperCase()} · {exam.total_marks}{" "}
                      marks
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {exam.year_level}
                  </td>
                  <td className="px-4 py-3 text-text-primary capitalize">
                    {exam.subject}
                  </td>
                  <td className="px-4 py-3">
                    {exam.status === "published" ? (
                      <span className="inline-flex items-center rounded-full bg-success-green/10 px-2.5 py-0.5 text-xs font-medium text-success-green">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-background-soft px-2.5 py-0.5 text-xs font-medium text-text-muted">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium ${
                        exam.attempt_count > 0
                          ? "text-text-primary"
                          : "text-text-muted"
                      }`}
                    >
                      {exam.attempt_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/admin/exams/${exam.id}/attempts`)
                      }
                      className="rounded-md bg-primary-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-blue-light"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
