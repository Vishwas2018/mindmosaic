/**
 * ExamResultCard — Display single exam summary for parent
 */

import { Link } from "react-router-dom";
import type { ParentExamSummary } from "../types/parent-dashboard.types";

interface ExamResultCardProps {
  exam: ParentExamSummary;
}

export function ExamResultCard({ exam }: ExamResultCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary">{exam.exam_title}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-muted">
            <span>Year {exam.year_level}</span>
            <span>{exam.subject}</span>
            <span>{exam.duration_minutes} min</span>
            <span>{exam.total_marks} marks</span>
          </div>
        </div>
        <StatusBadge status={exam.status} />
      </div>

      {/* Results */}
      {exam.status === "submitted" && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          {exam.is_marked ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-muted">Score</div>
                <div className="text-lg font-semibold text-text-primary">
                  {exam.total_score} / {exam.total_marks}
                  <span className="ml-2 text-base font-normal text-text-muted">
                    ({exam.percentage}%)
                  </span>
                </div>
              </div>
              {exam.attempt_id && (
                <Link
                  to={`/parent/exams/${exam.attempt_id}`}
                  className="text-sm text-primary-blue hover:underline"
                >
                  View Details →
                </Link>
              )}
            </div>
          ) : (
            <div className="text-sm text-text-muted">
              Submitted {new Date(exam.submitted_at!).toLocaleDateString()} •
              Awaiting marking
            </div>
          )}
        </div>
      )}

      {exam.status === "in_progress" && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <div className="text-sm text-text-muted">Exam in progress</div>
        </div>
      )}

      {exam.status === "not_started" && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <div className="text-sm text-text-muted">Not yet started</div>
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
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
